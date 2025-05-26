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
    const { pendingBookingId, customerEmail, taxAmount, totalAmount } = session.metadata!;
  
    try {
      // Retrieve the pending booking data from database
      const pendingBooking = await prisma.pendingBooking.findUnique({
        where: { id: pendingBookingId }
      });

      if (!pendingBooking) {
        console.error('Pending booking not found:', pendingBookingId);
        responseHandler(res, 400, "Pending booking not found.");
        return;
      }

      // Parse the stored booking data
      const bookingItems = JSON.parse(pendingBooking.bookingData);
      const customerDetails = JSON.parse(pendingBooking.customerData);

      const { paymentStatus, bookingStatus } = mapStripeToStatus(session.payment_status!);

      // Process each booking item
      for (const booking of bookingItems) {
        const { checkIn, checkOut, selectedRoom: roomId, adults, rooms } = booking;

        // Check if booking already exists
        const existingBooking = await prisma.booking.findFirst({
          where: {
            roomId,
            guestEmail: customerDetails.email,
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
          }
        });

        if (existingBooking) {
          console.log("Booking already exists for room:", roomId);
          continue; // Skip this booking item
        }

        // Verify temporary hold still exists
        const existingHold = await prisma.temporaryHold.findFirst({
          where: {
            roomId,
            guestEmail: customerDetails.email,
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
            expiresAt: { gt: new Date() }
          }
        });

        if (!existingHold) {
          console.error("No valid temporary hold found for room:", roomId);
          continue; // Skip this booking item but don't fail the entire process
        }

        // Create the booking
        const createdBooking = await prisma.booking.create({
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
            },
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

        // Create enhancement bookings if any
        if (booking.selectedEnhancements && booking.selectedEnhancements.length > 0) {
          const enhancementBookingsData = booking.selectedEnhancements.map((enhancement: any) => ({
            bookingId: createdBooking.id,
            enhancementId: enhancement.id,
            quantity: enhancement.pricingType === "PER_GUEST" 
              ? adults * rooms 
              : rooms,
            notes: enhancement.notes || null
          }));

          await prisma.enhancementBooking.createMany({
            data: enhancementBookingsData
          });
        }

        // Remove the temporary hold
        await prisma.temporaryHold.deleteMany({
          where: {
            roomId,
            guestEmail: customerDetails.email,
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
          }
        });
      }

      // Clean up: delete the pending booking
      await prisma.pendingBooking.delete({
        where: { id: pendingBookingId }
      });

      // Here you should send confirmation email to guest and admin
      // await sendBookingConfirmationEmail(customerDetails, bookingItems);
      
      responseHandler(res, 200, "Booking(s) created successfully.", { received: true });
    } catch (err) {
      console.error("Error processing Stripe webhook:", err);
      handleError(res, err as Error);
    }
  }
  
});

export default stipeWebhookRouter;