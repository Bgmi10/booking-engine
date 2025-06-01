import express, { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../prisma";
import dotenv from "dotenv";
import { handleError, mapStripeToStatus, responseHandler } from "../utils/helper";
import { sendConsolidatedBookingConfirmation, sendConsolidatedAdminNotification } from "../services/bookingEmailTemplate";

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
    const { pendingBookingId } = session.metadata!;

    try {
      const pendingBooking = await prisma.pendingBooking.findUnique({
        where: { id: pendingBookingId }
      });

      if (!pendingBooking) {
        console.error("Pending booking not found:", pendingBookingId);
        responseHandler(res, 400, "Pending booking not found.");
        return;
      }

      const bookingItems = JSON.parse(pendingBooking.bookingData);
      const customerDetails = JSON.parse(pendingBooking.customerData);
      const { paymentStatus, bookingStatus } = mapStripeToStatus(session.payment_status!);

      const createdBookings: any[] = [];

      for (const booking of bookingItems) {
        const { checkIn, checkOut, selectedRoom: roomId, adults, rooms } = booking;

        const existingBooking = await prisma.booking.findFirst({
          where: {
            roomId,
            guestEmail: customerDetails.email,
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
          }
        });

        if (existingBooking) continue;

        const existingHold = await prisma.temporaryHold.findFirst({
          where: {
            roomId,
            guestEmail: customerDetails.email,
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
            expiresAt: { gt: new Date() }
          }
        });

        if (!existingHold) continue;

        const newBooking = await prisma.booking.create({
          data: {
            guestName: customerDetails.name,
            guestNationality: customerDetails.nationality,
            totalGuests: adults * rooms,
            guestEmail: customerDetails.email,
            guestPhone: customerDetails.phone,
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
            roomId,
            status: bookingStatus,
            request: customerDetails.specialRequests || null,
            metadata: {
              selectedRateOption: booking.selectedRateOption || null,
              promotionCode: booking.promotionCode || null,
              totalPrice: booking.totalPrice,
              rooms: booking.rooms,
              receiveMarketing: customerDetails.receiveMarketing || false
            }
          },
          include: { room: true }
        });

        if (booking.selectedEnhancements?.length) {
          const enhancementData = booking.selectedEnhancements.map((enhancement: any) => ({
            bookingId: newBooking.id,
            enhancementId: enhancement.id,
            quantity: enhancement.pricingType === "PER_GUEST" ? adults * rooms : rooms,
            notes: enhancement.notes || null
          }));

          await prisma.enhancementBooking.createMany({ data: enhancementData });
        }

        await prisma.temporaryHold.deleteMany({
          where: {
            roomId,
            guestEmail: customerDetails.email,
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
          }
        });

        createdBookings.push(newBooking);
      }

      // ✅ Create Payment once for all bookings
      const payment = await prisma.payment.create({
        data: {
          stripeSessionId: session.id,
          amount: session.amount_total! / 100,
          currency: session.currency!,
          status: paymentStatus,
          booking: {
            connect: createdBookings.map((booking) => ({ id: booking.id }))
          }
        }
      });

      // ✅ Fetch all bookings with complete data for email
      const enrichedBookings = await prisma.booking.findMany({
        where: { 
          id: { in: createdBookings.map(b => b.id) }
        },
        include: {
          room: true,
          payment: true,
          enhancementBookings: {
            include: { enhancement: true }
          }
        }
      });

      // 🧹 Cleanup
      await prisma.pendingBooking.delete({
        where: { id: pendingBookingId }
      });

      // ✉️ Send consolidated emails (one email with all bookings)
      await Promise.all([
        //@ts-ignore
        sendConsolidatedBookingConfirmation(enrichedBookings, customerDetails),
        //@ts-ignore
        sendConsolidatedAdminNotification(enrichedBookings, customerDetails)
      ]);

      responseHandler(res, 200, "Bookings and payment created successfully.", { received: true });

    } catch (err) {
      console.error("Error processing Stripe webhook:", err);
      handleError(res, err as Error);
    }
  }
});

export default stipeWebhookRouter;