import express from "express";
import Stripe from "stripe";
import { TEMP_HOLD_DURATION_MINUTES } from "../utils/constants";
import prisma from "../prisma";
import dotenv from "dotenv";
import { handleError, responseHandler } from "../utils/helper";

dotenv.config();
const devUrl = process.env.FRONTEND_DEV_URL;
const prodUrl = process.env.FRONTEND_PROD_URL;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-04-30.basil" });

export const createCheckoutSession = async (req: express.Request, res: express.Response) => {
    const { bookingItems, customerDetails, taxAmount, totalAmount } = req.body;
  
    try {
      // 1. Verify availability for all rooms
      for (const booking of bookingItems) {
        const { checkIn, checkOut, selectedRoom: roomId } = booking;
  
        // Check existing bookings
        const overlappingBookings = await prisma.booking.findFirst({
          where: {
            roomId,
            OR: [
              {
                checkIn: { lte: new Date(checkOut) },
                checkOut: { gte: new Date(checkIn) }
              }
            ]
          }
        });
  
        if (overlappingBookings) {
          responseHandler(res, 400, `${booking.roomDetails.name} is not available for these dates`);
          return;
        }
  
        // Check temporary holds
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
  
      // 2. Create temporary holds for all rooms
      const expiresAt = new Date(Date.now() + TEMP_HOLD_DURATION_MINUTES * 60 * 1000);
      await prisma.temporaryHold.createMany({
        data: bookingItems.map((booking: any) => ({
          guestName: customerDetails.name,
          guestEmail: customerDetails.email,
          checkIn: new Date(booking.checkIn),
          checkOut: new Date(booking.checkOut),
          roomId: booking.selectedRoom,
          expiresAt,
        }))
      });

      // 3. Store booking data in database temporarily
      const pendingBooking = await prisma.pendingBooking.create({
        data: {
          bookingData: JSON.stringify(bookingItems),
          customerData: JSON.stringify({
            ...customerDetails,
            receiveMarketing: customerDetails.receiveMarketing || false,
          }),
          taxAmount,
          totalAmount,
          expiresAt,
        }
      });
  
      // 4. Prepare Stripe line items
      const line_items = bookingItems.flatMap((booking: any) => {
        const roomLineItem = {
          price_data: {
            currency: "eur",
            product_data: {
              name: booking.roomDetails.name,
              description: booking.roomDetails.description,
              images: booking.roomDetails.images?.[0]?.url 
                ? [booking.roomDetails.images[0].url] 
                : undefined,
            },
            unit_amount: Math.round(booking.roomDetails.price * 100), // Includes tax
          },
          quantity: booking.rooms,
        };
  
        const enhancementLineItems = booking.selectedEnhancements?.map((enhancement: any) => ({
          price_data: {
            currency: "eur",
            product_data: {
              name: enhancement.title,
              description: enhancement.description,
              images: [enhancement.image],
            },
            unit_amount: Math.round(enhancement.price * 100), // Includes tax
          },
          quantity: enhancement.pricingType === "PER_GUEST" 
            ? booking.adults * booking.rooms 
            : booking.rooms,
        })) || [];
  
        return [roomLineItem, ...enhancementLineItems];
      });
  
      // 5. Add rate option if selected
      if (bookingItems[0].selectedRateOption) {
        const rateOption = bookingItems[0].selectedRateOption;
        line_items.push({
          price_data: {
            currency: "eur",
            product_data: {
              name: rateOption.name,
              description: rateOption.description,
            },
            unit_amount: Math.round(rateOption.price * 100),
          },
          quantity: 1,
        });
      }
  
      // 6. Create Stripe session with minimal metadata
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card", "paypal", "sepa_debit"],
        mode: "payment",
        line_items,
        customer_email: customerDetails.email,
        metadata: {
          pendingBookingId: pendingBooking.id,
          customerEmail: customerDetails.email,
          taxAmount: taxAmount.toString(),
          totalAmount: totalAmount.toString(),
        },
        expires_at:  Math.floor((Date.now() + 30 * 60 * 1000) / 1000), // make this to 30 minutes from now
        success_url: `${process.env.NODE_ENV === "local" ? devUrl : prodUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NODE_ENV === "local" ? devUrl : prodUrl}/booking`,
      });
  
      responseHandler(res, 200, "Checkout session created", { url: session.url });
    } catch (e) {
      console.error("Checkout error:", e);
      handleError(res, e as Error);
    }
  };

  