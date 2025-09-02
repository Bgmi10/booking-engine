import express, { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../prisma";
import dotenv from "dotenv";
import { handleError, responseHandler, generateMergedBookingId } from "../utils/helper";
import { sendConsolidatedBookingConfirmation, sendConsolidatedAdminNotification, sendRefundConfirmationEmail, sendChargeRefundConfirmationEmail, routeGroupEmail } from "../services/emailTemplate";
import { stripe } from "../config/stripeConfig";
import { EmailService } from "../services/emailService";
import { markForChannelSync } from "../cron/cron";
import { BookingGroupService } from "../services/bookingGroupService";

dotenv.config();

const stripeWebhookRouter = express.Router();

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
          case "charge.refund.updated":
            // Handle charge refund updates - usually can use same logic as refund.updated
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

async function handleRefundCreated(event: Stripe.Event) {
    const refund = event.data.object as Stripe.Refund;
    
    try {
        const paymentIntentId = refund.payment_intent as string;
        if (!paymentIntentId) {
            console.log("Refund event received without a Payment Intent ID.");
            return;
        }

        // Check if the refund is for an ad-hoc charge
        const charge = await prisma.charge.findFirst({
            where: { stripePaymentIntentId: paymentIntentId },
            include: { customer: true }
        });

        if (charge) {
            await prisma.charge.update({
                where: { id: charge.id },
                data: {
                    status: 'REFUNDED',
                    adminNotes: `Refunded ${refund.amount / 100} ${refund.currency.toUpperCase()}. Reason: ${refund.reason || 'N/A'}`
                }
            });
            
            if (charge.customer) {
                await sendChargeRefundConfirmationEmail(
                    charge.customer,
                    {
                        description: charge.description || 'Ad-hoc Charge',
                        paidAt: charge.paidAt
                    },
                    refund
                );
            }

            console.log(`Charge ${charge.id} successfully marked as REFUNDED.`);
            return;
        }
        
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
                payments: true,
                voucherUsages: {
                    include: {
                        voucher: true
                    }
                }
            }
        });

        if (!ourPaymentIntent) {
            console.log("PaymentIntent not found for refund:", refund.payment_intent);
            return;
        }

        // Handle partial vs full refund
        const refundAmount = refund.amount / 100; // Convert from cents
        const totalPaymentAmount = ourPaymentIntent.totalAmount;
        const isFullRefund = refundAmount >= totalPaymentAmount;
        
        // Check if this is a partial refund for a specific booking
        const specificBookingId = refund.metadata?.bookingId;
        let bookingsToSync: any[] = [];
        
        // Use longer timeout for refund transactions due to channel sync operations
        await prisma.$transaction(async (tx) => {
            if (specificBookingId) {
                // PARTIAL REFUND: Update only the specific booking
                const specificBooking = await tx.booking.findFirst({
                    where: { 
                        id: specificBookingId,
                        paymentIntentId: ourPaymentIntent.id 
                    }
                });
                
                if (specificBooking) {
                    await tx.booking.update({
                        where: { id: specificBookingId },
                        data: { 
                            status: "REFUNDED",
                            refundAmount: refundAmount,
                            refundStatus: "FULLY_REFUNDED"
                        }
                    });
                    
                    // Check if all bookings are now refunded
                    const remainingBookings = await tx.booking.findMany({
                        where: { 
                            paymentIntentId: ourPaymentIntent.id,
                            status: { not: "REFUNDED" }
                        }
                    });
                    
                    // Update payment intent status based on remaining bookings
                    const paymentIntentStatus = remainingBookings.length === 0 ? "REFUNDED" : "SUCCEEDED";
                    const refundStatusValue = remainingBookings.length === 0 ? "FULLY_REFUNDED" : "PARTIALLY_REFUNDED";
                    
                    // Note: Outstanding amount remains unchanged - refunds don't affect what's still owed
                    
                    await tx.paymentIntent.update({
                        where: { id: ourPaymentIntent.id },
                        data: { 
                            status: paymentIntentStatus,
                            refundStatus: refundStatusValue,
                            adminNotes: `Partial refund: €${refundAmount} for booking ${specificBookingId}. ${refund.metadata?.refundReason || "Refund processed"}`
                        }
                    });
                    
                    console.log(`Partial refund processed: €${refundAmount} for booking ${specificBookingId}`);
                } else {
                    console.log(`Booking ${specificBookingId} not found for partial refund`);
                }
            } else if (isFullRefund || refund.metadata?.isFullRefund === 'true') {
                // FULL REFUND: Update payment intent and all bookings
                // Note: Outstanding amount remains unchanged - refunds don't affect what's still owed
                await tx.paymentIntent.update({
                    where: { id: ourPaymentIntent.id },
                    data: { 
                        status: "REFUNDED",
                        refundStatus: "FULLY_REFUNDED",
                        adminNotes: refund.metadata?.refundReason || "Full refund processed"
                    }
                });

                // Update all bookings to refunded
                const refundedBookings = await tx.booking.updateMany({
                    where: { paymentIntentId: ourPaymentIntent.id },
                    data: { 
                        status: "REFUNDED",
                        refundStatus: "FULLY_REFUNDED",
                        refundAmount: refundAmount / ourPaymentIntent.bookings.length // Split evenly if no specific booking
                    }
                });
                
                // Get affected bookings for channel sync (will sync outside transaction)
                const affectedBookings = await tx.booking.findMany({
                    where: { paymentIntentId: ourPaymentIntent.id },
                    select: { id: true, roomId: true }
                });
                
                // Store booking IDs for sync after transaction
                bookingsToSync = affectedBookings;

                // Update payment record
                await tx.payment.updateMany({
                    where: { paymentIntentId: ourPaymentIntent.id },
                    data: { status: "REFUNDED" }
                });

                // Handle voucher refund logic
                await handleVoucherRefund(tx, ourPaymentIntent);
                
                console.log(`Full refund processed: €${refundAmount}`);
            } else {
                // PARTIAL REFUND without specific booking ID - don't know which booking to refund
                console.log(`Partial refund of €${refundAmount} received but no bookingId in metadata. Manual intervention may be needed.`);
                
                await tx.paymentIntent.update({
                    where: { id: ourPaymentIntent.id },
                    data: { 
                        adminNotes: `Partial refund €${refundAmount} received but no specific booking identified. ${refund.metadata?.refundReason || "Refund processed"}`
                    }
                });
            }
        }, {
            timeout: 15000 // 15 seconds timeout for refund operations
        });

        // Perform channel sync after transaction completes
        if (bookingsToSync.length > 0) {
            for (const booking of bookingsToSync) {
                try {
                    await markForChannelSync.booking(booking.id);
                    await markForChannelSync.room(booking.roomId);
                } catch (syncError) {
                    console.error(`Failed to mark refunded booking for sync:`, syncError);
                }
            }
        }

        if (ourPaymentIntent.bookings.length > 0) {
            const customerDetails = JSON.parse(ourPaymentIntent.customerData);
            const bookingData = JSON.parse(ourPaymentIntent.bookingData);
            
            // Generate confirmation ID for the refund email
            const bookingIds = ourPaymentIntent.bookings.map(booking => booking.id);
            const confirmationId = generateMergedBookingId(bookingIds);
            
            // Update bookingData with the confirmation ID
            const updatedBookingData = bookingData.map((booking: any) => ({
              ...booking,
              confirmationId: confirmationId
            }));
            
            // Check if this is a custom partial refund
            if (refund.metadata?.refundType === 'custom_partial_refund' && specificBookingId) {
                // Send custom partial refund email only if requested
                const sendEmailToCustomer = refund.metadata?.sendEmailToCustomer === 'true';
                if (sendEmailToCustomer) {
                    const booking = ourPaymentIntent.bookings.find(b => b.id === specificBookingId);
                    if (booking && customerDetails) {
                        const currentRefundAmount = booking.refundAmount || 0;
                        const updatedRefundAmount = currentRefundAmount + (refund.amount / 100);
                        
                        await EmailService.sendEmail({
                            to: {
                                email: customerDetails.email,
                                name: customerDetails.name
                            },
                            templateType: 'CUSTOM_PARTIAL_REFUND_CONFIRMATION',
                            templateData: {
                                customerName: customerDetails.name,
                                refundAmount: refund.amount / 100,
                                refundCurrency: refund.currency.toUpperCase(),
                                bookingId: booking.id,
                                roomName: booking.room.name,
                                refundReason: refund.metadata?.refundReason || 'Custom partial refund',
                                refundDate: new Date().toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                }),
                                remainingAmount: booking.totalAmount && booking?.totalAmount - updatedRefundAmount,
                                originalAmount: booking.totalAmount,
                                paymentMethod: 'STRIPE'
                            }
                        });
                    }
                }
            } else {
                // Send regular refund confirmation email using actual booking records
                // Check if this is a full refund (all bookings) or specific booking refund
                let actualBookingsForEmail = ourPaymentIntent.bookings.map((booking: any) => ({
                    id: booking.id,
                    checkIn: booking.checkIn,
                    checkOut: booking.checkOut,
                    totalGuests: booking.totalGuests,
                    adults: booking.adults || booking.totalGuests,
                    roomName: booking.room?.name,
                    roomDetails: booking.room,
                    confirmationId: confirmationId,
                    paymentMethod: 'STRIPE'
                }));
                
                if (specificBookingId) {
                    // Filter to only the specific booking if specified
                    actualBookingsForEmail = actualBookingsForEmail.filter(b => b.id === specificBookingId);
                }
                
                // Send regular refund confirmation email only if requested
                const sendEmailToCustomer = refund.metadata?.sendEmailToCustomer === 'true';
                if (sendEmailToCustomer) {
                    // Use group routing for refund emails
                    await routeGroupEmail(ourPaymentIntent.id, 'REFUND', {
                        bookings: actualBookingsForEmail,
                        customerDetails,
                        refundDetails: {
                            refundId: refund.id,
                            refundAmount: refund.amount / 100,
                            refundCurrency: refund.currency,
                            refundReason: refund.metadata?.refundReason || "Refund processed"
                        }
                    });
                }
            }
        }
        
    } catch (error) {
        console.error("Error in handleRefundCreated:", error);
        throw error;
    }
}

