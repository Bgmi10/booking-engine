import express, { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../prisma";
import dotenv from "dotenv";
import { handleError, responseHandler } from "../utils/helper";
import { sendConsolidatedBookingConfirmation, sendConsolidatedAdminNotification } from "../services/bookingEmailTemplate";

dotenv.config();

const stripeWebhookRouter = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-04-30.basil" });

stripeWebhookRouter.post("/webhook", express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
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

    try {
        // Handle different event types
        switch (event.type) {
          case "checkout.session.completed":
            await handleCheckoutSessionCompleted(event);
            break;
          case "payment_intent.succeeded":
            await handlePaymentIntentSucceeded(event);
            break;
          case "payment_intent.payment_failed":
            await handlePaymentIntentFailed(event);
            break;
          case "payment_intent.canceled":
            await handlePaymentIntentCanceled(event);
            break;
          case "charge.succeeded":
            // This is for Payment Links - we can ignore as payment_intent.succeeded handles it
            console.log("Charge succeeded (handled by payment_intent.succeeded):", event.data.object.id);
            break;
          case "payment_link.created":
            console.log("Payment link created:", event.data.object.id);
            break;
          case "payment_intent.created":
            console.log("Payment intent created:", event.data.object.id);
            break;
          default:
           console.log(`Unhandled event type: ${event.type}`);
        }

        responseHandler(res, 200, "Webhook processed successfully", { received: true });
    } catch (error) {
        console.error("Error processing webhook:", error);
        handleError(res, error as Error);
    }
});

// Handle checkout session completion (only for regular checkout sessions)
async function handleCheckoutSessionCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    
    try {
        
        // Get the payment intent from the session
        const stripePaymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
        
        // Find our PaymentIntent using the metadata - prioritize session metadata first
        const ourPaymentIntent = await prisma.paymentIntent.findFirst({ 
          where: { 
            OR: [
              { id: session.metadata?.pendingBookingId }, // User checkout flow
              { id: stripePaymentIntent.metadata?.paymentIntentId }, // Admin payment link flow
              { stripePaymentIntentId: stripePaymentIntent.id }
            ]
          }
        });

        if (!ourPaymentIntent) {
            console.log("PaymentIntent not found for checkout session:", session.id);
            return;
        }

        // Always update the session ID if it's not set, regardless of status
        if (!ourPaymentIntent.stripeSessionId) {
            await prisma.paymentIntent.update({
                where: { id: ourPaymentIntent.id },
                data: { 
                    stripeSessionId: session.id,
                    stripePaymentIntentId: stripePaymentIntent.id,
                }
            });
        }

        // If payment hasn't been processed yet and payment is succeeded, process it
        if (ourPaymentIntent.status !== 'SUCCEEDED' && stripePaymentIntent.status === 'succeeded') {
            const currentPaymentIntent = await prisma.paymentIntent.findUnique({
                where: { id: ourPaymentIntent.id }
            });
            await processPaymentSuccess(currentPaymentIntent!, stripePaymentIntent, 'checkout_session');
        } else {
            console.log("Payment already processed or not yet succeeded:", {
                ourStatus: ourPaymentIntent.status,
                stripeStatus: stripePaymentIntent.status
            });
        }
        
    } catch (error) {
        console.error("Error in handleCheckoutSessionCompleted:", error);
        throw error;
    }
}

