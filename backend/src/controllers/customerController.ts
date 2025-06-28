import express from "express";
import prisma from "../prisma";
import { handleError, responseHandler } from "../utils/helper";
import { stripe } from "../config/stripe";
import { v4 as uuidv4 } from "uuid";
import { addMinutes, isBefore } from "date-fns";
import { EmailService } from "../services/emailService";
import { generateToken } from "../utils/jwt";
import dotenv from "dotenv";

dotenv.config();

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

export const getOrderItemsByLocation =  async (req: express.Request, res: express.Response) => {
    const { location } = req.query;

    if (!location) {
        responseHandler(res, 400, "location is required.");
        return;
    }

    try {
        const orderItems = await prisma.location.findUnique({
            where: { name: location as string },
        });

        if (!orderItems) {
            responseHandler(res, 404, "Order items not found for this location");
            return;
        }

        responseHandler(res, 200, "success", orderItems);
    } catch (error: any) {
        console.error(error);
        handleError(res, error);
    }
}

export const requestVerification = async (req: express.Request, res: express.Response) => {
    const { email } = req.body;
    if (!email) {
        responseHandler(res, 400, "Email is required");
        return;
    }
    try {
        let customer = await prisma.customer.findUnique({ where: { guestEmail: email } });
        if (!customer) {
            responseHandler(res, 404, "User not found please contact latorre for more information Or try with email which you you provided to bookings");
            return;
        }
        const otp = uuidv4();
        const expiresAt = addMinutes(new Date(), 15);
        await prisma.otp.upsert({
            where: { email },
            update: { otp, expiresAt },
            create: { email, otp, expiresAt },
        });
        const verifyUrl = `${process.env.NODE_ENV === "local" ? process.env.FRONTEND_DEV_URL : process.env.FRONTEND_PROD_URL}/customers/verify?token=${otp}`;
        await EmailService.sendEmail({
            to: { email, name: customer.guestFirstName || "Customer" },
            subject: "Verify your email for La Torre", // Will be overridden by template
            templateType: "CUSTOMER_EMAIL_VERIFICATION",
            templateData: {
                verifyUrl,
                year: new Date().getFullYear(),
                name: customer.guestFirstName || "Customer"
            },
        });
        responseHandler(res, 200, "Verification email sent");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
};

export const verifyCustomer = async (req: express.Request, res: express.Response) => {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
        responseHandler(res, 400, "Token is required");
        return;
    }
    try {
        const otpRecord = await prisma.otp.findFirst({ where: { otp: token } });
        if (!otpRecord) {
            responseHandler(res, 400, "Invalid or expired token");
            return;
        }
        if (isBefore(otpRecord.expiresAt, new Date())) {
            responseHandler(res, 400, "Token expired");
            return;
        }
        const customer = await prisma.customer.findUnique({ where: { guestEmail: otpRecord.email } });
        if (!customer) {
            responseHandler(res, 404, "Customer not found");
            return;
        }
        const payload = { id: customer.id, email: customer.guestEmail };
        const tokenJwt = generateToken(payload);
        await prisma.otp.deleteMany({ where: { otp: token } });
        res.cookie("customertoken", tokenJwt, {
            domain: process.env.NODE_ENV === "local" ?  "localhost" : "latorre.farm",
            httpOnly: false, 
            secure: process.env.NODE_ENV === "production", 
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        responseHandler(res, 200, "Verification successful");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}; 

export const getCustomerProfile = async(req: express.Request, res: express.Response) => {
    //@ts-ignore
    const { id } = req.user;

    try {
        const customer = await prisma.customer.findUnique({ where: { id } });
        responseHandler(res, 200, "success", customer);
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const customerLogout = async(req: express.Request, res: express.Response) => {
    res.clearCookie("customertoken", {
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "local" ? "localhost" : "latorre.farm",
    });
    responseHandler(res, 200, "Logout successful");          
}

export const createOrder = async(req: express.Request, res: express.Response) => {
    const { items, total, location, email } = req.body;

    if (!items || !total || !location || !email) {
        responseHandler(res, 400, "missing body");
        return;
    }

}