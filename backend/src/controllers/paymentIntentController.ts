import express from "express";
import { handleError, responseHandler } from "../utils/helper";
import prisma from "../prisma";
import { stripe } from "../config/stripeConfig";

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