// Handle payment intent success (both checkout and payment links)
async function handlePaymentIntentSucceeded(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    try {
        
        const ourPaymentIntent = await prisma.paymentIntent.findFirst({
            where: {
                OR: [
                    { stripePaymentIntentId: paymentIntent.id },
                    { id: paymentIntent.metadata?.paymentIntentId }
                ]
            }
        });

        if (!ourPaymentIntent) {
            console.log("PaymentIntent not found in our database for:", paymentIntent.id);
            return;
        }

        // Check if payment already exists (more specific check)
        const existingPayment = await prisma.payment.findFirst({
            where: { 
              OR: [
                { paymentIntentId: ourPaymentIntent.id },
                { stripePaymentIntentId: paymentIntent.id },
              ]
            }
        });

        if (existingPayment) {
            console.log("Payment already processed, skipping:", paymentIntent.id);
            return;
        }

        // Skip if already being processed
        if (ourPaymentIntent.status === 'SUCCEEDED') {
            console.log("PaymentIntent already processed successfully:", ourPaymentIntent.id);
            return;
        }

        // Update the stripe payment intent ID if not already set
        let updatedPaymentIntent = ourPaymentIntent;
        if (!ourPaymentIntent.stripePaymentIntentId) {
            updatedPaymentIntent = await prisma.paymentIntent.update({
                where: { id: ourPaymentIntent.id },
                data: { stripePaymentIntentId: paymentIntent.id }
            });
            console.log("Updated PaymentIntent with Stripe ID:", updatedPaymentIntent.id);
        }

        // Determine payment source type
        let paymentSourceType = 'unknown';
        let sessionId = updatedPaymentIntent.stripeSessionId;
        
        // Check if this came from a payment link (no session, has invoice)
        //@ts-ignore
        if (!sessionId && paymentIntent.invoice) {
            try {
                //@ts-ignore
                const invoice = await stripe.invoices.retrieve(paymentIntent.invoice as string);
                //@ts-ignore
                if (invoice.payment_link) {
                    //@ts-ignore
                    console.log("Payment made via Payment Link:", invoice.payment_link);
                    paymentSourceType = 'payment_link';

                    // Try to get the session ID from various sources
                    let foundSessionId = null;

                    // 1. Check payment intent metadata
                    if (paymentIntent.metadata?.checkout_session_id) {
                        foundSessionId = paymentIntent.metadata.checkout_session_id;
                    }

                    // 2. If not found, check the charge
                    if (!foundSessionId) {
                        const charges = await stripe.charges.list({
                            payment_intent: paymentIntent.id,
                            limit: 1
                        });

                        if (charges.data[0]?.metadata?.checkout_session_id) {
                            foundSessionId = charges.data[0].metadata.checkout_session_id;
                        }
                    }

                    // 3. If still not found, try to get from payment link checkout session
                    if (!foundSessionId) {
                        const checkoutSessions = await stripe.checkout.sessions.list({
                            payment_intent: paymentIntent.id,
                            limit: 1
                        });

                        if (checkoutSessions.data.length > 0) {
                            foundSessionId = checkoutSessions.data[0].id;
                        }
                    }

                    if (foundSessionId) {
                        // Update our payment intent with the session ID
                        updatedPaymentIntent = await prisma.paymentIntent.update({
                            where: { id: ourPaymentIntent.id },
                            data: { stripeSessionId: foundSessionId }
                        });
                        console.log("Updated PaymentIntent with session ID:", foundSessionId);
                        sessionId = foundSessionId;
                    } else {
                        console.log("Could not find session ID from any source");
                    }
                } else {
                    paymentSourceType = 'invoice';
                }
            } catch (invoiceError) {
                console.log("Could not retrieve invoice details:", invoiceError);
                paymentSourceType = 'unknown';
            }
        } else if (sessionId) {
            paymentSourceType = 'checkout_session';
        }

        console.log("Payment source type determined:", paymentSourceType);

        await processPaymentSuccess(updatedPaymentIntent, paymentIntent, paymentSourceType);
    } catch (error) {
        console.error("Error in handlePaymentIntentSucceeded:", error);
        throw error;
    }
}

// Handle payment intent failure
async function handlePaymentIntentFailed(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    try {
        const ourPaymentIntent = await prisma.paymentIntent.findFirst({
            where: {
                OR: [
                    { stripePaymentIntentId: paymentIntent.id },
                    { id: paymentIntent.metadata?.paymentIntentId }
                ]
            }
        });

        if (ourPaymentIntent) {
            await prisma.paymentIntent.update({
              where: { id: ourPaymentIntent.id },
              data: { status: "FAILED" }
            });
            
            await prisma.temporaryHold.deleteMany({
              where: { paymentIntentId: ourPaymentIntent.id }
            });
        }
    } catch (error) {
        console.error("Error in handlePaymentIntentFailed:", error);
        throw error;
    }
}

// Handle payment intent cancellation
async function handlePaymentIntentCanceled(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    try {
        const ourPaymentIntent = await prisma.paymentIntent.findFirst({
            where: {
              OR: [
                { stripePaymentIntentId: paymentIntent.id },
                { id: paymentIntent.metadata?.paymentIntentId }
              ]
            }
        });

        if (ourPaymentIntent) {
            await prisma.paymentIntent.update({
                where: { id: ourPaymentIntent.id },
                data: { status: "CANCELLED" }
            });
            
            // Remove temporary holds
            await prisma.temporaryHold.deleteMany({
                where: { paymentIntentId: ourPaymentIntent.id }
            });
  
        }
    } catch (error) {
        console.error("Error in handlePaymentIntentCanceled:", error);
        throw error;
    }
}

