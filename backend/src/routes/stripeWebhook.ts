import express, { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../prisma";
import dotenv from "dotenv";
import { handleError, responseHandler } from "../utils/helper";
import { sendConsolidatedBookingConfirmation, sendConsolidatedAdminNotification, sendRefundConfirmationEmail } from "../services/emailTemplate";

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
          case "refund.created":
            await handleRefundCreated(event);
            break;
          case "refund.updated":
            await handleRefundUpdated(event);
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

// NEW: Handle refund created
async function handleRefundCreated(event: Stripe.Event) {
    const refund = event.data.object as Stripe.Refund;
    
    try {
        const ourPaymentIntent = await prisma.paymentIntent.findFirst({
            where: {
                stripePaymentIntentId: refund.payment_intent as string
            },
            include: {
                bookings: {
                    include: {
                        room: true,
                        enhancementBookings: {
                            include: { enhancement: true }
                        }
                    }
                },
                payments: true
            }
        });

        if (!ourPaymentIntent) {
            console.log("PaymentIntent not found for refund:", refund.payment_intent);
            return;
        }

        // Update payment intent and related records
        await prisma.$transaction(async (tx) => {
            // Update payment intent status
            await tx.paymentIntent.update({
                where: { id: ourPaymentIntent.id },
                data: { 
                    status: "REFUNDED",
                    adminNotes: refund.metadata?.refundReason || "Refund processed"
                }
            });

            // Update all bookings to refunded
            await tx.booking.updateMany({
                where: { paymentIntentId: ourPaymentIntent.id },
                data: { status: "REFUNDED" }
            });

            // Update payment record
            await tx.payment.updateMany({
                where: { paymentIntentId: ourPaymentIntent.id },
                data: { status: "REFUNDED" }
            });
        });

        if (ourPaymentIntent.bookings.length > 0) {
            const customerDetails = JSON.parse(ourPaymentIntent.customerData);
            const bookingData = JSON.parse(ourPaymentIntent.bookingData);
            await sendRefundConfirmationEmail(bookingData, customerDetails,  {
                refundId: refund.id,
                refundAmount: refund.amount / 100,
                refundCurrency: refund.currency,
                refundReason: refund.metadata?.refundReason || "Refund processed"
            });
        }
        
    } catch (error) {
        console.error("Error in handleRefundCreated:", error);
        throw error;
    }
}

// NEW: Handle refund updated
async function handleRefundUpdated(event: Stripe.Event) {
    const refund = event.data.object as Stripe.Refund;
    
    try {
        const ourPaymentIntent = await prisma.paymentIntent.findFirst({
            where: {
                stripePaymentIntentId: refund.payment_intent as string
            }
        });

        if (!ourPaymentIntent) {
            console.log("PaymentIntent not found for refund update:", refund.payment_intent);
            return;
        }

        // Handle different refund statuses
        if (refund.status === "failed") {
            // Refund failed - revert status back to succeeded
            await prisma.$transaction(async (tx) => {
                await tx.paymentIntent.update({
                    where: { id: ourPaymentIntent.id },
                    data: { 
                        status: "SUCCEEDED",
                        adminNotes: "Refund failed - payment still valid"
                    }
                });

                await tx.booking.updateMany({
                    where: { paymentIntentId: ourPaymentIntent.id },
                    data: { status: "CONFIRMED" }
                });

                await tx.payment.updateMany({
                    where: { paymentIntentId: ourPaymentIntent.id },
                    data: { status: "COMPLETED" }
                });
            });
        }
        
    } catch (error) {
        console.error("Error in handleRefundUpdated:", error);
        throw error;
    }
}

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

        // Always update both session ID and payment intent ID if they're not set
        const updateData: any = {};
        
        if (!ourPaymentIntent.stripeSessionId) {
            updateData.stripeSessionId = session.id;
        }
        
        if (!ourPaymentIntent.stripePaymentIntentId) {
            updateData.stripePaymentIntentId = stripePaymentIntent.id;
        }

        // Update if we have data to update
        if (Object.keys(updateData).length > 0) {
            await prisma.paymentIntent.update({
                where: { id: ourPaymentIntent.id },
                data: updateData
            });
        }

        // If payment hasn't been processed yet and payment is succeeded, process it
        if (ourPaymentIntent.status !== 'SUCCEEDED' && stripePaymentIntent.status === 'succeeded') {
            // Get the updated payment intent to ensure we have the latest data
            const currentPaymentIntent = await prisma.paymentIntent.findUnique({
                where: { id: ourPaymentIntent.id }
            });
            await processPaymentSuccess(currentPaymentIntent!, stripePaymentIntent, 'checkout_session');
        } 
    } catch (error) {
        console.error("Error in handleCheckoutSessionCompleted:", error);
        throw error;
    }
}

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
            return;
        }

        // Skip if already being processed
        if (ourPaymentIntent.status === 'SUCCEEDED') {
            return;
        }

        // Update the stripe payment intent ID if not already set
        let updatedPaymentIntent = ourPaymentIntent;
        if (!ourPaymentIntent.stripePaymentIntentId) {
            updatedPaymentIntent = await prisma.paymentIntent.update({
                where: { id: ourPaymentIntent.id },
                data: { stripePaymentIntentId: paymentIntent.id }
            });
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
            return;
        }

        // Parse booking data
        const bookingItems = JSON.parse(ourPaymentIntent.bookingData);
        const customerDetails = JSON.parse(ourPaymentIntent.customerData);

        // Use transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            
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
                return { updatedPaymentIntent, createdBookings: [] };
            }

            // Get current payment intent to ensure we have latest session ID
            const currentPaymentIntent = await tx.paymentIntent.findUnique({
                where: { id: ourPaymentIntent.id },
                select: { stripeSessionId: true }
            });

            // Create payment record
            const paymentRecord = await tx.payment.create({
                data: {
                  stripePaymentIntentId: stripePayment.id,
                  amount: stripePayment.amount / 100,
                  currency: stripePayment.currency,
                  status: "COMPLETED",
                  paymentIntentId: ourPaymentIntent.id,
                  // For payment links, stripeSessionId will be null
                  stripeSessionId: sourceType === 'payment_link' ? null : currentPaymentIntent?.stripeSessionId || null,
                }
            });

            await tx.temporaryHold.deleteMany({
              where: { paymentIntentId: ourPaymentIntent.id }
            });

            return { updatedPaymentIntent, createdBookings, paymentRecord };
        });

        // Send confirmation emails outside transaction
        if (result.createdBookings.length > 0) {
            await sendConfirmationEmails(result.createdBookings, customerDetails);
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

// Add this helper function at the top level
async function waitForSessionId(paymentIntentId: string, maxRetries = 10, delayMs = 2000): Promise<string | null> {    
    for (let i = 0; i < maxRetries; i++) {
        
        const paymentIntent = await prisma.paymentIntent.findUnique({
            where: { id: paymentIntentId },
            select: { 
                stripeSessionId: true,
                stripePaymentIntentId: true,
                status: true 
            }
        });

        if (paymentIntent?.stripeSessionId) {
            return paymentIntent.stripeSessionId;
        }

        // Wait before next retry
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return null;
}

// Update the sendConfirmationEmails function
async function sendConfirmationEmails(createdBookings: any[], customerDetails: any) {
    if (createdBookings.length === 0) return;

    try {
        // Fetch enriched booking data for emails
        const enrichedBookings = await prisma.booking.findMany({
            where: { 
                id: { in: createdBookings.map(b => b.id) }
            },
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

        if (!enrichedBookings.length || !enrichedBookings[0].paymentIntent) {
            console.error("No enriched bookings or payment intent found");
            return;
        }

        const paymentIntent = enrichedBookings[0].paymentIntent;

        let sessionId = paymentIntent.stripeSessionId;
        if (!sessionId) {
            sessionId = await waitForSessionId(paymentIntent.id);
        }

        if (!sessionId) {
            console.error("Failed to get session ID after retries for payment intent:");
            return;
        }

        const baseUrl = process.env.NODE_ENV === "local" ? process.env.BASE_URL_DEV : process.env.BASE_URL_PROD;
        const receipt_url = `${baseUrl}/sessions/${sessionId}/receipt`;

        await Promise.all([
            //@ts-ignore
            sendConsolidatedBookingConfirmation(enrichedBookings, customerDetails, receipt_url),
            //@ts-ignore
            sendConsolidatedAdminNotification(enrichedBookings, customerDetails, sessionId)
        ]);
    } catch (error) {
        console.error("Error sending confirmation emails:", error);
    }
}

export default stripeWebhookRouter;