import express from "express";
import Stripe from "stripe"; 
import { TEMP_HOLD_DURATION_MINUTES } from "../utils/constants";
import prisma from "../prisma";
import dotenv from "dotenv";
import { handleError, responseHandler } from "../utils/helper";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-04-30.basil" });

export const createCheckoutSession = async (req: express.Request, res: express.Response) => {
  const { roomId, guestName, guestEmail, checkIn, checkOut } = req.body;

  try {
    // 1. Verify room is still available
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
        responseHandler(res, 400, "Room is not available for these dates.");
        return;
    }

    const overlappingHold = await prisma.temporaryHold.findFirst({
        where: {
          roomId,
          expiresAt: { gt: new Date() }, // still active
          OR: [
            {
              checkIn: { lte: new Date(checkOut) },
              checkOut: { gte: new Date(checkIn) }
            }
          ]
        }
    });
      
    if (overlappingHold) {
        responseHandler(res, 400, "Room is temporarily held by another user.");
        return;
    }
      
    const room = await prisma.roomCategory.findUnique({ where: { id: roomId } });

    if (!room) {
        responseHandler(res, 404, "Room not found");
        return;
    }

    const expiresAt = new Date(Date.now() + TEMP_HOLD_DURATION_MINUTES * 60 * 1000);
    await prisma.temporaryHold.create({
      data: {
        guestName,
        guestEmail,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        roomId,
        expiresAt,
      }
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: room.name },
            unit_amount: Math.floor(room.price * 100),
          },
          quantity: 1,
        },
      ],
      customer_email: guestEmail,
      metadata: {
        roomId,
        guestName,
        guestEmail,
        checkIn,
        checkOut,
      },
      expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
      success_url: `${process.env.NODE_ENV === "local" ? process.env.FRONTEND_DEV_URL : process.env.FRONTEND_PROD_URL}/success`,
      cancel_url: `${process.env.NODE_ENV === "local" ? process.env.FRONTEND_DEV_URL : process.env.FRONTEND_PROD_URL}/cancel`,
    });
    responseHandler(res, 200, "Checkout session created successfully", { url: session.url });
  } catch (e) {
    console.error(e);
    handleError(res, e as Error);
  }
};