// Process successful payment with idempotency check
async function processPaymentSuccess(ourPaymentIntent: any, stripePayment: any, sourceType: string = 'unknown') {
    try {
        // Check if payment already processed
        const existingPayment = await prisma.payment.findFirst({
            where: { 
              OR: [
                { paymentIntentId: ourPaymentIntent.id },
                { stripePaymentIntentId: stripePayment.id },
              ]
            }
        });

        if (existingPayment) {
            console.log("Payment already processed:", stripePayment.id);
            return;
        }

        // Parse booking data
        const bookingItems = JSON.parse(ourPaymentIntent.bookingData);
        const customerDetails = JSON.parse(ourPaymentIntent.customerData);

        // Use transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            console.log("Starting transaction for payment intent:", ourPaymentIntent.id);
            
            // Update PaymentIntent status
            const updatedPaymentIntent = await tx.paymentIntent.update({
                where: { id: ourPaymentIntent.id },
                data: { 
                    status: "SUCCEEDED",
                    paidAt: new Date()
                }
            });

            // Process bookings
            const createdBookings = await processBookingsInTransaction(
                tx, 
                bookingItems, 
                customerDetails, 
                ourPaymentIntent.id
            );

            if (createdBookings.length === 0) {
                console.warn("No new bookings created for payment:", stripePayment.id);
                return { updatedPaymentIntent, createdBookings: [] };
            }

            // Create payment record
            const paymentRecord = await tx.payment.create({
                data: {
                  stripePaymentIntentId: stripePayment.id,
                  amount: stripePayment.amount / 100,
                  currency: stripePayment.currency,
                  status: "COMPLETED",
                  paymentIntentId: ourPaymentIntent.id,
                  stripeSessionId: sourceType === 'payment_link' ? null : updatedPaymentIntent.stripeSessionId || null,
                }
            });

            // Remove temporary holds
            const deletedHolds = await tx.temporaryHold.deleteMany({
              where: { paymentIntentId: ourPaymentIntent.id }
            });

            console.log("Temporary holds removed:", deletedHolds.count);

            return { updatedPaymentIntent, createdBookings, paymentRecord };
        });

        console.log("Transaction completed successfully");

        // Instead of sending emails immediately, queue them for async processing
        if (result.createdBookings.length > 0) {
            // Create an email queue record
            await prisma.emailQueue.create({
                data: {
                    paymentIntentId: ourPaymentIntent.id,
                    bookingIds: result.createdBookings.map(b => b.id),
                    customerData: ourPaymentIntent.customerData,
                    status: 'PENDING',
                    retryCount: 0,
                    maxRetries: 5
                }
            });
            
            console.log("Email sending queued for payment intent:", ourPaymentIntent.id);
        }

    } catch (error) {
        console.error("Error processing payment success:", error);
        
        // Attempt to update status to FAILED if not already SUCCEEDED
        try {
            const currentIntent = await prisma.paymentIntent.findUnique({
              where: { id: ourPaymentIntent.id },
              select: { status: true }
            });
            
            if (currentIntent?.status !== "SUCCEEDED") {
              await prisma.paymentIntent.update({
                where: { id: ourPaymentIntent.id },
                data: { status: "FAILED" }
              });
              console.log("Payment intent marked as FAILED due to processing error");
            }
        } catch (updateError) {
            console.error("Error updating payment intent to FAILED:", updateError);
        }
                
        throw error;
    }
}

