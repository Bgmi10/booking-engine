import express from "express";
import { handleError, responseHandler } from "../utils/helper";
import { stripe } from "../config/stripe";
import prisma from "../prisma";
import { findOrCreatePrice } from "./adminController";
import { sendPaymentLinkEmail, sendChargeConfirmationEmail } from "../services/emailTemplate";

export const chargeSaveCard = async (req: express.Request, res: express.Response) => {
   const { customerId, paymentMethodId, amount, description, currency } = req.body;
   //@ts-ignore
   const { id: userId } = req.user;;

   if (!customerId || !paymentMethodId || !amount) {
      responseHandler(res, 400, "Missing body");
      return;
   }

   const existingCustomer = await prisma.customer.findUnique({ where: { id: customerId }});

   if (!existingCustomer) {
     responseHandler(res, 400, "Customer not found");
     return;
   }

   let charge;
   try {
      charge = await prisma.charge.create({
        data: {
            amount,
            description,
            customerId,
            currency,
            status: "PENDING",
            createdBy: userId,
            expiredAt: new Date(Date.now() + 10 * 60 * 1000),
            paymentMethod: "CARD",
        }
      })
      const stripePaymentIntents = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(amount) * 100), // Amount in cents
        currency: "eur",
        customer: existingCustomer?.stripeCustomerId || "",
        payment_method: paymentMethodId,
        off_session: true, // Indicates the customer is not present
        confirm: true, // Attempts to charge the card right away
        description: description || `Charge for customer`,
        metadata: {
          chargeId: charge.id,
        },
      });

      await prisma.charge.update({
        where: { id: charge.id },
        data: { 
            stripePaymentIntentId: stripePaymentIntents.id
        }
      });

      responseHandler(res, 202, "Charge initiated successfully. Final status will be confirmed via webhook.", {
        chargeId: charge.id,
        status: stripePaymentIntents.status,
      });
   } catch (e) {
     console.log(e);
     handleError(res, e as Error);
   }
}

export const chargeNewCard = async (req: express.Request, res: express.Response) => {
  const { customerId, paymentMethodId, amount, description, currency } = req.body;
  // @ts-ignore
  const { id: userId } = req.user;;

  // 1. Validate input
  if (!customerId || !paymentMethodId || !amount) {
    responseHandler(res, 400, "Customer ID, Payment Method ID, and Amount are required.");
    return;
  }

  // 2. Find the customer in your local DB to get their Stripe ID
  const existingCustomer = await prisma.customer.findUnique({ where: { id: customerId } });

  if (!existingCustomer || !existingCustomer.stripeCustomerId) {
    responseHandler(res, 404, "Stripe customer profile not found for the given internal customer ID.");
    return;
  }

  let charge;
  try {
    // 3. Attach the new payment method to the Stripe customer to save it for future use.
    // This is the key step for "charge-new-card"
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: existingCustomer.stripeCustomerId,
    });

    // 4. Create a local charge record to track this transaction
    charge = await prisma.charge.create({
      data: {
        amount: parseFloat(amount),
        description: description || "Ad-hoc charge (new card)",
        customerId: existingCustomer.id,
        currency: currency || "eur",
        status: "PENDING",
        createdBy: userId,
        expiredAt: new Date(Date.now() + 10 * 60 * 1000),
        paymentMethod: "CARD",
      },
    });

    // 5. Create and confirm the Payment Intent using the newly attached card
    const stripePaymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(amount) * 100),
      currency: "eur",
      customer: existingCustomer.stripeCustomerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description: description || `Charge for customer ${existingCustomer.id}`,
      metadata: {
        chargeId: charge.id,
      },
    });

    // 6. Update the local charge record with the Stripe Payment Intent ID
    await prisma.charge.update({
      where: { id: charge.id },
      data: {
        stripePaymentIntentId: stripePaymentIntent.id,
      },
    });

    // 7. Send response indicating the charge has been initiated
    responseHandler(res, 202, "New card charged and saved successfully. Final status will be confirmed via webhook.", {
      chargeId: charge.id,
      status: stripePaymentIntent.status,
    });
    
  } catch (e: any) {
    console.error("Error during new card charge:", e.message);

    if (e.type === "StripeCardError") {
      responseHandler(res, 402, e.message);
      return;
    }

    handleError(res, e as Error);
  }
};

