import express from "express";
import prisma from "../prisma";
import { handleError, responseHandler } from "../utils/helper";
import { stripe } from "../config/stripeConfig";
import { generateToken } from "../utils/jwt";
import dotenv from "dotenv";
import TelegramService from "../services/telegramService";
import { CustomerPortalService } from "../services/customerPortalService";
import { CustomerAuthService } from '../services/customerAuthService';
import { loginSchema, resetPasswordSchema, activateAccountSchema } from '../zod/auth.schema';

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
    const { surname, roomName, isGuest } = req.body;

    if (!surname) {
        responseHandler(res, 400, "Surname is required.");
        return;
    }

    if (!isGuest && !roomName) {
        responseHandler(res, 400, "Room Name is required for existing customers.");
        return;
    }

    try {
        let payload;
        let customerData;

        if (isGuest) {
            // Guest customer flow - create temporary customer directly
            const stripeCustomer = await stripe.customers.create({
                name: `Guest - ${surname}`,
                metadata: {
                    source: 'POS Login - Guest',
                    isGuest: 'true'
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
        } else {
            // Existing customer flow - check for active booking
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

            if (activeBooking) {
                // Existing customer found with matching surname and active booking
                const customer = activeBooking.customer;
                payload = { id: customer.id, email: customer.guestEmail, type: 'CUSTOMER' };
                customerData = customer;
            } else {
                // No active booking found for this surname and room combination
                responseHandler(res, 400, `No active booking found for ${surname} in room ${roomName}. Please check your details or contact reception.`);
                return;
            }
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
            customer = await prisma.customer.findUnique({ 
                where: { id }, 
                include: { 
                    weddingProposals: {
                        select: { id: true }
                    },
                    orders: true
                }
            });
        } else if (type === 'TEMP_CUSTOMER') {
            customer = await prisma.temporaryCustomer.findUnique({ where: { id }, include: { orders: true } });
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
            
            // If assigning to room, find active PaymentIntent to link order
            if (paymentMethod === 'ASSIGN_TO_ROOM') {
                const activePaymentIntent = await prisma.paymentIntent.findFirst({
                    where: {
                        customerId: userId,
                        status: 'SUCCEEDED',
                        isSoftDeleted: false
                    },
                    orderBy: { createdAt: 'desc' }
                });
                
                if (activePaymentIntent) {
                    orderData.paymentIntentId = activePaymentIntent.id;
                }
            }
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

            // Use the same activePaymentIntent we found for the order
            const activePaymentIntent = await prisma.paymentIntent.findFirst({
                where: {
                    customerId: userId,
                    status: 'SUCCEEDED',
                    isSoftDeleted: false
                },
                orderBy: { createdAt: 'desc' }
            });

            await prisma.charge.create({
                data: {
                    amount: total,
                    description: `Room charge for order #${newOrder.id.substring(0, 8)}`,
                    status: 'PENDING',
                    customerId: userId,
                    paymentIntentId: activePaymentIntent?.id || null,
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
                    locationName: newOrder.locationName ?? newOrder.locationNames.join(', '),
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

// Customer Portal Functions
export const getProposalDetails = async (req: express.Request, res: express.Response) => {
    try {
        //@ts-ignore
        const customerId = req.user.id;
        const { proposalId } = req.params;
        const proposal = await CustomerPortalService.getProposalDetails(customerId, proposalId);
        responseHandler(res, 200, "Proposal details retrieved successfully", proposal);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const acceptProposal = async (req: express.Request, res: express.Response) => {
    try {
        //@ts-ignore
        const customerId = req.user.id;
        const { proposalId } = req.params;
        const result = await CustomerPortalService.acceptProposal(customerId, proposalId);
        responseHandler(res, 200, "Proposal accepted successfully", result);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const getPaymentPlan = async (req: express.Request, res: express.Response) => {
    try {
        //@ts-ignore
        const customerId = req.user.id;
        const { proposalId } = req.params;
        const paymentPlan = await CustomerPortalService.getPaymentPlan(customerId, proposalId);
        responseHandler(res, 200, "Payment plan retrieved successfully", paymentPlan);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const confirmFinalGuestNumbers = async (req: express.Request, res: express.Response) => {
    try {
        //@ts-ignore
        const customerId = req.user.id;
        const { proposalId } = req.params;
        const proposal = await CustomerPortalService.confirmFinalGuestNumbers(customerId, proposalId);
        responseHandler(res, 200, "Final guest numbers confirmed successfully", proposal);
    } catch (error) {
        handleError(res, error as Error);
    }
};

// Wedding Portal Authentication Functions
export const weddingPortalLogin = async (req: express.Request, res: express.Response) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const result = await CustomerAuthService.login(email, password);
        
        res.cookie("customertoken", result.token, {
            domain: process.env.NODE_ENV === "local" ? "localhost" : "latorre.farm",
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        responseHandler(res, 200, "Login successful", { user: result.customer });
    } catch (error) {
        if (error instanceof Error) {
            switch(error.message) {
                case 'Invalid credentials':
                    responseHandler(res, 401, "Invalid email or password", { error: 'INVALID_CREDENTIALS' });
                    break;
                case 'Invalid credentials or account not activated':
                    responseHandler(res, 403, "Account not activated or invalid credentials", { 
                        error: 'ACCOUNT_NOT_ACTIVATED',
                        message: 'Please activate your account or check your credentials'
                    });
                    break;
                default:
                    handleError(res, error);
            }
        } else {
            handleError(res, error as Error);
        }
    }
};

export const weddingPortalActivateAccount = async (req: express.Request, res: express.Response) => {
    try {
        const { email, password, token } = activateAccountSchema.parse(req.body);
        const result = await CustomerAuthService.activateAccount(email, password, token);
        
        res.cookie("customertoken", result.token, {
            domain: process.env.NODE_ENV === "local" ? "localhost" : "latorre.farm",
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        responseHandler(res, 200, "Account activated successfully", { user: result.customer });
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const weddingPortalInitiatePasswordReset = async (req: express.Request, res: express.Response) => {
    try {
        const { email } = req.body;
        const result = await CustomerAuthService.initiatePasswordReset(email);
        
        if (result.success) {
            responseHandler(res, 200, "Password reset code has been sent");
        } else {
            responseHandler(res, 404, "User not found", { error: 'USER_NOT_FOUND' });
        }
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const weddingPortalResetPassword = async (req: express.Request, res: express.Response) => {
    try {
        const { email, otp, newPassword } = resetPasswordSchema.parse(req.body);
        await CustomerAuthService.resetPassword(email, otp, newPassword);
        responseHandler(res, 200, "Password reset successful");
    } catch (error) {
        if (error instanceof Error) {
            switch(error.message) {
                case 'OTP_EXPIRED':
                    responseHandler(res, 400, "OTP has expired. Please request a new code.", { error: 'OTP_EXPIRED' });
                    break;
                case 'INVALID_OTP':
                    responseHandler(res, 400, "Invalid OTP. Please check and try again.", { error: 'INVALID_OTP' });
                    break;
                case 'CUSTOMER_NOT_FOUND':
                    responseHandler(res, 404, "No account found with this email.", { error: 'CUSTOMER_NOT_FOUND' });
                    break;
                default:
                    handleError(res, error);
            }
        } else {
            handleError(res, error as Error);
        }
    }
};

export const getAllCustomerProposals = async (req: express.Request, res: express.Response) => {
    try {
        // Get the authenticated customer's ID from the request
        //@ts-ignore
        const customerId = req.user?.id;

        // Fetch all proposals for the customer with full details
        const proposals = await prisma.weddingProposal.findMany({
            where: {
                customerId: customerId,
            },
            include: {
                itineraryDays: {
                    include: {
                        items: {
                            include: {
                                product: true,
                            },
                        },
                    },
                },
                paymentPlan: {
                    include: {
                        stages: true,
                    },
                },
                externalVendors: true,
                serviceRequests: {
                    include: {
                        messages: {
                            include: {
                                attachments: true,
                            },
                            orderBy: {
                                createdAt: 'asc',
                            },
                        },
                    },
                },
            },
            orderBy: {
                weddingDate: 'asc',
            },
        });

        responseHandler(res, 200, 'Proposals retrieved successfully.', proposals);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const updateItinerary = async (req: express.Request, res: express.Response) => {
    try {
        //@ts-ignore
        const customerId = req.user.id;
        const { proposalId } = req.params;
        const { itineraryDays } = req.body;

        if (!itineraryDays || !Array.isArray(itineraryDays)) {
            responseHandler(res, 400, "Invalid itinerary data. Expected an array of itinerary days.");
            return;
        }

        const updatedProposal = await CustomerPortalService.updateItinerary(
            customerId,
            proposalId,
            itineraryDays
        );

        responseHandler(res, 200, "Itinerary updated successfully", updatedProposal);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const updateMainGuestCount = async (req: express.Request, res: express.Response) => {
    try {
        const { proposalId } = req.params;
        const { mainGuestCount } = req.body;
        //@ts-ignore
        const customerId = req.user?.id;

        if (!mainGuestCount || isNaN(Number(mainGuestCount)) || Number(mainGuestCount) <= 0) {
            responseHandler(res, 400, 'Invalid guest count');
            return;
        }

        const updatedProposal = await CustomerPortalService.updateMainGuestCount(
            customerId,
            proposalId,
            Number(mainGuestCount)
        );

        responseHandler(res, 200, 'Guest count updated successfully', updatedProposal);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const createGuestProposal = async (req: express.Request, res: express.Response) => {
    try {
        // @ts-ignore
        const customerId = req.user.id;
        const {
            name,
            weddingDate,
            mainGuestCount,
            holdRequest,
            termsAndConditions
        } = req.body;

        if (!name || !weddingDate || !mainGuestCount) {
            responseHandler(res, 400, 'Name, wedding date, and guest count are required.');
            return;
        }

        let holdExpiresAt: Date | null = null;
        if (holdRequest) {
            holdExpiresAt = new Date();
            holdExpiresAt.setDate(holdExpiresAt.getDate() + 5);
        }

        const newProposal = await prisma.weddingProposal.create({
            data: {
                name,
                weddingDate: new Date(weddingDate),
                mainGuestCount: parseInt(mainGuestCount, 10),
                customerId,
                status: 'DRAFT',
                holdExpiresAt,
                termsAndConditions,
            },
        });

        // Placeholder for creating a TemporaryHold if room information becomes available
        // if (holdRequest && roomId) {
        //     await prisma.temporaryHold.create({...});
        // }

        responseHandler(res, 201, 'Wedding proposal created successfully.', newProposal);

    } catch (error) {
        handleError(res, error as Error);
    }
};