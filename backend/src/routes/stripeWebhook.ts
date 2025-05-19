import express, { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../prisma";
import dotenv from "dotenv";
import { handleError, responseHandler } from "../utils/helper";

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
    const { roomId, guestName, guestEmail, checkIn, checkOut } = session.metadata!;

    try {
       await prisma.booking.create({
        data: {
          guestName,
          guestEmail,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          roomId,
          payment: {
            create: {
              stripeSessionId: session.id,
              amount: session.amount_total! / 100,
              currency: session.currency!,
              status: session.payment_status!,
            }
          }
        }
      });

      await prisma.temporaryHold.deleteMany({
        where: { roomId, guestEmail }
      });

    } catch (err) {
      handleError(res, err as Error);
    }
  }
  responseHandler(res, 200, "Webhook received", { received: true });
});

export default stipeWebhookRouter;