export const createQrSession = async (req: express.Request, res: express.Response) => {
  const { customerId, amount, description, currency, isHostedInvoice = false, expiresAt } = req.body;
  // @ts-ignore
  const { id: userId } = req.user;

  if (!customerId || !amount) {
    responseHandler(res, 400, "Customer ID and Amount are required.");
    return;
  }

  // 2. Find the customer in your local DB to ensure they exist
  const existingCustomer = await prisma.customer.findUnique({ 
    where: { id: customerId }, 
    select: { 
      guestEmail: true, 
      guestFirstName: true, 
      guestLastName: true, 
      guestPhone: true,
      guestNationality: true,
      id: true 
    } 
  });

  if (!existingCustomer) {
    responseHandler(res, 404, "Customer not found in our system.");
    return;
  }

  let charge;
  try {
    // 3. Create a local charge record to track this transaction
    // Use custom expiration for hosted invoices, otherwise default to 10 minutes
    const expirationDate = isHostedInvoice && expiresAt 
      ? new Date(expiresAt) 
      : new Date(Date.now() + 10 * 60 * 1000);

    charge = await prisma.charge.create({
      data: {
        amount: parseFloat(amount),
        description: description || (isHostedInvoice ? "Hosted Invoice Payment" : "QR Code Payment"),
        customerId: existingCustomer.id,
        currency: currency || "eur",
        status: "PENDING",
        createdBy: userId,
        expiredAt: expirationDate,
        paymentMethod: isHostedInvoice ? "HOSTED_INVOICE" : "QR_CODE",
      },
    });
    
    const priceId = await findOrCreatePrice({
        name: description || "QR Code Payment",
        description: `QR Code Payment - ${currency?.toUpperCase() || "EUR"} ${amount}`,
        unitAmount: Math.round(parseFloat(amount) * 100),
        currency: currency || "eur",
    });
  
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        chargeId: charge.id, // CRITICAL: Link to our internal record
      },
    });

    // 5. Save the real Stripe URL to our charge record for the redirect
    const chargeDetails = await prisma.charge.update({
      where: { id: charge.id },
      data: { 
        paymentUrl: paymentLink.url,
        stripePaymentIntentId: paymentLink.id,
        gatekeeperUrl: `${process.env.NODE_ENV === "local" ? process.env.FRONTEND_DEV_URL : process.env.FRONTEND_PROD_URL }/charge/${charge.id}`
       },
    });

    if (isHostedInvoice && existingCustomer.guestEmail) {
        await sendChargeConfirmationEmail(
          {
            guestEmail: existingCustomer.guestEmail as string,
            guestFirstName: existingCustomer.guestFirstName,
            guestLastName: existingCustomer.guestLastName,
            guestPhone: existingCustomer.guestPhone || undefined,
            guestNationality: existingCustomer.guestNationality || undefined,
          },
          {
            id: charge.id,
            amount: parseFloat(amount) * 100,
            description: description || (isHostedInvoice ? "Hosted Invoice Payment" : "QR Code Payment"),
            currency: currency || "eur",
            createdAt: charge.createdAt,
          },
          chargeDetails.gatekeeperUrl!,
          new Date(expiresAt)
        );
    }

    responseHandler(res, 201, "QR Code session created successfully.", {
      chargeId: charge.id,
      expiresAt: charge.expiredAt.toISOString(), 
    });

  } catch (e: any) {
    console.error("Error creating QR session:", e.message);

    // If a charge was created, mark it as failed.
    if (charge) {
      await prisma.charge.update({
        where: { id: charge.id },
        data: { status: "FAILED" },
      });
    }
    handleError(res, e as Error);
  }
};