// Process bookings within transaction
async function processBookingsInTransaction(
    tx: any,
    bookingItems: any[], 
    customerDetails: any, 
    paymentIntentId: string
): Promise<any[]> {
    const createdBookings: any[] = [];

    for (const booking of bookingItems) {
        const { checkIn, checkOut, selectedRoom: roomId, adults, rooms } = booking;

        // Check if booking already exists
        const existingBooking = await tx.booking.findFirst({
            where: {
                roomId,
                guestEmail: customerDetails.email,
                checkIn: new Date(checkIn),
                checkOut: new Date(checkOut),
            }
        });

        if (existingBooking) {
            console.log("Booking already exists, skipping:", existingBooking.id);
            continue;
        }

        // Create the booking
        const newBooking = await tx.booking.create({
            data: {
                guestFirstName: customerDetails.firstName,
                guestMiddleName: customerDetails.middleName || null,
                guestLastName: customerDetails.lastName,
                guestNationality: customerDetails.nationality,
                totalGuests: adults * rooms,
                guestEmail: customerDetails.email,
                guestPhone: customerDetails.phone,
                checkIn: new Date(checkIn),
                checkOut: new Date(checkOut),
                roomId,
                status: "CONFIRMED",
                request: customerDetails.specialRequests || null,
                paymentIntentId: paymentIntentId,
                metadata: {
                    selectedRateOption: booking.selectedRateOption || null,
                    promotionCode: booking.promotionCode || null,
                    totalPrice: booking.totalPrice,
                    rooms: booking.rooms,
                    receiveMarketing: customerDetails.receiveMarketing || false
                }
            },
            include: { room: true, paymentIntent: true }
        });

        // Handle enhancements
        if (booking.selectedEnhancements?.length) {
            const enhancementData = booking.selectedEnhancements.map((enhancement: any) => ({
                bookingId: newBooking.id,
                enhancementId: enhancement.id,
                quantity: enhancement.pricingType === "PER_GUEST" ? adults * rooms : rooms,
                notes: enhancement.notes || null
            }));

            await tx.enhancementBooking.createMany({ data: enhancementData });
        }

        createdBookings.push(newBooking);
    }

    return createdBookings;
}

// Create a new function for processing the email queue
async function processEmailQueue() {
    try {
        // Get pending email tasks
        const pendingEmails = await prisma.emailQueue.findMany({
            where: {
                status: 'PENDING',
                retryCount: { lt: 5 }
            },
            take: 10 // Process 10 at a time
        });

        for (const emailTask of pendingEmails) {
            try {
                // Get the payment intent and check for session ID
                const paymentIntent = await prisma.paymentIntent.findUnique({
                    where: { id: emailTask.paymentIntentId },
                    select: { stripeSessionId: true }
                });

                if (!paymentIntent?.stripeSessionId) {
                    // Increment retry count and skip for now
                    await prisma.emailQueue.update({
                        where: { id: emailTask.id },
                        data: { retryCount: { increment: 1 } }
                    });
                    continue;
                }

                // Fetch enriched booking data
                const enrichedBookings = await prisma.booking.findMany({
                    where: { id: { in: emailTask.bookingIds } },
                    include: {
                        room: true,
                        paymentIntent: {
                            select: {
                                id: true,
                                amount: true,
                                currency: true,
                                status: true,
                                stripeSessionId: true,
                                stripePaymentIntentId: true,
                                taxAmount: true,
                                createdByAdmin: true
                            }
                        },
                        enhancementBookings: {
                            include: { enhancement: true }
                        }
                    }
                });

                const baseUrl = process.env.NODE_ENV === "local" ? process.env.BASE_URL_DEV : process.env.BASE_URL_PROD;
                const receipt_url = `${baseUrl}/sessions/${paymentIntent.stripeSessionId}/receipt`;

                // Send emails
                await Promise.all([
                    //@ts-ignore
                    sendConsolidatedBookingConfirmation(enrichedBookings, JSON.parse(emailTask.customerData), receipt_url),
                    //@ts-ignore
                    sendConsolidatedAdminNotification(enrichedBookings, JSON.parse(emailTask.customerData))
                ]);

                // Mark as completed
                await prisma.emailQueue.update({
                    where: { id: emailTask.id },
                    data: { status: 'COMPLETED' }
                });

                console.log("Emails sent successfully for payment intent:", emailTask.paymentIntentId);

            } catch (error) {
                console.error("Error processing email task:", error);
                // Update retry count
                await prisma.emailQueue.update({
                    where: { id: emailTask.id },
                    data: { 
                        retryCount: { increment: 1 },
                        lastError: (error as Error).message
                    }
                });
            }
        }
    } catch (error) {
        console.error("Error in email queue processor:", error);
    }
}

// Export the email processor so it can be run separately
export { processEmailQueue };

export default stripeWebhookRouter;