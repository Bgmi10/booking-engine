import express from "express";
import { handleError, responseHandler } from "../utils/helper";
import prisma from "../prisma";
import { stripe, findOrCreatePrice } from "../config/stripeConfig";
import { PaymentReminderService } from "../services/paymentReminderService";

export const checkPaymentIntentStatus = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    if (!id) {
        responseHandler(res, 400, "Payment Intent id missing");
        return;
    }
    try { 
        const response = await prisma.paymentIntent.findUnique({
            where: { id }
        });
        if (!response) {
            responseHandler(res, 400, "Payment Intent not found");
            return;
        }
        
        // Check if first payment has expired
        if (response.expiresAt && new Date() > response.expiresAt) {
            await prisma.paymentIntent.update({
                where: { id },
                data: { status: "EXPIRED" }
            });
            responseHandler(res, 400, "Payment link is expired");
            return;
        }

        if (response.status === "EXPIRED") {
            responseHandler(res, 400, "Payment link is expired");
            return;
        }

        if (response.status === "SUCCEEDED" || response.status === "REFUNDED") {
            responseHandler(res, 400, "Payment already processed");
            return;
        }

        if (response.status === "CANCELLED") {
            responseHandler(res, 400, "Payment cancelled.");
            return;
        }
        //@ts-ignore
        const stripePaymentUrl = await stripe.paymentLinks.retrieve(response.stripePaymentLinkId);
        
        // Check if request expects JSON (from fetch) or HTML (direct browser access)
        const acceptsJson = req.headers.accept && req.headers.accept.includes('application/json');
        
        if (acceptsJson) {
            // Return success response for fetch requests
            responseHandler(res, 200, "success", { redirect: true });
        } else {
            // Direct browser access - redirect to Stripe
            res.redirect(302, stripePaymentUrl.url);
        }
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const createSecondPayment = async (req: express.Request, res: express.Response) => {
    const { paymentIntentId } = req.params;
    const { expiresInHours = 48 } = req.body; // Default 48 hours for second payment
    
    if (!paymentIntentId) {
        responseHandler(res, 400, "Payment Intent ID missing");
        return;
    }

    try {
        const paymentIntent = await prisma.paymentIntent.findUnique({
            where: { id: paymentIntentId }
        });

        if (!paymentIntent) {
            responseHandler(res, 404, "Payment Intent not found");
            return;
        }

        if (paymentIntent.paymentStructure !== 'SPLIT_PAYMENT') {
            responseHandler(res, 400, "Payment Intent is not set up for split payments");
            return;
        }

        if (!paymentIntent.remainingAmount || paymentIntent.remainingAmount <= 0) {
            responseHandler(res, 400, "No remaining amount to pay");
            return;
        }

        // Parse customer data for payment link
        const customerData = JSON.parse(paymentIntent.customerData);
        const secondPaymentExpiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

        // Create price using findOrCreatePrice like in createAdminPaymentLink
        const priceId = await findOrCreatePrice({
            name: `Final Payment - Booking ${paymentIntent.id.slice(-6).toUpperCase()}`,
            description: `Remaining payment for your booking (${paymentIntent.paymentStructure === 'SPLIT_PAYMENT' ? '70%' : 'remaining amount'})`,
            unitAmount: Math.round(paymentIntent.remainingAmount * 100),
            currency: paymentIntent.currency,
        });

        // Create Stripe payment link for remaining amount (like createAdminPaymentLink)
        const paymentLink = await stripe.paymentLinks.create({
            line_items: [{
                price: priceId,
                quantity: 1
            }],
            metadata: {
                customerEmail: customerData.email,
                type: "second_payment_link",
                paymentIntentId: paymentIntent.id,
                paymentType: 'SECOND_INSTALLMENT',
                customerId: paymentIntent.customerId || ''
            },
            after_completion: {
                type: 'redirect',
                redirect: {
                    url: `${process.env.NODE_ENV === "local" ? process.env.FRONTEND_DEV_URL : process.env.FRONTEND_PROD_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`
                }
            },
            payment_intent_data: {
                metadata: {
                    paymentIntentId: paymentIntent.id,
                    customerEmail: customerData.email,
                    type: "second_payment_link",
                    checkout_session_id: "{CHECKOUT_SESSION_ID}",
                    paymentType: 'SECOND_INSTALLMENT'
                }
            },
            allow_promotion_codes: false,
            restrictions: {
                completed_sessions: { limit: 1 }
            }
        });

        // Update payment intent with second payment link info and expiry
        await prisma.paymentIntent.update({
            where: { id: paymentIntentId },
            data: {
                secondPaymentLinkId: paymentLink.id,
                secondPaymentExpiresAt: secondPaymentExpiresAt,
                secondPaymentStatus: "CREATED" // Will be updated to PAYMENT_LINK_SENT by webhook
            }
        });

        // Create frontend URL that checks second payment status
        const route = `/payment-intent/${paymentIntent.id}/check-second-payment-status`
        const paymentUrl = process.env.NODE_ENV === "local" ? process.env.FRONTEND_DEV_URL + route : process.env.FRONTEND_PROD_URL + route;

        // Send email notification to customer with payment link

        console.log("155", paymentUrl)
        await PaymentReminderService.sendSecondPaymentCreatedEmail(paymentIntentId, paymentUrl);

        responseHandler(res, 200, "Second payment link created successfully", {
            paymentLinkId: paymentLink.id,
            paymentUrl: paymentUrl,
            expiresAt: secondPaymentExpiresAt,
            status: "SECOND_PAYMENT_LINK_SENT"
        });

    } catch (error) {
        console.error('Error creating second payment:', error);
        handleError(res, error as Error);
    }
}

export const checkSecondPaymentStatus = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    if (!id) {
        responseHandler(res, 400, "Payment Intent id missing");
        return;
    }
    try { 
        const response = await prisma.paymentIntent.findUnique({
            where: { id }
        });
        if (!response) {
            responseHandler(res, 400, "Payment Intent not found");
            return;
        }
        
        if (!response.secondPaymentLinkId) {
            responseHandler(res, 400, "Second payment link not found");
            return;
        }
        
        // Check if second payment has expired
        if (response.secondPaymentExpiresAt && new Date() > response.secondPaymentExpiresAt) {
            // Update second payment status to expired
            await prisma.paymentIntent.update({
                where: { id },
                data: { secondPaymentStatus: "EXPIRED" }
            });
            responseHandler(res, 400, "Second payment link is expired");
            return;
        }

        // Check the SECOND payment status, not the main payment status
        if (response.secondPaymentStatus === "EXPIRED") {
            responseHandler(res, 400, "Second payment link is expired");
            return;
        }

        if (response.secondPaymentStatus === "SUCCEEDED" || response.secondPaymentStatus === "REFUNDED") {
            responseHandler(res, 400, "Second payment already processed");
            return;
        }

        if (response.secondPaymentStatus === "CANCELLED") {
            responseHandler(res, 400, "Second payment cancelled.");
            return;
        }
        
        //@ts-ignore
        const stripePaymentUrl = await stripe.paymentLinks.retrieve(response.secondPaymentLinkId);
        
        // Check if request expects JSON (from fetch) or HTML (direct browser access)
        const acceptsJson = req.headers.accept && req.headers.accept.includes('application/json');
        
        if (acceptsJson) {
            // Return success response for fetch requests
            responseHandler(res, 200, "success", { redirect: true });
        } else {
            // Direct browser access - redirect to Stripe
            res.redirect(302, stripePaymentUrl.url);
        }
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const sendPaymentReminder = async (req: express.Request, res: express.Response) => {
    const { paymentIntentId } = req.params;
    
    if (!paymentIntentId) {
        responseHandler(res, 400, "Payment Intent ID missing");
        return;
    }

    try {
        const paymentIntent = await prisma.paymentIntent.findUnique({
            where: { id: paymentIntentId }
        });

        if (!paymentIntent) {
            responseHandler(res, 404, "Payment Intent not found");
            return;
        }

        if (paymentIntent.paymentStructure !== 'SPLIT_PAYMENT' || !paymentIntent.remainingAmount) {
            responseHandler(res, 400, "No remaining payment to remind about");
            return;
        }

        // Check if payment is overdue or upcoming
        const now = new Date();
        const dueDate = paymentIntent.remainingDueDate;
        const isOverdue = dueDate && now > dueDate;

        if (isOverdue) {
            await PaymentReminderService.sendBookingOverdueNotices();
            responseHandler(res, 200, "Overdue payment notice sent successfully");
        } else {
            await PaymentReminderService.sendBookingPaymentReminders();
            responseHandler(res, 200, "Payment reminder sent successfully");
        }

    } catch (error) {
        console.error('Error sending payment reminder:', error);
        handleError(res, error as Error);
    }
}