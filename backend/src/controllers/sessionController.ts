import { Request, Response } from "express";
import prisma from "../prisma";
import { responseHandler } from "../utils/helper";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const sessionController = async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    if (!sessionId) {
        responseHandler(res, 400, "Session ID is required");
        return;
    }

    const session = await prisma.payment.findUnique({
        where: { stripeSessionId: sessionId },
        include: {
            booking: {
                include: {
                    room: {
                        include: {
                            images: true,
                        }
                    },
                    enhancementBookings: {
                        include: {
                            enhancement: true,  
                        }
                    },
                }
            },
        },
    });

    if (!session) {
        responseHandler(res, 404, "Session not found");
        return;
    }

    if (session.status === "PENDING") {
        responseHandler(res, 200, "Session is pending");
        return;
    }

    if (session.status === "FAILED") {
        responseHandler(res, 400, "Session failed");
        return;
    }

    let sessionDetails;
    try {
      sessionDetails = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (stripeError: any) {
      console.error("Stripe Error:", stripeError);
      const message =
        stripeError?.message || "Failed to retrieve session from Stripe";
        responseHandler(res, 500, message);
        return;
    }

    if (!sessionDetails) {
        responseHandler(res, 400, "Session details not found");
        return;
    };
    
    responseHandler(res, 200, "Session is successful", {
        success: true,
        sessionDetails: sessionDetails,
        data: session
    });
};

