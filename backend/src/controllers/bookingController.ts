import express from "express";
import Stripe from "stripe";
import { TEMP_HOLD_DURATION_MINUTES } from "../utils/constants";
import prisma from "../prisma";
import dotenv from "dotenv";
import { calculateNights, handleError, responseHandler } from "../utils/helper";

dotenv.config();
const devUrl = "https://localhost:5173";
const prodUrl = process.env.FRONTEND_PROD_URL;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-04-30.basil" });

export const createCheckoutSession = async (req: express.Request, res: express.Response) => {
    const { bookingItems, customerDetails, taxAmount, totalAmount } = req.body;
  
    try {
      for (const booking of bookingItems) {
        const { checkIn, checkOut, selectedRoom: roomId } = booking;
  
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
      
    

      const pendingBooking = await prisma.paymentIntent.create({
        data: {
          amount: totalAmount,
          bookingData: JSON.stringify(bookingItems),
          customerData: JSON.stringify({
            ...customerDetails,
            receiveMarketing: customerDetails.receiveMarketing || false,
          }),
          taxAmount,
          totalAmount,
          expiresAt,
          status: "PENDING",
          createdByAdmin: false,
          adminUserId: null,
          adminNotes: null,
        }
      });

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
              images: booking.roomDetails.images?.[0]?.url 
                ? [booking.roomDetails.images[0].url] 
                : undefined,
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
  
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items,
        customer_email: customerDetails.email,
        metadata: {
          pendingBookingId: pendingBooking.id,
          customerEmail: customerDetails.email,
          taxAmount: taxAmount.toString(),
          totalAmount: totalAmount.toString(),
        },
        expires_at: Math.floor((Date.now() + 30 * 60 * 1000) / 1000), // 30 minutes from now
        success_url: `${process.env.NODE_ENV === "local" ? devUrl : prodUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NODE_ENV === "local" ? devUrl : prodUrl}/booking/failure`,
      });

      await prisma.paymentIntent.update({
        where: { id: pendingBooking.id },
        data: { stripeSessionId: session.id, status: "PENDING" }
      });
  
      responseHandler(res, 200, "Checkout session created", { url: session.url });
    } catch (e) {
      console.error("Checkout error:", e);
      handleError(res, e as Error);
    }
};