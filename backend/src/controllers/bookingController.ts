import express from "express";
import { TEMP_HOLD_DURATION_MINUTES } from "../utils/constants";
import prisma from "../prisma";
import dotenv from "dotenv";
import { calculateNights, handleError, responseHandler } from "../utils/helper";
import { stripe } from "../config/stripe";
import Stripe from "stripe";

dotenv.config();
const devUrl = "https://localhost:5173";
const prodUrl = process.env.FRONTEND_PROD_URL;

export const createCheckoutSession = async (req: express.Request, res: express.Response) => {
  const { 
    bookingItems, 
    customerDetails, 
    taxAmount, 
    totalAmount,
    voucherCode,
    voucherDiscount,
    originalAmount,
    voucherProducts
  } = req.body;

  try {
    // Existing room availability checks
    for (const booking of bookingItems) {
      const { checkIn, checkOut, selectedRoom: roomId } = booking;

      const overlappingBookings = await prisma.booking.findFirst({
        where: {
          roomId,
          OR: [
            {
              checkIn: { lte: new Date(checkOut) },
              checkOut: { gte: new Date(checkIn) },
              status: "CONFIRMED"
            }
          ]
        }
      });

      if (overlappingBookings) {
        responseHandler(res, 400, `${booking.roomDetails.name} is not available for these dates`);
        return;
      }

      const overlappingHold = await prisma.temporaryHold.findFirst({
        where: {
          roomId,
          expiresAt: { gt: new Date() },
          OR: [
            {
              checkIn: { lte: new Date(checkOut) },
              checkOut: { gte: new Date(checkIn) }
            }
          ]
        }
      });

      if (overlappingHold) {
       responseHandler(res, 400, `${booking.roomDetails.name} is temporarily held`);
       return;
      }
    }

    const expiresAt = new Date(Date.now() + TEMP_HOLD_DURATION_MINUTES * 60 * 1000);
    
    // Create payment intent with voucher information
    const pendingBooking = await prisma.paymentIntent.create({
      data: {
        amount: originalAmount,
        bookingData: JSON.stringify(bookingItems),
        customerData: JSON.stringify({
          ...customerDetails,
          receiveMarketing: customerDetails.receiveMarketing || false,
        }),
        taxAmount,
        totalAmount,
        status: "PENDING",
        createdByAdmin: false,
        adminUserId: null,
        adminNotes: null,
        voucherCode: voucherCode || null,
        voucherDiscount: voucherDiscount || null,
      }
    });

    // Get voucher details if voucher code is provided
    let voucherDetails = null;
    if (voucherCode) {
      voucherDetails = await prisma.voucher.findUnique({
        where: { code: voucherCode },
        include: {
          products: true
        }
      });

      if (voucherDetails) {
        await prisma.voucherUsage.create({
          data: {
            voucherId: voucherDetails.id,
            paymentIntentId: pendingBooking.id,
            usedBy: customerDetails.email,
            discountAmount: voucherDiscount || 0,
            originalAmount: originalAmount || totalAmount,
            finalAmount: totalAmount,
            productsReceived: voucherProducts ? JSON.stringify(voucherProducts) : undefined,
            status: "APPLIED"
          }
        });
      }
    }

    await prisma.temporaryHold.createMany({
      data: bookingItems.map((booking: any) => ({
        checkIn: new Date(booking.checkIn),
        checkOut: new Date(booking.checkOut),
        roomId: booking.selectedRoom,
        expiresAt,
        paymentIntentId: pendingBooking.id
      }))
    });

    const line_items = bookingItems.flatMap((booking: any) => {
      const numberOfNights = calculateNights(booking.checkIn, booking.checkOut);
      
      const roomRatePerNight = booking.selectedRateOption?.price || booking.roomDetails.price;
      const totalRoomPrice = roomRatePerNight * numberOfNights;
      
      const roomLineItem = {
        price_data: {
          currency: "eur",
          product_data: {
            name: `${booking.roomDetails.name} - ${numberOfNights} night${numberOfNights > 1 ? 's' : ''}`,
            description: `€${roomRatePerNight} per night × ${numberOfNights} night${numberOfNights > 1 ? 's' : ''} | Rate: ${booking.selectedRateOption?.name || 'Standard Rate'} | Taxes included`,
            images:
            booking.roomDetails.images?.length > 0
            ? booking.roomDetails.images.map((image: any) =>
            encodeURI(image.url.trim())
            )
            : ["https://www.shutterstock.com/search/no-picture-available"],
          },
          unit_amount: Math.round(totalRoomPrice * 100), // Total price for all nights
        },
        quantity: booking.rooms, // Number of rooms booked
      };
      
      const enhancementLineItems = booking.selectedEnhancements?.map((enhancement: any) => {
        let enhancementQuantity = 1;
        
        if (enhancement.pricingType === "PER_GUEST") {
          enhancementQuantity = booking.adults * booking.rooms;
        } else if (enhancement.pricingType === "PER_ROOM") {
          enhancementQuantity = booking.rooms;
        } else if (enhancement.pricingType === "PER_NIGHT") {
          enhancementQuantity = numberOfNights * booking.rooms;
        } else if (enhancement.pricingType === "PER_GUEST_PER_NIGHT") {
          enhancementQuantity = booking.adults * booking.rooms * numberOfNights;
        } else {
          enhancementQuantity = 1;
        }

        return {
          price_data: {
            currency: "eur",
            product_data: {
              name: enhancement.title,
              description: `€${enhancement.price} ${enhancement.pricingType === "PER_GUEST" ? "per guest" : enhancement.pricingType === "PER_ROOM" ? "per room" : enhancement.pricingType === "PER_NIGHT" ? "per night" : enhancement.pricingType === "PER_GUEST_PER_NIGHT" ? "per guest per night" : "per booking"} | ${enhancement.description} | Taxes included`,
              images: enhancement.image ? [enhancement.image] : undefined,
            },
            unit_amount: Math.round(enhancement.price * 100),
          },
          quantity: enhancementQuantity,
        };
      }) || [];

      return [roomLineItem, ...enhancementLineItems];
    });

    // Add voucher products as free line items if any
    if (voucherProducts && voucherProducts.length > 0) {
      const voucherLineItems = voucherProducts.map((product: any) => ({
        price_data: {
          currency: "eur",
          product_data: {
            name: `${product.name} (Voucher Bonus)`,
            description: `Complimentary ${product.name} - ${product.description || 'Voucher benefit'}`,
            images: product.imageUrl ? [product.imageUrl] : undefined,
          },
          unit_amount: 0, // Free items
        },
        quantity: 1,
      }));
      line_items.push(...voucherLineItems);
    }

    // Create session configuration
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      metadata: {
        pendingBookingId: pendingBooking.id,
        customerEmail: customerDetails.email,
        taxAmount: taxAmount.toString(),
        totalAmount: totalAmount.toString(),
        ...(voucherCode && { voucherCode }),
        ...(voucherDiscount && { voucherDiscount: voucherDiscount.toString() }),
        ...(originalAmount && { originalAmount: originalAmount.toString() }),
      },
      expires_at: Math.floor((Date.now() + 30 * 60 * 1000) / 1000), // 30 minutes from now
      success_url: `${process.env.NODE_ENV === "local" ? devUrl : prodUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NODE_ENV === "local" ? devUrl : prodUrl}/booking/failure`,
    };

    // Handle voucher discounts based on type
    if (voucherCode && voucherDetails) {
      if (voucherDetails.type === 'DISCOUNT' || voucherDetails.type === 'FIXED') {
        // For discount vouchers, create a Stripe coupon and use discounts
        if (voucherDiscount && voucherDiscount > 0) {
          try {
            const coupon = await stripe.coupons.create({
              name: `Voucher: ${voucherCode}`,
              amount_off: Math.round(voucherDiscount * 100), // Convert to cents
              currency: "eur",
              duration: "once",
              metadata: {
                voucherCode: voucherCode,
                paymentIntentId: pendingBooking.id
              }
            });
            
            sessionConfig.discounts = [{
              coupon: coupon.id
            }];
          } catch (couponError) {
            console.error("Error creating Stripe coupon:", couponError);
            // Continue without coupon - the discount is already applied to the total
          }
        }
      } else {
        // For product vouchers or when no discount is applied, allow promotion codes
        sessionConfig.allow_promotion_codes = true;
      }
    } else {
      // No voucher applied, allow promotion codes for additional discounts
      sessionConfig.allow_promotion_codes = true;
    }

    // Find the customer to get their Stripe ID
    const customer = await prisma.customer.findUnique({
      where: { guestEmail: customerDetails.email },
    });

    if (customer?.stripeCustomerId) {
      sessionConfig.customer = customer.stripeCustomerId;
    } else {
      sessionConfig.customer_email = customerDetails.email;
    }

    // Save payment method for future use
    sessionConfig.payment_intent_data = {
      setup_future_usage: "on_session",
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    await prisma.paymentIntent.update({
      where: { id: pendingBooking.id },
      data: { stripeSessionId: session.id, status: "PENDING" }
    });

    responseHandler(res, 200, "Checkout session created", { 
      url: session.url,
      sessionId: session.id,
      ...(voucherCode && { appliedVoucher: voucherCode }),
      ...(voucherDiscount && { discountApplied: voucherDiscount })
    });
  } catch (e) {
    console.error("Checkout error:", e);
    handleError(res, e as Error);
  }
};