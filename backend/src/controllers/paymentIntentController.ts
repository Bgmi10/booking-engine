import express from "express";
import { handleError, responseHandler } from "../utils/helper";
import prisma from "../prisma";
import { stripe } from "../config/stripeConfig";
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

        // Create Stripe payment intent for remaining amount
        const secondPaymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(paymentIntent.remainingAmount * 100),
            currency: paymentIntent.currency,
            metadata: {
                paymentIntentId: paymentIntent.id,
                paymentType: 'SECOND_INSTALLMENT',
                customerId: paymentIntent.customerId || ''
            },
            description: `Final Payment - Booking ${paymentIntent.id.slice(-6).toUpperCase()}`
        });

        // Update payment intent with second payment info
        await prisma.paymentIntent.update({
            where: { id: paymentIntentId },
            data: {
                secondPaymentIntentId: secondPaymentIntent.id
            }
        });

        // Send email notification to customer with payment intent client secret
        const paymentUrl = `${process.env.FRONTEND_URL}/payment/${paymentIntent.id}/remaining?payment_intent=${secondPaymentIntent.id}&client_secret=${secondPaymentIntent.client_secret}`;
        await PaymentReminderService.sendSecondPaymentCreatedEmail(paymentIntentId, paymentUrl);

        responseHandler(res, 200, "Second payment intent created successfully", {
            paymentIntentId: secondPaymentIntent.id,
            clientSecret: secondPaymentIntent.client_secret,
            paymentUrl: paymentUrl
        });

    } catch (error) {
        console.error('Error creating second payment:', error);
        handleError(res, error as Error);
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