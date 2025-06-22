import express from "express";
import prisma from "../prisma";
import { handleError, responseHandler } from "../utils/helper";
import { stripe } from "../config/stripe";

export const createCustomer = async (req: express.Request, res: express.Response) => {
    const { firstName, lastName, middleName, nationality, email, phone, dob, passportExpiry, passportNumber, vipStatus, totalNigthsStayed, totalMoneySpent } = req.body; 

    const findExistingCustomer = await prisma.customer.findUnique({
        where: { guestEmail: email }
    });

    if (findExistingCustomer) {
        responseHandler(res, 400, "Customer Already exist");
        return;
    }

    try {
        const customer = await prisma.customer.create({
            data: {
                guestFirstName: firstName,
                guestEmail: email,
                passportExpiry: new Date(passportExpiry),
                passportNumber: passportNumber,
                guestPhone: phone,
                dob: new Date(dob),
                guestLastName: lastName,
                guestMiddleName: middleName,
                guestNationality: nationality,
                vipStatus,
                totalNightStayed: totalNigthsStayed,
                totalMoneySpent
            }
        });
        responseHandler(res, 200, "Customer created successfully", customer);
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const deleteCustomer = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    
    if (!id) {
        responseHandler(res, 400, "Missing id");
        return;
    }

    try {
        await prisma.customer.delete({ where: { id }});
        responseHandler(res, 200, "Customer deleted successfully");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const editCustomer =  async (req: express.Request, res: express.Response) => {
    const { firstName, lastName, middleName, nationality, email, phone, dob, passportExpiry, passportNumber, vipStatus, totalNigthsStayed, totalMoneySpent } = req.body; 

    const { id } = req.params;

    if (!id) {
        responseHandler(res, 400, "Missing id");
        return;
    }

    try {
        await prisma.customer.update({
            where: { id },
            data: {
                guestFirstName: firstName,
                guestEmail: email,
                passportExpiry: new Date(passportExpiry),
                passportNumber: passportNumber,
                guestPhone: phone,
                dob: new Date(dob),
                guestLastName: lastName,
                guestMiddleName: middleName,
                guestNationality: nationality,
                vipStatus,
                totalNightStayed: totalNigthsStayed,
                totalMoneySpent
            }
        });
        responseHandler(res, 200, "Updated customer data success");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const getAllCustomers = async (req: express.Request, res: express.Response) => {
    try {
        const customers = await prisma.customer.findMany({});
        responseHandler(res, 200, "success", customers);
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const getCustomerBookings = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    if (!id) {
        responseHandler(res, 400, "Missing id");
        return;
    }

    try {
        const bookings = await prisma.customer.findUnique({
            where: { id },
            select: {
                paymentIntents: {
                    include:{
                        bookings: { 
                            select: {
                                id: true
                            }
                        },
                        voucherUsages: true
                    }
                }
            }
        });

        if (!bookings) {
            responseHandler(res, 404, "Bookings not found");
            return;
        }
        responseHandler(res, 200, "success", bookings);
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const getPaymentMethodsForCustomer = async (req: express.Request, res: express.Response) => {
  const { id: stripeCustomerId } = req.params;

  if (!stripeCustomerId) {
    responseHandler(res, 400, "Stripe Customer ID is required in the URL parameters.");
    return;
  }

  try {
    // 1. Use the Stripe Customer ID to fetch payment methods and the customer object from Stripe
    const [paymentMethods, stripeCustomer] = await Promise.all([
      stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: "card",
      }),
      stripe.customers.retrieve(stripeCustomerId),
    ]);

    if (!stripeCustomer || stripeCustomer.deleted) {
      responseHandler(res, 404, "Stripe customer not found or has been deleted.");
      return;
    }

    const defaultPaymentMethodId = stripeCustomer.invoice_settings?.default_payment_method;

    const formattedPaymentMethods = paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
      isDefault: pm.id === defaultPaymentMethodId,
    }));

    responseHandler(res, 200, "Successfully retrieved payment methods", {
      paymentMethods: formattedPaymentMethods,
    });
  } catch (error: any) {
    console.error(`Error fetching payment methods for Stripe customer ${stripeCustomerId}:`, error);
    
    if (error.type === 'StripeInvalidRequestError') {
      responseHandler(res, 404, `No such customer: '${stripeCustomerId}'`);
      return;
    }
    handleError(res, error);
  }
};

export const getCustomerChargePayments = async (req: express.Request, res: express.Response) => {
  const { id  } = req.params;

  if (!id) {
    responseHandler(res, 400, "Stripe Customer ID is required in the URL parameters.");
    return;
  }

  try {
    const customerChargePaymets = await prisma.customer.findUnique({
        where: { id },
        select: {
            charges: true
        }
    });

    if (!customerChargePaymets) {
        responseHandler(res, 404, "Customer Not found");
        return;
    }

    responseHandler(res, 200, "success", customerChargePaymets);
  } catch (error: any) {
    console.error(error);
    handleError(res, error);
  }
}