async function handleRefundUpdated(event: Stripe.Event) {
    const refund = event.data.object as Stripe.Refund;
    
    try {
        const ourPaymentIntent = await prisma.paymentIntent.findFirst({
            where: {
                stripePaymentIntentId: refund.payment_intent as string
            },
            include: {
                voucherUsages: {
                    include: {
                        voucher: true
                    }
                }
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
                        refundStatus: "NOT_REFUNDED",
                        adminNotes: "Refund failed - payment still valid"
                    }
                });

                await tx.booking.updateMany({
                    where: { paymentIntentId: ourPaymentIntent.id },
                    data: { 
                        status: "CONFIRMED",
                        refundStatus: "NOT_REFUNDED"
                    }
                });

                await tx.payment.updateMany({
                    where: { paymentIntentId: ourPaymentIntent.id },
                    data: { status: "COMPLETED" }
                });

                // Revert voucher usage back to APPLIED since refund failed
                await handleVoucherRefundRevert(tx, ourPaymentIntent);
            });
        } else if (refund.status === "succeeded") {
            // Ensure voucher refund is properly handled if not already processed
            await prisma.$transaction(async (tx) => {
                await handleVoucherRefund(tx, ourPaymentIntent);
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
        const stripePaymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);

        if (session.metadata?.chargeId) {
            await processChargeSuccess(session.metadata.chargeId, stripePaymentIntent, session.metadata.orderId, session.metadata.type);
            return;
        }

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
        // Check if this is a payment for a payment stage
        if (paymentIntent.metadata?.paymentStageId) {
            const paymentStageId = paymentIntent.metadata.paymentStageId;
            
            // Update the payment stage
            await prisma.paymentStage.update({
                where: { id: paymentStageId },
                data: {
                    status: "PAID",
                    paidAt: new Date()
                }
            });
            
            // Check if all stages are paid to update proposal status
            const paymentStage = await prisma.paymentStage.findUnique({
                where: { id: paymentStageId },
                include: {
                    paymentPlan: {
                        include: {
                            stages: true,
                            proposal: true
                        }
                    }
                }
            });
            
            if (paymentStage) {
                const allStages = paymentStage.paymentPlan.stages;
                const allPaid = allStages.every(stage => stage.status === 'PAID');
                
                // If all stages are paid, update the proposal status
                if (allPaid && paymentStage.paymentPlan.proposal.status === 'ACCEPTED') {
                    await prisma.weddingProposal.update({
                        where: { id: paymentStage.paymentPlan.proposalId },
                        data: { status: 'CONFIRMED' }
                    });
                }
            }
            
            console.log(`Payment stage ${paymentStageId} successfully marked as paid`);
            return;
        }

        if (paymentIntent.metadata?.chargeId) {
            await processChargeSuccess(paymentIntent.metadata.chargeId, paymentIntent, paymentIntent.metadata.orderId, paymentIntent.metadata.type);
            return;
        }

        const ourPaymentIntent = await prisma.paymentIntent.findFirst({
            where: {
                OR: [
                    { stripePaymentIntentId: paymentIntent.id },
                    { id: paymentIntent.metadata?.paymentIntentId },
                    { secondPaymentLinkId: paymentIntent.metadata?.paymentType === 'SECOND_INSTALLMENT' ? paymentIntent.metadata?.paymentIntentId : undefined }
                ]
            }
        });

        if (!ourPaymentIntent) {
            return;
        }

        // Handle second installment payment
        if (paymentIntent.metadata?.paymentType === 'SECOND_INSTALLMENT') {
            await handleSecondInstallmentPayment(ourPaymentIntent, paymentIntent);
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

async function handlePaymentIntentFailed(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    try {
        if (paymentIntent.metadata?.chargeId) {
            const failureMessage = paymentIntent.last_payment_error?.message || "Payment failed for an unknown reason.";
            await processChargeFailure(paymentIntent.metadata.chargeId, failureMessage);
            return;
        }

        const ourPaymentIntent = await prisma.paymentIntent.findFirst({
            where: {
                OR: [
                    { stripePaymentIntentId: paymentIntent.id },
                    { id: paymentIntent.metadata?.paymentIntentId },
                    { secondPaymentLinkId: paymentIntent.metadata?.paymentType === 'SECOND_INSTALLMENT' ? paymentIntent.metadata?.paymentIntentId : undefined }
                ]
            },
            include: {
                voucherUsages: {
                    include: {
                        voucher: true
                    }
                }
            }
        });

        if (ourPaymentIntent) {
            // Handle second installment payment failure
            if (paymentIntent.metadata?.paymentType === 'SECOND_INSTALLMENT') {
                await prisma.paymentIntent.update({
                    where: { id: ourPaymentIntent.id },
                    data: { secondPaymentStatus: "FAILED" }
                });
                console.log(`Second installment payment failed for PaymentIntent ${ourPaymentIntent.id}`);
                return;
            }

            await prisma.$transaction(async (tx) => {
                await tx.paymentIntent.update({
                  where: { id: ourPaymentIntent.id },
                  data: { status: "FAILED" }
                });
                
                await tx.temporaryHold.deleteMany({
                  where: { paymentIntentId: ourPaymentIntent.id }
                });

                // Handle voucher failure - mark usage as cancelled and revert voucher counts
                await handleVoucherFailure(tx, ourPaymentIntent);
            });
        }
    } catch (error) {
        console.error("Error in handlePaymentIntentFailed:", error);
        throw error;
    }
}

async function handlePaymentIntentCanceled(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    try {
        if (paymentIntent.metadata?.chargeId) {
            await processChargeFailure(paymentIntent.metadata.chargeId, "Payment was canceled.");
            return;
        }
        
        const ourPaymentIntent = await prisma.paymentIntent.findFirst({
            where: {
              OR: [
                { stripePaymentIntentId: paymentIntent.id },
                { id: paymentIntent.metadata?.paymentIntentId },
                { secondPaymentLinkId: paymentIntent.metadata?.paymentType === 'SECOND_INSTALLMENT' ? paymentIntent.metadata?.paymentIntentId : undefined }
              ]
            },
            include: {
                voucherUsages: {
                    include: {
                        voucher: true
                    }
                }
            }
        });

        if (ourPaymentIntent) {
            // Handle second installment payment cancellation
            if (paymentIntent.metadata?.paymentType === 'SECOND_INSTALLMENT') {
                await prisma.paymentIntent.update({
                    where: { id: ourPaymentIntent.id },
                    data: { secondPaymentStatus: "CANCELLED" }
                });
                console.log(`Second installment payment cancelled for PaymentIntent ${ourPaymentIntent.id}`);
                return;
            }

            await prisma.$transaction(async (tx) => {
                await tx.paymentIntent.update({
                    where: { id: ourPaymentIntent.id },
                    data: { status: "CANCELLED" }
                });
                
                // Remove temporary holds
                await tx.temporaryHold.deleteMany({
                    where: { paymentIntentId: ourPaymentIntent.id }
                });

                // Handle voucher cancellation - mark usage as cancelled and revert voucher counts
                await handleVoucherCancellation(tx, ourPaymentIntent);
            });
        }
    } catch (error) {
        console.error("Error in handlePaymentIntentCanceled:", error);
        throw error;
    }
}

async function handleSecondInstallmentPayment(ourPaymentIntent: any, stripePayment: any) {
    try {
        // Check if second payment already processed
        const existingSecondPayment = await prisma.payment.findFirst({
            where: { 
                paymentIntentId: ourPaymentIntent.id,
                paymentType: 'SECOND_INSTALLMENT'
            }
        });

        if (existingSecondPayment) {
            console.log(`Second payment already processed for PaymentIntent ${ourPaymentIntent.id}`);
            return;
        }

        // Check if second payment status is already SUCCEEDED
        if (ourPaymentIntent.secondPaymentStatus === 'SUCCEEDED') {
            console.log(`Second payment already marked as succeeded for PaymentIntent ${ourPaymentIntent.id}`);
            return;
        }

        await prisma.$transaction(async (tx) => {
            // Update payment intent second payment status
            await tx.paymentIntent.update({
                where: { id: ourPaymentIntent.id },
                data: { 
                    secondPaymentStatus: 'SUCCEEDED',
                    remainingAmount: 0 // Clear remaining amount since it's now paid
                }
            });

            // Update all bookings to mark final payment as completed
            await tx.booking.updateMany({
                where: { paymentIntentId: ourPaymentIntent.id },
                data: { 
                    finalPaymentStatus: 'COMPLETED'
                }
            });

            // Create payment record for second installment
            await tx.payment.create({
                data: {
                    stripePaymentIntentId: stripePayment.id,
                    amount: stripePayment.amount / 100,
                    currency: stripePayment.currency,
                    status: "COMPLETED",
                    paymentIntentId: ourPaymentIntent.id,
                    paymentType: 'SECOND_INSTALLMENT',
                    installmentNumber: 2,
                }
            });
        });

        console.log(`Second installment payment successfully processed for PaymentIntent ${ourPaymentIntent.id}`);
    } catch (error) {
        console.error('Error in handleSecondInstallmentPayment:', error);
        throw error;
    }
}

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

        // Check if bookings already exist
        const existingBookings = await prisma.booking.findMany({
            where: { paymentIntentId: ourPaymentIntent.id }
        });
        if (existingPayment && existingBookings.length > 0) {
            // All good, already processed
            return;
        }

        // Parse booking data
        const bookingItems = JSON.parse(ourPaymentIntent.bookingData);
        const customerDetails = JSON.parse(ourPaymentIntent.customerData);
        const customerRequest = (stripePayment.metadata && stripePayment.metadata.customerRequest) || customerDetails.specialRequests || null;
        const sendConfirmationEmail = stripePayment.metadata.sendConfirmationEmail || "true";
        let customer: any; 
        const result = await prisma.$transaction(async (tx) => {
            // Check or create customer
            customer = await tx.customer.findUnique({
                where: { guestEmail: customerDetails.email }
            });

            if (!customer) {
                const stripeCustomer = await stripe.customers.create({
                    email: customerDetails.email,
                    name: `${customerDetails.firstName} ${customerDetails.lastName}`,
                    phone: customerDetails.phone,
                    metadata: {
                        guestEmail: customerDetails.email
                    }
                });


                customer = await tx.customer.create({
                    data: {
                        guestEmail: customerDetails.email,
                        guestLastName: customerDetails.lastName,
                        guestFirstName: customerDetails.firstName,
                        guestPhone: customerDetails.phone,
                        guestMiddleName: customerDetails.middleName || null,
                        guestNationality: customerDetails.nationality,
                        stripeCustomerId: stripeCustomer.id,
                        tcAgreed: customerDetails.tcAgreed,
                        receiveMarketingEmail: customerDetails.receiveMarketing
                    }
                });
            } else {
                // Update customer info
                customer = await tx.customer.update({
                    where: { id: customer.id },
                    data: {
                        guestLastName: customerDetails.lastName,
                        guestFirstName: customerDetails.firstName,
                        guestPhone: customerDetails.phone,
                        guestMiddleName: customerDetails.middleName || null,
                        guestNationality: customerDetails.nationality,  
                        receiveMarketingEmail: customerDetails.receiveMarketing,
                        tcAgreed: customerDetails.tcAgreed
                    }
                });
            }

            // Determine if this is a second payment for split payment structure
            const paymentType = stripePayment.metadata?.paymentType || 'FULL_PAYMENT';
            const isSecondInstallment = paymentType === 'SECOND_INSTALLMENT';
            
            let createdBookings = [];
            
            if (isSecondInstallment) {
                // For second installment, just update existing bookings and payment intent
                createdBookings = await tx.booking.findMany({
                    where: { paymentIntentId: ourPaymentIntent.id },
                    include: { room: true, paymentIntent: true }
                });
                
                // Update booking payment status for split payment completion
                await tx.booking.updateMany({
                    where: { paymentIntentId: ourPaymentIntent.id },
                    data: { 
                        finalPaymentStatus: 'COMPLETED'
                    }
                });
            } else {
                
                createdBookings = await processBookingsInTransaction(
                    tx,
                    bookingItems,
                    { ...customerDetails, specialRequests: customerRequest },
                    ourPaymentIntent.id,
                    customer.id
                );

                if (createdBookings.length === 0) {
                    console.error('No bookings were created. BookingItems:', JSON.stringify(bookingItems, null, 2));
                    throw new Error(`Failed to create bookings for paymentIntentId: ${ourPaymentIntent.id}. No bookings were processed from ${bookingItems.length} booking items.`);
                }
            }

            // Update payment intent status
            const paymentIntentStatus = (ourPaymentIntent.paymentStructure === 'SPLIT_PAYMENT' && !isSecondInstallment) 
                ? "SUCCEEDED" // First payment complete, but booking may require second payment
                : "SUCCEEDED"; // Full payment or second installment complete
                
            // Calculate outstanding amount - if payment succeeds, outstanding is 0
            const outstandingAmount = 0;
                
            await tx.paymentIntent.update({
                where: { id: ourPaymentIntent.id },
                data: { 
                    status: paymentIntentStatus,
                    paidAt: new Date(),
                    outstandingAmount: outstandingAmount,
                    customer: { connect: { id: customer.id } }
                }
            });

            // Create payment record if not exists
            const paymentExists = await tx.payment.findFirst({
                where: { 
                    OR: [
                        { paymentIntentId: ourPaymentIntent.id },
                        { stripePaymentIntentId: stripePayment.id },
                    ]
                }
            });
            if (!paymentExists) {
                // Determine payment type based on metadata
                const paymentType = stripePayment.metadata?.paymentType || 'FULL_PAYMENT';
                const installmentNumber = paymentType === 'FIRST_INSTALLMENT' ? 1 : 
                                       paymentType === 'SECOND_INSTALLMENT' ? 2 : null;

                await tx.payment.create({
                    data: {
                        stripePaymentIntentId: stripePayment.id,
                        amount: stripePayment.amount / 100,
                        currency: stripePayment.currency,
                        status: "COMPLETED",
                        paymentIntentId: ourPaymentIntent.id,
                        stripeSessionId: sourceType === 'payment_link' ? null : ourPaymentIntent.stripeSessionId || null,
                        paymentType: paymentType,
                        installmentNumber: installmentNumber,
                    }
                });
            }

            await tx.temporaryHold.deleteMany({
                where: { paymentIntentId: ourPaymentIntent.id }
            });

            // Handle voucher success - increment usage counts and confirm applied status
            await handleVoucherSuccess(tx, ourPaymentIntent, createdBookings);

            // Note: GuestCheckInAccess records will be created by the cron job when sending check-in reminder emails
            // This ensures tokens are only created when actually needed for customer communication

            return { createdBookings, customer };
        });

        // Check for auto-grouping after successful payment
        try {
            const shouldAutoGroup = await BookingGroupService.checkAutoGrouping([ourPaymentIntent.id]);
            
            if (shouldAutoGroup && !ourPaymentIntent.bookingGroupId) {
                // Auto-create booking group
                const bookingData = JSON.parse(ourPaymentIntent.bookingData);
                const groupName = `${customerDetails.firstName} ${customerDetails.lastName} - ${bookingData.length} rooms`;
          
                await BookingGroupService.createBookingGroup({
                    groupName,
                    mainGuestId: customer?.id,
                    isAutoGrouped: true,
                    paymentIntentIds: [ourPaymentIntent.id],
                    userId: 'SYSTEM', // System-generated for webhook
                    reason: `Auto-grouped: ${bookingData.length} rooms booked together`,
                    bookingType: "DIRECT"
                });
                
                console.log(`[Auto-grouping] Successfully created booking group for payment intent ${ourPaymentIntent.id}`);
            }
        } catch (groupError) {
            // Log but don't fail the payment processing
            console.error('[Auto-grouping] Error in auto-grouping:', groupError);
        }

        // After transaction, send confirmation emails
        if (result.createdBookings.length > 0 && sendConfirmationEmail === "true") {
            await sendConfirmationEmails(result.createdBookings, customerDetails);
        }

        // Only return 200 to Stripe if everything succeeded
    } catch (error) {
        // Log error with details
        console.error('Error in processPaymentSuccess:', error, { paymentIntentId: ourPaymentIntent.id });
        // Do NOT return 200 to Stripe, so it will retry
        throw error;
    }
}

async function processChargeSuccess(chargeId: string, stripePayment: Stripe.PaymentIntent, orderId?: string, type?: string) {
    try {
        const charge = await prisma.charge.findUnique({ where: { id: chargeId } });

        if (!charge) {
            console.error(`Charge with ID ${chargeId} not found.`);
            return;
        }

        if (charge.status === "SUCCEEDED") {
            console.log(`Charge ${chargeId} already processed.`);
            return;
        }

        await prisma.charge.update({
            where: { id: chargeId },
            data: {
                status: "SUCCEEDED",
                stripePaymentIntentId: stripePayment.id,
                paidAt: new Date(),
                orderId
            },
        });

        // Update outstanding amount for related payment intent and booking group
        // All successful charges should reduce outstanding balance in the hotel tab system
        if (charge.paymentIntentId) {
            // Update the specific payment intent linked to this charge
            const paymentIntent = await prisma.paymentIntent.findUnique({
                where: { id: charge.paymentIntentId },
                select: { outstandingAmount: true, bookingGroupId: true }
            });

            if (paymentIntent && paymentIntent.outstandingAmount && paymentIntent.outstandingAmount > 0) {
                const chargeAmount = stripePayment.amount / 100;
                const currentOutstanding = paymentIntent.outstandingAmount;
                const newOutstanding = Math.max(0, currentOutstanding - chargeAmount);
                
                await prisma.paymentIntent.update({
                    where: { id: charge.paymentIntentId },
                    data: { outstandingAmount: newOutstanding }
                });
                
                console.log(`Updated outstanding amount for PaymentIntent ${charge.paymentIntentId}: ${currentOutstanding} -> ${newOutstanding}`);
                
                // If payment intent belongs to a booking group, update group outstanding amount
                if (paymentIntent.bookingGroupId) {
                    const bookingGroup = await prisma.bookingGroup.findUnique({
                        where: { id: paymentIntent.bookingGroupId },
                        select: { outstandingAmount: true }
                    });
                    
                    if (bookingGroup && bookingGroup.outstandingAmount) {
                        const groupNewOutstanding = Math.max(0, bookingGroup.outstandingAmount - chargeAmount);
                        
                        await prisma.bookingGroup.update({
                            where: { id: paymentIntent.bookingGroupId },
                            data: { outstandingAmount: groupNewOutstanding }
                        });
                        
                        console.log(`Updated outstanding amount for BookingGroup ${paymentIntent.bookingGroupId}: ${bookingGroup.outstandingAmount} -> ${groupNewOutstanding}`);
                    }
                }
            }
        } else if (charge.bookingGroupId) {
            // Handle charges that are directly linked to a booking group (e.g., from orders)
            const bookingGroup = await prisma.bookingGroup.findUnique({
                where: { id: charge.bookingGroupId },
                select: { outstandingAmount: true }
            });
            
            if (bookingGroup && bookingGroup.outstandingAmount) {
                const chargeAmount = stripePayment.amount / 100;
                const groupNewOutstanding = Math.max(0, bookingGroup.outstandingAmount - chargeAmount);
                
                await prisma.bookingGroup.update({
                    where: { id: charge.bookingGroupId },
                    data: { outstandingAmount: groupNewOutstanding }
                });
                
                console.log(`Updated outstanding amount for BookingGroup ${charge.bookingGroupId}: ${bookingGroup.outstandingAmount} -> ${groupNewOutstanding}`);
            }
        } else if (charge.customerId) {
            // Fallback to customer-based logic for charges without paymentIntentId
            // All charges should reduce outstanding balance
            const customerPaymentIntents = await prisma.paymentIntent.findMany({
                where: { 
                    customerId: charge.customerId,
                    status: 'SUCCEEDED',
                    outstandingAmount: { gt: 0 }
                }
            });

            // Reduce outstanding amount by the charge amount
            for (const paymentIntent of customerPaymentIntents) {
                const currentOutstanding = paymentIntent.outstandingAmount || 0;
                const chargeAmount = stripePayment.amount / 100;
                const newOutstanding = Math.max(0, currentOutstanding - chargeAmount);
                
                await prisma.paymentIntent.update({
                    where: { id: paymentIntent.id },
                    data: { outstandingAmount: newOutstanding }
                });
                
                console.log(`Updated outstanding amount for PaymentIntent ${paymentIntent.id}: ${currentOutstanding} -> ${newOutstanding}`);
                break; // Apply to first payment intent with outstanding balance
            }
        }

        if (orderId && type === "product_charge") {
            await prisma.order.update({
                where: { id: orderId },
                data: { status: "DELIVERED" }
            });
        }

        console.log(`Successfully processed charge ${chargeId}`);

    } catch (error) {
        console.error(`Error processing successful charge ${chargeId}:`, error);
        throw error;
    }
}

async function processChargeFailure(chargeId: string, failureMessage: string | null) {
    try {
        const charge = await prisma.charge.findUnique({ where: { id: chargeId } });

        if (!charge) {
            console.error(`Charge with ID ${chargeId} not found for failure processing.`);
            return;
        }

        if (charge.status !== "PENDING") {
            console.log(`Charge ${chargeId} is not in PENDING state, skipping failure update.`);
            return;
        }

        await prisma.charge.update({
            where: { id: chargeId },
            data: {
                status: "FAILED",
                adminNotes: failureMessage || "Payment failed via webhook.",
            },
        });

        console.log(`Successfully marked charge ${chargeId} as FAILED.`);

    } catch (error) {
        console.error(`Error processing failed charge ${chargeId}:`, error);
        throw error;
    }
}

async function handleVoucherSuccess(tx: any, paymentIntent: any, createdBookings: any[]) {
    const voucherUsages = await tx.voucherUsage.findMany({
        where: { 
            paymentIntentId: paymentIntent.id,
            status: "APPLIED"
        },
        include: {
            voucher: true
        }
    });

    for (const usage of voucherUsages) {
        // Update voucher usage count
        await tx.voucher.update({
            where: { id: usage.voucherId },
            data: {
                currentUsage: {
                    increment: 1
                }
            }
        });

        // Link voucher usage to the first booking (or all bookings if needed)
        if (createdBookings.length > 0) {
            await tx.voucherUsage.update({
                where: { id: usage.id },
                data: {
                    bookingId: createdBookings[0].id,
                    status: "APPLIED"
                }
            });
        }

        console.log(`Voucher ${usage.voucher.code} usage incremented successfully`);
    }
}

async function handleVoucherRefund(tx: any, paymentIntent: any) {
    const voucherUsages = await tx.voucherUsage.findMany({
        where: { 
            paymentIntentId: paymentIntent.id,
            status: "APPLIED"
        },
        include: {
            voucher: true
        }
    });

    for (const usage of voucherUsages) {
        // Decrement voucher usage count (don't go below 0)
        const currentVoucher = await tx.voucher.findUnique({
            where: { id: usage.voucherId },
            select: { currentUsage: true }
        });

        if (currentVoucher && currentVoucher.currentUsage > 0) {
            await tx.voucher.update({
                where: { id: usage.voucherId },
                data: {
                    currentUsage: {
                        decrement: 1
                    }
                }
            });
        }

        // Mark voucher usage as refunded
        await tx.voucherUsage.update({
            where: { id: usage.id },
            data: {
                status: "REFUNDED"
            }
        });

        console.log(`Voucher ${usage.voucher.code} usage decremented due to refund`);
    }
}

async function handleVoucherRefundRevert(tx: any, paymentIntent: any) {
    const voucherUsages = await tx.voucherUsage.findMany({
        where: { 
            paymentIntentId: paymentIntent.id,
            status: "REFUNDED"
        },
        include: {
            voucher: true
        }
    });

    for (const usage of voucherUsages) {
        // Increment voucher usage count back
        await tx.voucher.update({
            where: { id: usage.voucherId },
            data: {
                currentUsage: {
                    increment: 1
                }
            }
        });

        // Mark voucher usage as applied again
        await tx.voucherUsage.update({
            where: { id: usage.id },
            data: {
                status: "APPLIED"
            }
        });

        console.log(`Voucher ${usage.voucher.code} usage reverted back to applied (refund failed)`);
    }
}

async function handleVoucherFailure(tx: any, paymentIntent: any) {
    const voucherUsages = await tx.voucherUsage.findMany({
        where: { 
            paymentIntentId: paymentIntent.id,
            status: "APPLIED"
        },
        include: {
            voucher: true
        }
    });

    for (const usage of voucherUsages) {
        // Mark voucher usage as cancelled (no usage count changes needed as payment failed)
        await tx.voucherUsage.update({
            where: { id: usage.id },
            data: {
                status: "CANCELLED"
            }
        });

        console.log(`Voucher ${usage.voucher.code} usage marked as cancelled due to payment failure`);
    }
}

async function handleVoucherCancellation(tx: any, paymentIntent: any) {
    const voucherUsages = await tx.voucherUsage.findMany({
        where: { 
            paymentIntentId: paymentIntent.id,
            status: "APPLIED"
        },
        include: {
            voucher: true
        }
    });

    for (const usage of voucherUsages) {
        // Mark voucher usage as cancelled (no usage count changes needed as payment was cancelled)
        await tx.voucherUsage.update({
            where: { id: usage.id },
            data: {
                status: "CANCELLED"
            }
        });

        console.log(`Voucher ${usage.voucher.code} usage marked as cancelled due to payment cancellation`);
    }
}

async function processBookingsInTransaction(
    tx: any,
    bookingItems: any[], 
    customerDetails: any, 
    paymentIntentId: string,
    customerId: string
): Promise<any[]> {
    const createdBookings: any[] = [];
    
    for (const booking of bookingItems) {
        try {
            const { checkIn, checkOut, selectedRoom: roomId, adults, rooms } = booking;

            const existingBooking = await tx.booking.findFirst({
                where: {
                    roomId,
                    checkIn: new Date(checkIn),
                    checkOut: new Date(checkOut),
                    paymentIntentId: paymentIntentId // Only check for same payment intent
                }
            });

            if (existingBooking) {
                console.log('Booking already exists for this payment intent and room:', roomId);
                createdBookings.push(existingBooking); // Include existing booking in results
                continue;
            }

            // Check for conflicting bookings from other payment intents
            const conflictingBooking = await tx.booking.findFirst({
                where: {
                    roomId,
                    OR: [
                        {
                            checkIn: { lte: new Date(checkOut) },
                            checkOut: { gte: new Date(checkIn) }
                        }
                    ],
                    status: { in: ['CONFIRMED', 'PENDING'] },
                    paymentIntentId: { not: paymentIntentId }
                }
            });

            if (conflictingBooking) {
                console.error(`Room ${roomId} has conflicting booking from ${conflictingBooking.checkIn} to ${conflictingBooking.checkOut}`);
                throw new Error(`Room ${roomId} is not available for the selected dates due to existing booking.`);
            }

            // Get payment intent to check payment structure
            const paymentIntent = await tx.paymentIntent.findUnique({
                where: { id: paymentIntentId }
            });

            if (!paymentIntent) {
                throw new Error(`Payment intent not found: ${paymentIntentId}`);
            }

            // Calculate total amount - handle different price field names
            let totalAmount = 0;
            if (booking.totalPrice !== undefined) {
                totalAmount = booking.totalPrice;
            } else if (booking.roomTotal !== undefined) {
                totalAmount = booking.roomTotal;
            } else {
                // Fallback calculation
                const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 3600 * 24));
                const roomRate = booking.selectedRateOption?.price || booking.roomDetails?.price || 0;
                totalAmount = roomRate * nights * (rooms || 1);
                
                // Add enhancement costs if any
                if (booking.selectedEnhancements?.length) {
                    for (const enhancement of booking.selectedEnhancements) {
                        let enhancementCost = enhancement.price || 0;
                        if (enhancement.pricingType === "PER_GUEST") {
                            enhancementCost *= adults * rooms;
                        } else if (enhancement.pricingType === "PER_ROOM") {
                            enhancementCost *= rooms;
                        } else if (enhancement.pricingType === "PER_NIGHT") {
                            enhancementCost *= nights * rooms;
                        } else if (enhancement.pricingType === "PER_GUEST_PER_NIGHT") {
                            enhancementCost *= adults * rooms * nights;
                        }
                        totalAmount += enhancementCost;
                    }
                }
            }

            // Verify room exists before creating booking
            const roomExists = await tx.room.findUnique({ where: { id: roomId } });
            if (!roomExists) {
                throw new Error(`Room with ID ${roomId} not found`);
            }

            const newBooking = await tx.booking.create({
                data: {
                    totalGuests: adults * (rooms || 1),
                    checkIn: new Date(checkIn),
                    checkOut: new Date(checkOut),
                    room: { connect: { id: roomId } },
                    status: "CONFIRMED",
                    request: customerDetails.specialRequests || null,
                    paymentIntent: { connect: { id: paymentIntentId } },
                    paymentStructure: paymentIntent?.paymentStructure || 'FULL_PAYMENT',
                    totalAmount: totalAmount,
                    prepaidAmount: paymentIntent?.prepaidAmount,
                    remainingAmount: paymentIntent?.remainingAmount,
                    remainingDueDate: paymentIntent?.remainingDueDate,
                    finalPaymentStatus: paymentIntent?.paymentStructure === 'SPLIT_PAYMENT' ? 'PENDING' : 'COMPLETED',
                    ratePolicyId: booking.selectedRateOption?.id || null,
                    metadata: {
                        selectedRateOption: booking.selectedRateOption || null,
                        promotionCode: booking.promotionCode || null,
                        totalPrice: totalAmount,
                        rooms: booking.rooms || 1,
                        receiveMarketing: customerDetails.receiveMarketing || false
                    },
                    customer: { connect: { id: customerId }}
                },
                include: { room: true, paymentIntent: true }
            });

            if (booking.selectedEnhancements?.length) {
                try {
                    const enhancementData = booking.selectedEnhancements.map((enhancement: any) => ({
                        bookingId: newBooking.id,
                        enhancementId: enhancement.id,
                        quantity: enhancement.pricingType === "PER_GUEST" ? adults * (rooms || 1) : (rooms || 1),
                        notes: enhancement.notes || null
                    }));

                    await tx.enhancementBooking.createMany({ data: enhancementData });
                    console.log(`Created ${enhancementData.length} enhancement bookings for booking ${newBooking.id}`);
                } catch (enhancementError) {
                    console.error(`Failed to create enhancement bookings for booking ${newBooking.id}:`, enhancementError);
                    // Don't fail the booking creation if enhancement creation fails
                }
            }

            createdBookings.push(newBooking);
            
            // Mark room for channel sync when booking is created
            try {
                await markForChannelSync.booking(newBooking.id);
                await markForChannelSync.room(roomId);
            } catch (syncError) {
                console.error(`Failed to mark for channel sync:`, syncError);
                // Don't fail booking creation if sync marking fails
            }
            
        } catch (bookingError) {
            console.error(`Failed to create booking for room ${booking.selectedRoom}:`, bookingError);
            throw bookingError; // Re-throw to fail the transaction
        }
    }
    
    console.log(`Successfully created ${createdBookings.length} bookings`);
    return createdBookings;
}

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
                        totalAmount: true,  
                        currency: true,
                        status: true,
                        stripeSessionId: true,
                        stripePaymentIntentId: true,
                        taxAmount: true,
                        createdByAdmin: true,
                        voucherCode: true,
                        voucherDiscount: true,
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

        // Prepare voucher information if voucher was used
        let voucherInfo = null;
        if (paymentIntent.voucherCode) {
            // Fetch voucher details with products
            const voucherDetails = await prisma.voucher.findUnique({
                where: { code: paymentIntent.voucherCode },
                include: {
                    products: true
                }
            });

            if (voucherDetails) {
                voucherInfo = {
                    code: voucherDetails.code,
                    name: voucherDetails.name,
                    type: voucherDetails.type,
                    discountPercent: voucherDetails.discountPercent,
                    fixedAmount: voucherDetails.fixedAmount,
                    discountAmount: paymentIntent.voucherDiscount || 0,
                    originalAmount:  paymentIntent.amount,
                    finalAmount: paymentIntent.amount,
                    products: voucherDetails.products.map(product => ({
                        name: product.name,
                        description: product.description,
                        imageUrl: product.imageUrl,
                        value: product.value
                    }))
                };
            }
        }

        // Use group routing for confirmation emails
        const paymentIntentId = paymentIntent.id;
        await routeGroupEmail(paymentIntentId, 'CONFIRMATION', {
            bookings: enrichedBookings,
            customerDetails,
            receipt_url,
            voucherInfo
        });

        // Always send admin notification (not affected by group preferences)
        //@ts-ignore
        await sendConsolidatedAdminNotification(enrichedBookings, customerDetails, sessionId, voucherInfo);
    } catch (error) {
        console.error("Error sending confirmation emails:", error);
    }
}

export default stripeWebhookRouter;