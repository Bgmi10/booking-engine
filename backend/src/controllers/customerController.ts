import express from "express";
import prisma from "../prisma";
import { handleError, responseHandler } from "../utils/helper";
import { stripe } from "../config/stripe";
import { generateToken } from "../utils/jwt";
import dotenv from "dotenv";
import TelegramService from "../services/telegramService";
import { customerSchema, updateCustomerSchema } from "../zod/customer.schema";

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

export const getOccupiedRooms = async (req: express.Request, res: express.Response) => {
    try {
        const now = new Date();

        // Get today's date as YYYY-MM-DD only
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Strip time → 2025-07-02T00:00:00.000Z

        const activeBookings = await prisma.booking.findMany({
            where: {
                status: 'CONFIRMED',
                checkIn: {
                    lte: now,
                },
                checkOut: {
                    // Check if checkout is today or later (so still occupied)
                    gte: today,
                },
            },
            include: {
                room: {
                    select: {
                        name: true,
                    }
                }
            }
        });

        const occupiedRooms = activeBookings.map(booking => booking.room.name);
        const uniqueOccupiedRooms = [...new Set(occupiedRooms)];

        responseHandler(res, 200, "Successfully retrieved occupied rooms", uniqueOccupiedRooms);
    } catch (e) {
        console.error(e);
        handleError(res, e as Error);
    }
};


export const loginCustomer = async (req: express.Request, res: express.Response) => {
    const { surname, roomName } = req.body;

    if (!surname || !roomName) {
        responseHandler(res, 400, "Surname and Room Name are required.");
        return;
    }

    try {
        const now = new Date();
        
        // Get ALL active bookings for the room, then find the one with matching surname
        const activeBookings = await prisma.booking.findMany({
            where: {
                room: { name: roomName },
                status: 'CONFIRMED',
                checkIn: { lte: now },
                checkOut: { gte: now },
            },
            include: {
                customer: true,
            },
        });

        // Find the booking with matching surname
        const activeBooking = activeBookings.find(booking => 
            booking.customer.guestLastName.toLowerCase() === surname.toLowerCase()
        );

        let payload;
        let customerData;

        if (activeBooking) {
            // Existing customer found with matching surname
            const customer = activeBooking.customer;
            payload = { id: customer.id, email: customer.guestEmail, type: 'CUSTOMER' };
            customerData = customer;
        } else {
            // No matching booking found, create temporary customer
            const stripeCustomer = await stripe.customers.create({
                name: `Temporary Guest - ${surname}`,
                metadata: {
                    source: 'POS Login',
                    roomName: roomName
                }
            });

            const tempCustomer = await prisma.temporaryCustomer.create({
                data: {
                    surname,
                    stripeCustomerId: stripeCustomer.id
                },
            });
                     
            payload = { id: tempCustomer.id, surname: tempCustomer.surname, type: 'TEMP_CUSTOMER', stripeCustomerId: tempCustomer.stripeCustomerId };
            customerData = tempCustomer;
        }

        const tokenJwt = generateToken(payload);
        res.cookie("customertoken", tokenJwt, {
            domain: process.env.NODE_ENV === "local" ? "localhost" : "latorre.farm",
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
                 
        responseHandler(res, 200, "Verification successful", { user: customerData, token: tokenJwt });

    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
};

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
            include: {
                orderCategories: {
                    include: {
                        orderItems: true,
                        availabilityRule: true
                    }
                }
            }
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

export const getCustomerProfile = async(req: express.Request, res: express.Response) => {
    //@ts-ignore
    const { id, type } = req.user;

    try {
        let customer;
        if (type === 'CUSTOMER') {
            customer = await prisma.customer.findUnique({ where: { id } });
        } else if (type === 'TEMP_CUSTOMER') {
            customer = await prisma.temporaryCustomer.findUnique({ where: { id } });
        } else {
            responseHandler(res, 403, "Invalid user type in token");
            return;
        }
        
        if (!customer) {
            responseHandler(res, 404, "User profile not found");
            return;
        }

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
    //@ts-ignore
    const { id: userId, type: userType } = req.user;
    const { items, total, location, paymentMethod } = req.body;

    if (!items || !total || !location || !paymentMethod) {
        responseHandler(res, 400, "Missing required order information: items, total, location, and paymentMethod are required.");
        return;
    }

    try {
        const orderData: any = {
            status: 'PENDING',
            items: items,
            total,
            locationName: location,
        };

        if (userType === 'CUSTOMER') {
            orderData.customerId = userId;
        } else if (userType === 'TEMP_CUSTOMER') {
            if (paymentMethod !== 'PAY_AT_WAITER') {
                responseHandler(res, 403, "Temporary customers can only use the 'Pay at Waiter' payment method.");
                return;
            }
            orderData.temporaryCustomerId = userId;
        } else {
            responseHandler(res, 403, "Invalid user type.");
            return;
        }

        const newOrder = await prisma.order.create({
            data: orderData
        });

        if (paymentMethod === 'ASSIGN_TO_ROOM') {
            if (userType !== 'CUSTOMER') {
                responseHandler(res, 403, "Only registered customers can assign charges to their room.");
                return;
            }

            await prisma.charge.create({
                data: {
                    amount: total,
                    description: `Room charge for order #${newOrder.id.substring(0, 8)}`,
                    status: 'PENDING',
                    customerId: userId,
                    orderId: newOrder.id,
                    createdBy: userId
                }
            });
        }

        // Notify all services (WebSockets, Telegram, etc) via order event service
        try {
            // Always use the orderEventService for consistent handling
            const orderEventService = (global as any).orderEventService;
            if (orderEventService) {
                await orderEventService.orderCreated(newOrder.id);
                console.log(`Order ${newOrder.id} created and notifications sent via orderEventService`);
            } else {
                console.error("orderEventService not found in global context");
                // Fallback to direct Telegram notification if orderEventService is not available
                const hasKitchenItems = items.some((item: any) => !item.role || item.role === 'KITCHEN');
                const hasWaiterItems = items.some((item: any) => item.role === 'WAITER');
            await TelegramService.notifyNewOrder(newOrder.id, {
                total: newOrder.total,
                    locationName: newOrder.locationName,
                    hasKitchenItems,
                    hasWaiterItems
            });
            }
        } catch (error) {
            console.error("Failed to send order notifications:", error);
            // Continue since the order was created successfully
        }

        responseHandler(res, 201, "Order created successfully", newOrder);

    } catch (error) {
        console.error("Error creating order:", error);
        handleError(res, error as Error);
    }
}

export const getCustomerById = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    try {
        const customer = await prisma.customer.findUnique({
            where: { id },
            select: {
                guestEmail: true,
                guestFirstName: true,
                guestLastName: true,
                guestMiddleName: true,
                id: true
            }
        });

        if (!customer) {
            responseHandler(res, 404, "Customer not found");
            return;
        }

        responseHandler(res, 200, "success", customer);
    } catch (error) {
        console.error(`Error fetching customer ${id}:`, error);
        handleError(res, error as Error);
    }
};