export const getChargeById = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    if (!id) {
        responseHandler(res, 400, "missing id in params");
        return;
    }

    try {
        const charge = await prisma.charge.findUnique({ 
            where: { id },
            select: {
                expiredAt: true,
                gatekeeperUrl: true,
                amount: true, 
                description: true,
                currency: true,
                status: true,
            }
        });

        if (!charge) {
            responseHandler(res, 404, "Charge not found");
            return;
        }

        responseHandler(res, 200, "success", charge);
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const checkChargeStatus = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    if (!id) {
        responseHandler(res, 400, "Missing id in params");
        return;
    }

    try {
        const charge = await prisma.charge.findUnique({
            where: { id },
            select: {
                paymentUrl: true,
                expiredAt: true,
                status: true,
            }
        });

        if (!charge) {
            responseHandler(res, 404, "Charge not found");
            return;
        }

        const currentTime = new Date();
        const expiredAt = new Date(charge.expiredAt);
        
        if (currentTime > expiredAt) {
            responseHandler(res, 400, "Charge is expired");
            return;
        }

        if (charge.status === "SUCCEEDED") {
          responseHandler(res, 400, "Charge completed successfully");
          return;
        }

        //@ts-ignore
        res.redirect(302, charge?.paymentUrl);
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const refundCharge = async (req: express.Request, res: express.Response) => {
    const { id } = req.params; 

    try {
        const charge = await prisma.charge.findUnique({ where: { id } });

        if (!charge) {
            responseHandler(res, 404, "Charge not found.");
            return;
        }

        if (!charge.stripePaymentIntentId) {
            responseHandler(res, 400, "Charge cannot be refunded as it has no successful payment associated.");
            return;
        }

        if (charge.status !== 'SUCCEEDED') {
            responseHandler(res, 400, "Only successful charges can be refunded.");
            return;
        }

        const refund = await stripe.refunds.create({
            payment_intent: charge.stripePaymentIntentId,
            reason: 'requested_by_customer', 
        });

        responseHandler(res, 200, "Refund initiated successfully.", { refundId: refund.id });

    } catch (error) {
        console.error("Error refunding charge:", error);
        handleError(res, error as Error);
    }
}

export const createManualTransactionCharge = async (req: express.Request, res: express.Response) => {
    const { customerId, transactionId, description } = req.body;
    // @ts-ignore
    const { id: userId } = req.user;

    if (!customerId || !transactionId) {
        responseHandler(res, 400, "Customer ID and Transaction ID are required.");
        return;
    }

    try {
        // Find the customer
        const existingCustomer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (!existingCustomer) {
            responseHandler(res, 404, "Customer not found.");
            return;
        }

        // Determine if it's a Payment Intent (pi_) or Charge (ch_) and fetch accordingly
        let paymentData: any;
        let stripePaymentIntentId: string;
        let chargeAmount: number;
        let chargeCurrency: string;
        let chargeStatus: string;
        let chargeCreated: number;
        let chargeDescription: string | null;

        if (transactionId.startsWith('pi_')) {
            // It's a Payment Intent
            try {
                const paymentIntent = await stripe.paymentIntents.retrieve(transactionId);
                
                if (paymentIntent.status !== 'succeeded') {
                    responseHandler(res, 400, `Payment is not successful. Current status: ${paymentIntent.status}`);
                    return;
                }

                paymentData = paymentIntent;
                stripePaymentIntentId = transactionId;
                chargeAmount = paymentIntent.amount;
                chargeCurrency = paymentIntent.currency;
                chargeStatus = paymentIntent.status;
                chargeCreated = paymentIntent.created;
                chargeDescription = paymentIntent.description;

            } catch (stripeError: any) {
                if (stripeError.type === 'StripeInvalidRequestError') {
                    responseHandler(res, 400, "Invalid Payment Intent ID. Please check the ID and try again.");
                    return;
                }
                throw stripeError;
            }
        } else if (transactionId.startsWith('ch_')) {
            // It's a Charge
            try {
                const charge = await stripe.charges.retrieve(transactionId);
                
                if (charge.status !== 'succeeded') {
                    responseHandler(res, 400, `Payment is not successful. Current status: ${charge.status}`);
                    return;
                }

                paymentData = charge;
                stripePaymentIntentId = charge.payment_intent as string;
                chargeAmount = charge.amount;
                chargeCurrency = charge.currency;
                chargeStatus = charge.status;
                chargeCreated = charge.created;
                chargeDescription = charge.description;

            } catch (stripeError: any) {
                if (stripeError.type === 'StripeInvalidRequestError') {
                    responseHandler(res, 400, "Invalid Charge ID. Please check the ID and try again.");
                    return;
                }
                throw stripeError;
            }
        } else {
            responseHandler(res, 400, "Invalid transaction ID format. Must start with 'pi_' (Payment Intent) or 'ch_' (Charge).");
            return;
        }

        // Check if this payment is already associated with a charge
        const existingCharge = await prisma.charge.findFirst({
            where: { 
                OR: [
                    { stripePaymentIntentId: stripePaymentIntentId },
                    { stripePaymentIntentId: transactionId }
                ]
            }
        });

        if (existingCharge) {
            responseHandler(res, 400, "This transaction is already recorded in our system.");
            return;
        }

        // Create charge record
        const charge = await prisma.charge.create({
            data: {
                amount: chargeAmount / 100, // Convert from cents
                description: description || chargeDescription || `Manual transaction: ${transactionId}`,
                customerId: existingCustomer.id,
                currency: chargeCurrency,
                status: "SUCCEEDED", // Already paid
                createdBy: userId,
                expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
                paymentMethod: "MANUAL_TRANSACTION",
                stripePaymentIntentId: stripePaymentIntentId,
                paidAt: new Date(chargeCreated * 1000), // Convert from Unix timestamp
                adminNotes: `Manually recorded transaction ID: ${transactionId} (${transactionId.startsWith('pi_') ? 'Payment Intent' : 'Charge'}). Stripe metadata stored for refund processing.`
            }
        });

        responseHandler(res, 201, "Manual transaction recorded successfully.", {
            chargeId: charge.id,
            amount: charge.amount,
            currency: charge.currency,
            status: charge.status,
            stripeData: {
                originalTransactionId: transactionId,
                paymentIntentId: stripePaymentIntentId,
                transactionType: transactionId.startsWith('pi_') ? 'Payment Intent' : 'Charge',
                receiptUrl: paymentData.receipt_url || null
            }
        });

    } catch (error) {
        console.error("Error creating manual transaction charge:", error);
        handleError(res, error as Error);
    }
};