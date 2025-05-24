import express, { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../prisma";
import dotenv from "dotenv";
import { handleError, mapStripeToStatus, responseHandler } from "../utils/helper";

dotenv.config();

const stipeWebhookRouter = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-04-30.basil" });

stipeWebhookRouter.post("/webhook", express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed.", err.message);
    responseHandler(res, 400, `Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { roomId, guestName, guestEmail, checkIn, checkOut, guestPhone, guestNationality } = session.metadata!;
  
    try {
      const existingBooking = await prisma.booking.findFirst({
        where: {
          roomId,
          guestEmail,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
        }
      });
  
      if (existingBooking) {
        responseHandler(res, 200, "Booking already exists.");
        return
      }
  
      const existingHold = await prisma.temporaryHold.findFirst({
        where: {
          roomId,
          guestEmail,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          expiresAt: { gt: new Date() }
        }
      });
  
      if (!existingHold) {
        responseHandler(res, 400, "No valid temporary hold found.");
        return;
      }

      const { paymentStatus, bookingStatus } = mapStripeToStatus(session.payment_status!);
  
      await prisma.booking.create({
        data: {
          guestName,    
          guestNationality,
          totalGuests: session.metadata?.totalGuests ? parseInt(session.metadata.totalGuests) : 1,
          guestEmail,
          guestPhone,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          roomId,
          status: bookingStatus,
          payment: {
            create: {
              stripeSessionId: session.id,
              amount: session.amount_total! / 100,
              currency: session.currency!,
              status: paymentStatus,
            }
          }
        }
      });
  
      await prisma.temporaryHold.deleteMany({
        where: {
          roomId,
          guestEmail,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
        }
      });
      // here we have to send a confirmation email to the guest and admin
      responseHandler(res, 200, "Booking created successfully.", { received: true });
    } catch (err) {
      console.error("Error processing Stripe webhook:", err);
      handleError(res, err as Error);
    }
  }
  
});

export default stipeWebhookRouter;
