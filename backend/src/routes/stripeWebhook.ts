import express, { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../prisma";
import dotenv from "dotenv";
import { handleError, responseHandler, generateMergedBookingId } from "../utils/helper";
import { sendConsolidatedBookingConfirmation, sendConsolidatedAdminNotification, sendRefundConfirmationEmail, sendChargeRefundConfirmationEmail } from "../services/emailTemplate";
import { stripe } from "../config/stripeConfig";
import { dahuaService } from "../services/dahuaService";

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

            // Handle voucher refund logic
            await handleVoucherRefund(tx, ourPaymentIntent);
        });

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
            
            await sendRefundConfirmationEmail(updatedBookingData, customerDetails, {
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
                    { id: paymentIntent.metadata?.paymentIntentId }
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
                { id: paymentIntent.metadata?.paymentIntentId }
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
        // Extract customerRequest from Stripe metadata if present
        const customerRequest = (stripePayment.metadata && stripePayment.metadata.customerRequest) || customerDetails.specialRequests || null;
        // Use transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // Check if customer exists and has stripeCustomerId
            let customer = await tx.customer.findUnique({
                where: { guestEmail: customerDetails.email }
            });

            if (customer) {
                // Customer exists, check if they have stripeCustomerId
                if (!customer.stripeCustomerId) {
                    // Create Stripe customer
                    const stripeCustomer = await stripe.customers.create({
                        email: customerDetails.email,
                        name: `${customerDetails.firstName} ${customerDetails.lastName}`,
                        phone: customerDetails.phone,
                        metadata: {
                            customerId: customer.id,
                            guestEmail: customerDetails.email
                        }
                    });

                    // Update customer with stripeCustomerId
                    customer = await tx.customer.update({
                        where: { id: customer.id },
                        data: { 
                            stripeCustomerId: stripeCustomer.id,
                            guestLastName: customerDetails.lastName,
                            guestFirstName: customerDetails.firstName,
                            guestPhone: customerDetails.phone,
                            guestMiddleName: customerDetails.middleName || null,
                            guestNationality: customerDetails.nationality
                        }
                    });
                } else {
                    // Update existing customer info
                    customer = await tx.customer.update({
                        where: { id: customer.id },
                        data: {
                            guestLastName: customerDetails.lastName,
                            guestFirstName: customerDetails.firstName,
                            guestPhone: customerDetails.phone,
                            guestMiddleName: customerDetails.middleName || null,
                            guestNationality: customerDetails.nationality
                        }
                    });
                }
            } else {
                // Customer doesn't exist, create new customer with Stripe
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
                        stripeCustomerId: stripeCustomer.id
                    }
                });
            }

            const updatedPaymentIntent = await tx.paymentIntent.update({
                where: { id: ourPaymentIntent.id },
                data: { 
                    status: "SUCCEEDED",
                    paidAt: new Date(),
                    customer: { connect: { id: customer.id } }
                }
            });

            const createdBookings = await processBookingsInTransaction(
                tx, 
                bookingItems,  
                { ...customerDetails, specialRequests: customerRequest }, // inject customerRequest
                ourPaymentIntent.id,
                customer.id,
            ); 

            if (createdBookings.length === 0) {
                return { updatedPaymentIntent, createdBookings: [] };
            }
            
            const currentPaymentIntent = await tx.paymentIntent.findUnique({
                where: { id: ourPaymentIntent.id },
                select: { 
                    stripeSessionId: true,
                    voucherCode: true,
                    voucherDiscount: true,
                    amount: true
                }
            });

            // Create payment record
            const paymentRecord = await tx.payment.create({
                data: {
                  stripePaymentIntentId: stripePayment.id,
                  amount: stripePayment.amount / 100,
                  currency: stripePayment.currency,
                  status: "COMPLETED",
                  paymentIntentId: ourPaymentIntent.id,
                  stripeSessionId: sourceType === 'payment_link' ? null : currentPaymentIntent?.stripeSessionId || null,
                }
            });

            await tx.temporaryHold.deleteMany({
              where: { paymentIntentId: ourPaymentIntent.id }
            });

            // Handle voucher success - increment usage counts and confirm applied status
            await handleVoucherSuccess(tx, ourPaymentIntent, createdBookings);

            // Update bookings with voucher information
            if (currentPaymentIntent?.voucherCode) {
                await tx.booking.updateMany({
                    where: { paymentIntentId: ourPaymentIntent.id },
                    data: {
                        voucherCode: currentPaymentIntent.voucherCode,
                        voucherDiscount: currentPaymentIntent.voucherDiscount,
                        voucherProducts: ourPaymentIntent.voucherProducts || null
                    }
                });
            }

            return { 
                updatedPaymentIntent, 
                createdBookings, 
                paymentRecord,
                customer,
                voucherInfo: currentPaymentIntent?.voucherCode ? {
                    code: currentPaymentIntent.voucherCode,
                    discount: currentPaymentIntent.voucherDiscount,
                    originalAmount: currentPaymentIntent.amount
                } : null
            };
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
        const { checkIn, checkOut, selectedRoom: roomId, adults, rooms } = booking;

        const existingBooking = await tx.booking.findFirst({
            where: {
                roomId,
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
                totalGuests: adults * rooms,
                checkIn: new Date(checkIn),
                checkOut: new Date(checkOut),
                room: { connect: { id: roomId } },
                status: "CONFIRMED",
                request: customerDetails.specialRequests || null,
                carNumberPlate: customerDetails.carNumberPlate || null,
                paymentIntent: { connect: { id: paymentIntentId } },
                metadata: {
                    selectedRateOption: booking.selectedRateOption || null,
                    promotionCode: booking.promotionCode || null,
                    totalPrice: booking.totalPrice,
                    rooms: booking.rooms,
                    receiveMarketing: customerDetails.receiveMarketing || false
                },
                customer: { connect: { id: customerId }}
            },
            include: { room: true, paymentIntent: true }
        });

        // Handle license plate integration with Dahua camera
        if (customerDetails.carNumberPlate) {
            try {
                const guestName = `${customerDetails.firstName} ${customerDetails.lastName}`.trim();
                await dahuaService.addLicensePlate({
                    plateNumber: customerDetails.carNumberPlate,
                    checkInDate: new Date(checkIn),
                    checkOutDate: new Date(checkOut),
                    guestName: guestName,
                    bookingId: newBooking.id
                });
                console.log(`License plate ${customerDetails.carNumberPlate} added to Dahua camera for booking ${newBooking.id}`);
            } catch (error) {
                console.error(`Failed to add license plate to Dahua camera for booking ${newBooking.id}:`, error);
                // Don't fail the booking creation if Dahua integration fails
            }
        }

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

        await Promise.all([
            //@ts-ignore
            sendConsolidatedBookingConfirmation(enrichedBookings, customerDetails, receipt_url, voucherInfo),
            //@ts-ignore
            sendConsolidatedAdminNotification(enrichedBookings, customerDetails, sessionId, voucherInfo)
        ]);
    } catch (error) {
        console.error("Error sending confirmation emails:", error);
    }
}

export default stripeWebhookRouter;