import express from "express";
import prisma from "../prisma";
import { handleError, responseHandler } from "../utils/helper";
import { stripe } from "../config/stripeConfig";
import { generateToken } from "../utils/jwt";
import { generateToken as generateTokenForEventGuest } from "../utils/tokenGenerator";
import dotenv from "dotenv";
import TelegramService from "../services/telegramService";
import { CustomerPortalService } from "../services/customerPortalService";
import { CustomerAuthService } from '../services/customerAuthService';
import { loginSchema, resetPasswordSchema, activateAccountSchema } from '../zod/auth.schema';
import { EmailService } from "../services/emailService";
import { GuestRelationshipService } from "../services/guestRelationshipService";

dotenv.config();

export const createCustomer = async (req: express.Request, res: express.Response) => {
    const { firstName, lastName, middleName, nationality, email, phone, dob, passportExpiry, passportNumber, idCard, vipStatus, totalNigthsStayed, totalMoneySpent, gender, city, placeOfBirth, passportIssuedCountry, receiveMarketingEmail, carNumberPlate, adminNotes } = req.body; 

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
                idCard: idCard,
                guestPhone: phone,
                dob: new Date(dob),
                guestLastName: lastName,
                guestMiddleName: middleName,
                guestNationality: nationality,
                vipStatus,
                totalNightStayed: totalNigthsStayed,
                totalMoneySpent,
                city,
                placeOfBirth,
                gender,
                passportIssuedCountry,
                carNumberPlate,
                tcAgreed: true,
                receiveMarketingEmail,
                adminNotes
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
    const { 
        firstName, 
        lastName, 
        middleName, 
        nationality, 
        email, 
        phone, 
        dob, 
        passportExpiry, 
        passportNumber, 
        passportIssuedCountry,
        idCard,
        gender,
        placeOfBirth,
        city,
        tcAgreed,
        receiveMarketingEmail,
        carNumberPlate,
        vipStatus, 
        totalNigthsStayed, 
        totalMoneySpent,
        adminNotes,
        selectedEnhancements, // New field for enhancements
        bookingId // Booking ID to attach enhancements to
    } = req.body; 

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
                passportExpiry: passportExpiry ? new Date(passportExpiry) : null,
                passportNumber: passportNumber,
                passportIssuedCountry: passportIssuedCountry,
                idCard: idCard,
                guestPhone: phone,
                dob: dob ? new Date(dob) : null,
                guestLastName: lastName,
                guestMiddleName: middleName,
                guestNationality: nationality,
                gender: gender,
                placeOfBirth: placeOfBirth,
                city: city,
                tcAgreed: tcAgreed,
                receiveMarketingEmail: receiveMarketingEmail,
                carNumberPlate: carNumberPlate,
                vipStatus,
                totalNightStayed: totalNigthsStayed,
                totalMoneySpent,
                adminNotes
            }
        });

        // Update GuestCheckInAccess tracking for all bookings this customer is associated with
        const guestAccessRecords = await prisma.guestCheckInAccess.findMany({
            where: {
                customerId: id
            }
        });

        if (guestAccessRecords.length > 0) {
            // Calculate completion status based on updated data
            const personalDetailsComplete = !!(firstName && lastName && email && dob);
            const identityDetailsComplete = !!(nationality && ((passportNumber && passportExpiry && passportIssuedCountry) || idCard));
            const addressDetailsComplete = !!(city);
            
            let completionStatus = 'INCOMPLETE';
            if (personalDetailsComplete && identityDetailsComplete && addressDetailsComplete) {
                completionStatus = 'COMPLETE';
            } else if (personalDetailsComplete || identityDetailsComplete || addressDetailsComplete) {
                completionStatus = 'PARTIAL';
            }

            // Update all GuestCheckInAccess records for this customer
            await prisma.guestCheckInAccess.updateMany({
                where: {
                    customerId: id
                },
                data: {
                    personalDetailsComplete,
                    identityDetailsComplete,
                    addressDetailsComplete,
                    completionStatus: completionStatus as any,
                    checkInCompletedAt: completionStatus === 'COMPLETE' ? new Date() : null,
                    // Update invitation status if they were invited and now completing
                    ...(completionStatus === 'COMPLETE' && {
                        invitationAcceptedAt: new Date()
                    })
                }
            });
        }

        // Handle enhancement bookings if provided
        if (selectedEnhancements && selectedEnhancements.length > 0 && bookingId) {
            try {
                // First, verify the booking belongs to this customer
                const booking = await prisma.booking.findFirst({
                    where: {
                        id: bookingId,
                        customerId: id
                    }
                });

                if (booking) {
                    const enhancementBookings = selectedEnhancements.map((enhancement: any) => ({
                        bookingId: bookingId,
                        enhancementId: enhancement.id,
                        quantity: enhancement.quantity || 1,
                        notes: enhancement.notes || null
                    }));

                    await prisma.enhancementBooking.createMany({
                        data: enhancementBookings
                    });

                    console.log(`Added ${enhancementBookings.length} enhancement bookings for booking ${bookingId}`);
                }
            } catch (enhancementError) {
                console.error('Failed to create enhancement bookings:', enhancementError);
                // Don't fail the whole request if enhancement creation fails
            }
        }

        responseHandler(res, 200, "Updated customer data success");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const getAllCustomers = async (req: express.Request, res: express.Response) => {
    try {
        const customers = await prisma.customer.findMany({
            include: {
                paymentIntents: {
                    where: {
                        status: 'SUCCEEDED',
                        isSoftDeleted: false
                    },
                    include: {
                        bookings: {
                            include: {
                                room: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });
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

export const verifyOnlineCheckInToken = async (req: express.Request, res: express.Response) => {
    const { token } = req.body;

    if (!token) {
        responseHandler(res, 400, "Token is required");
        return;
    }

    try {
        const verifyToken = await prisma.guestCheckInAccess.findUnique({
            where: { accessToken: token },
            include: {
                customer: {
                    select: {
                        id: true,
                        guestFirstName: true,
                        guestLastName: true,
                        guestEmail: true
                    }
                },
                booking: {
                    select: {
                        id: true,
                        checkIn: true,
                        checkOut: true,
                        room: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        if (!verifyToken) {
            responseHandler(res, 400, "Invalid Token");
            return;
        }

        // Check if token has expired
        const now = new Date();
        if (verifyToken.tokenExpiresAt < now) {
            responseHandler(res, 400, "Token has expired");
            return;
        }

        // Update invitation status to ACCEPTED if this is an invited guest
        if (verifyToken.guestType === 'INVITED' && verifyToken.invitationStatus === 'PENDING') {
            await prisma.guestCheckInAccess.update({
                where: {
                    customerId_bookingId: {
                        customerId: verifyToken.customerId,
                        bookingId: verifyToken.bookingId
                    }
                },
                data: {
                    invitationStatus: 'ACCEPTED',
                    invitationAcceptedAt: new Date()
                }
            });
        }

        // Return token verification success with customer and booking data
        const clientToken = generateToken({ 
            customerId: verifyToken.customerId, 
            customerEmail: verifyToken.customer.guestEmail,
            bookingId: verifyToken.bookingId // Include booking ID for context
        })
        res.cookie("onlineCheckInToken", clientToken, {
            domain: process.env.NODE_ENV === "local" ? "localhost" : "latorre.farm",
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        responseHandler(res, 200, "success");
        
    } catch (e) {
        handleError(res, e as Error);
        console.log(e);
    }
}

export const getGuestDetails = async (req: express.Request, res: express.Response) => {
    //@ts-ignore
    const { customerId, bookingId: primaryBookingId } = req.user;

    try {
        // Get all bookings for this customer that they have access to
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: {
                id: true,
                guestFirstName: true,
                guestMiddleName: true,
                guestLastName: true,
                guestEmail: true,
                guestPhone: true,
                guestNationality: true,
                dob: true,
                passportNumber: true,
                passportExpiry: true,
                passportIssuedCountry: true,
                idCard: true,
                gender: true,
                placeOfBirth: true,
                city: true,
                carNumberPlate: true,
                tcAgreed: true,
                receiveMarketingEmail: true
            }
        });

        if (!customer) {
            responseHandler(res, 404, "Customer not found");
            return;
        }

        // Get all bookings this customer has direct access to (they made the booking)
        const ownedBookings = await prisma.booking.findMany({
            where: {
                customerId: customerId,
                status: "CONFIRMED"
            },
            include: {
                room: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        images: {
                            select: {
                                id: true,
                                url: true
                            }
                        },
                        RoomRate: {
                            select: {
                                percentageAdjustment: true,
                                ratePolicy: {
                                    select: {
                                        name: true,
                                        description: true,
                                        cancellationPolicy: true,
                                        refundable: true,
                                        rebookValidityDays: true,
                                        adjustmentPercentage: true
                                    }
                                }
                            },
                            
                        },
                    }
                },
                paymentIntent: {
                    select: {
                        id: true,
                        totalAmount: true,
                        outstandingAmount: true,
                        paymentStructure: true,
                        prepaidAmount: true,
                        remainingAmount: true,
                        remainingDueDate: true,
                        secondPaymentStatus: true,
                        status: true
                    }
                },
                enhancementBookings: true,
                guestCheckInAccess: {
                    include: {
                        customer: {
                            select: {
                                id: true,
                                guestFirstName: true,
                                guestLastName: true,
                                guestMiddleName: true,
                                guestEmail: true,
                                guestPhone: true,
                                guestNationality: true,
                                dob: true,
                                city: true,
                                passportNumber: true,
                                passportExpiry: true,
                                passportIssuedCountry: true,
                                idCard: true
                            }
                        }
                    }
                }
            }
        });

        // Get bookings they have guest access to (invited by other customers)
        const guestAccessRecords = await prisma.guestCheckInAccess.findMany({
            where: {
                customerId: customerId,
                tokenExpiresAt: {
                    gte: new Date()
                },
                booking: {
                    status: "CONFIRMED"
                }
            },
            include: {
                booking: {
                    include: {
                        room: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                images: {
                                    select: {
                                        id: true,
                                        url: true
                                    }
                                },
                                RoomRate: {
                                    select: {
                                        percentageAdjustment: true,
                                        ratePolicy: {
                                            select: {
                                                name: true,
                                                description: true,
                                                cancellationPolicy: true,
                                                refundable: true,
                                                rebookValidityDays: true,
                                                adjustmentPercentage: true
                                            }
                                        }
                                    }
                                }
                               
                            }
                        },
                        enhancementBookings: true,
                        // Include payment intent information for outstanding amounts
                        paymentIntent: {
                            select: {
                                id: true,
                                totalAmount: true,
                                outstandingAmount: true,
                                paymentStructure: true,
                                prepaidAmount: true,
                                remainingAmount: true,
                                remainingDueDate: true,
                                secondPaymentStatus: true,
                                status: true
                            }
                        },
                        // Include all guests for this booking too
                        guestCheckInAccess: {
                            include: {
                                customer: {
                                    select: {
                                        id: true,
                                        guestFirstName: true,
                                        guestLastName: true,
                                        guestMiddleName: true,
                                        guestEmail: true,
                                        guestPhone: true,
                                        guestNationality: true,
                                        dob: true,
                                        city: true,
                                        passportNumber: true,
                                        passportExpiry: true,
                                        passportIssuedCountry: true,
                                        idCard: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Combine all accessible bookings (remove duplicates)
        const allBookings = [...ownedBookings];
        guestAccessRecords.forEach(access => {
            if (access.booking && !allBookings.find(b => b.id === access.booking?.id)) {
                allBookings.push(access.booking);
            }
        });

        if (allBookings.length === 0) {
            responseHandler(res, 404, "No accessible bookings found");
            return;
        }

        // Determine if this customer is the main guest for any booking
        const isMainGuest = ownedBookings.length > 0;

        // Process bookings with guest data and update completion statuses
        const processedBookings = await Promise.all(allBookings.map(async (booking) => {
            // Update completion status for all guests in this booking
            for (const access of booking.guestCheckInAccess) {
                const guestCustomer = access.customer;
                
                const personalDetailsComplete = !!(
                    guestCustomer.guestFirstName && 
                    guestCustomer.guestLastName && 
                    guestCustomer.guestEmail && 
                    guestCustomer.dob
                );
                
                const identityDetailsComplete = !!(
                    guestCustomer.guestNationality && 
                    ((guestCustomer.passportNumber && 
                    guestCustomer.passportExpiry && 
                    guestCustomer.passportIssuedCountry) || 
                    guestCustomer.idCard)
                );
                
                const addressDetailsComplete = !!(guestCustomer.city);
                
                let completionStatus = 'INCOMPLETE';
                if (personalDetailsComplete && identityDetailsComplete && addressDetailsComplete) {
                    completionStatus = 'COMPLETE';
                } else if (personalDetailsComplete || identityDetailsComplete || addressDetailsComplete) {
                    completionStatus = 'PARTIAL';
                }
                
                // Update the database with current completion status
                await prisma.guestCheckInAccess.update({
                    where: {
                        customerId_bookingId: {
                            customerId: access.customerId,
                            bookingId: booking.id
                        }
                    },
                    data: {
                        personalDetailsComplete,
                        identityDetailsComplete,
                        addressDetailsComplete,
                        completionStatus: completionStatus as any,
                        checkInCompletedAt: completionStatus === 'COMPLETE' ? new Date() : null
                    }
                });
            }

            // Get updated guest data with completion status
            const updatedGuestAccess = await prisma.guestCheckInAccess.findMany({
                where: { bookingId: booking.id },
                include: {
                    customer: {
                        select: {
                            id: true,
                            guestFirstName: true,
                            guestLastName: true,
                            guestMiddleName: true,
                            guestEmail: true,
                            guestPhone: true,
                            guestNationality: true,
                            dob: true,
                            city: true,
                            passportNumber: true,
                            passportExpiry: true,
                            passportIssuedCountry: true,
                            idCard: true
                        }
                    }
                }
            });

            // Process guests with completion data
            const guests = updatedGuestAccess.map(access => ({
                id: access.customer.id,
                guestFirstName: access.customer.guestFirstName,
                guestLastName: access.customer.guestLastName,
                guestMiddleName: access.customer.guestMiddleName,
                guestEmail: access.customer.guestEmail,
                guestPhone: access.customer.guestPhone,
                guestNationality: access.customer.guestNationality,
                dob: access.customer.dob,
                city: access.customer.city,
                passportNumber: access.customer.passportNumber,
                passportExpiry: access.customer.passportExpiry,
                passportIssuedCountry: access.customer.passportIssuedCountry,
                idCard: access.customer.idCard,
                // Enhanced tracking fields
                guestType: access.guestType,
                invitationStatus: access.invitationStatus,
                completionStatus: access.completionStatus,
                personalDetailsComplete: access.personalDetailsComplete,
                identityDetailsComplete: access.identityDetailsComplete,
                addressDetailsComplete: access.addressDetailsComplete,
                invitationSentAt: access.invitationSentAt,
                invitationAcceptedAt: access.invitationAcceptedAt,
                checkInCompletedAt: access.checkInCompletedAt,
                addedManuallyAt: access.addedManuallyAt,
                // Legacy fields for compatibility
                addedManually: access.guestType === 'MANUAL',
                invitationPending: access.invitationStatus === 'PENDING',
                addedAt: access.createdAt
            }));

            return {
                ...booking,
                guests: guests
            };
        }));

        // Get available enhancements only if this is the main guest
        let availableEnhancements: any = [];
        if (isMainGuest && allBookings.length > 0) {
            try {
                // Get the first booking's dates for filtering enhancements
                const firstBooking = allBookings[0];
                const checkInDate = new Date(firstBooking.checkIn);
                const checkOutDate = new Date(firstBooking.checkOut);
                
                // Calculate days of week that fall within the booking range
                const daysInRange: string[] = [];
                const currentDate = new Date(checkInDate);
                while (currentDate <= checkOutDate) {
                    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                    if (!daysInRange.includes(dayName)) {
                        daysInRange.push(dayName);
                    }
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                
                // Get all active enhancements with their rules
                const allEnhancements = await prisma.enhancement.findMany({
                    where: { 
                        isActive: true,
                        enhancementRules: {
                            some: {
                                isActive: true,
                                // Check overall validity period
                                OR: [
                                    { validFrom: null, validUntil: null },
                                    { validFrom: { lte: checkOutDate }, validUntil: null },
                                    { validFrom: null, validUntil: { gte: checkInDate } },
                                    { validFrom: { lte: checkOutDate }, validUntil: { gte: checkInDate } }
                                ]
                            }
                        }
                    },
                    include: {
                        enhancementRules: {
                            where: {
                                isActive: true,
                                // Check overall validity period
                                OR: [
                                    { validFrom: null, validUntil: null },
                                    { validFrom: { lte: checkOutDate }, validUntil: null },
                                    { validFrom: null, validUntil: { gte: checkInDate } },
                                    { validFrom: { lte: checkOutDate }, validUntil: { gte: checkInDate } }
                                ]
                            }
                        }
                    }
                });
                
                // Filter enhancements based on their rules' availability
                const filteredEnhancements: any[] = [];
                
                allEnhancements.forEach((enhancement: any) => {
                    // Check if any rule matches the booking criteria
                    const hasMatchingRule = enhancement.enhancementRules.some((rule: any) => {
                        switch (rule.availabilityType) {
                            case 'ALWAYS':
                                return true;
                                
                            case 'WEEKLY':
                                // Check if any of the days in the booking range match the available days
                                if (!rule.availableDays || rule.availableDays.length === 0) {
                                    return false;
                                }
                                return rule.availableDays.some((day: string) => daysInRange.includes(day));
                                
                            case 'SPECIFIC_DATES':
                                // Check if any specific dates fall within the booking range
                                if (!rule.specificDates || rule.specificDates.length === 0) {
                                    return false;
                                }
                                return rule.specificDates.some((date: any) => {
                                    const specificDate = new Date(date);
                                    // Set time to start of day for date comparison
                                    specificDate.setHours(0, 0, 0, 0);
                                    const checkInDateStart = new Date(checkInDate);
                                    checkInDateStart.setHours(0, 0, 0, 0);
                                    const checkOutDateEnd = new Date(checkOutDate);
                                    checkOutDateEnd.setHours(23, 59, 59, 999);
                                    
                                    // Check if the specific date falls within the booking period
                                    return specificDate >= checkInDateStart && specificDate <= checkOutDateEnd;
                                });
                                
                            case 'SEASONAL':
                                // Check if booking dates overlap with the season
                                if (!rule.seasonStart || !rule.seasonEnd) {
                                    return false;
                                }
                                const seasonStart = new Date(rule.seasonStart);
                                const seasonEnd = new Date(rule.seasonEnd);
                                
                                // Check for overlap between booking dates and season dates
                                return !(checkOutDate < seasonStart || checkInDate > seasonEnd);
                                
                            default:
                                // For backward compatibility, if no availabilityType, check availableDays
                                if (rule.availableDays && rule.availableDays.length > 0) {
                                    return rule.availableDays.some((day: string) => daysInRange.includes(day));
                                }
                                return true;
                        }
                    });
                    
                    if (hasMatchingRule) {
                        // Return enhancement with base properties for frontend
                        filteredEnhancements.push({
                            id: enhancement.id,
                            name: enhancement.name, // Changed from title
                            description: enhancement.description,
                            price: enhancement.price,
                            pricingType: enhancement.pricingType,
                            image: enhancement.image,
                            isActive: enhancement.isActive
                        });
                    }
                });
                
                // Collect already booked enhancement IDs from the included data (no extra DB calls)
                const bookedEnhancementIds = new Set<string>();
                allBookings.forEach(booking => {
                    if (booking.enhancementBookings) {
                        booking.enhancementBookings.forEach((eb: any) => {
                            bookedEnhancementIds.add(eb.enhancementId);
                        });
                    }
                });
                
                // Filter out enhancements that are already booked
                availableEnhancements = filteredEnhancements.filter(
                    enhancement => !bookedEnhancementIds.has(enhancement.id)
                );
                
                console.log(`Filtered enhancements: ${allEnhancements.length} total, ${filteredEnhancements.length} match availability, ${availableEnhancements.length} available, ${bookedEnhancementIds.size} already booked`);
            } catch (enhancementError) {
                console.error('Error fetching enhancements:', enhancementError);
                // Continue without enhancements if there's an error
            }
        }

        const checkInData = {
            customer,
            bookings: processedBookings, // Send bookings with included guest data
            isMainGuest: isMainGuest,
            primaryBookingId: primaryBookingId, // Indicates which booking triggered the check-in
            availableEnhancements: availableEnhancements // Only included for main guests
        };

        responseHandler(res, 200, "Guest details retrieved successfully", checkInData);
        
    } catch (e) {
        console.error(e);
        handleError(res, e as Error);
    }
}

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
                booking.customer.guestLastName && booking.customer.guestLastName.toLowerCase() === surname.toLowerCase()
            );

            if (activeBooking) {
                // Existing customer found with matching surname and active booking
                const customer = activeBooking.customer;
                
                // Find the PaymentIntent for this specific booking
                const paymentIntent = await prisma.paymentIntent.findFirst({
                    where: {
                        customerId: customer.id,
                        bookings: {
                            some: {
                                id: activeBooking.id
                            }
                        },
                        status: 'SUCCEEDED',
                        isSoftDeleted: false
                    }
                });
                
                payload = { 
                    id: customer.id, 
                    email: customer.guestEmail, 
                    type: 'CUSTOMER',
                    ...(paymentIntent && { paymentIntentId: paymentIntent.id })
                };
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
                 
        responseHandler(res, 200, "Verification successful", { user: customerData });

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
    const { location, isAdmin } = req.query;

    console.log(typeof isAdmin)

    if (!location) {
        responseHandler(res, 400, "location is required.");
        return;
    }

    try {
        const orderItems = await prisma.location.findUnique({
            where: { name: location as string },
            include: {
                orderCategories: {
                    where: {
                        onlyForAdmin: false
                    },
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
    const { id: userId, type: userType, paymentIntentId } = req.user;
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
            
            // If assigning to room, use paymentIntentId from JWT token
            if (paymentMethod === 'ASSIGN_TO_ROOM') {
                if (!paymentIntentId) {
                    responseHandler(res, 403, "No active booking found. Please log in again with your room details.");
                    return;
                }
                orderData.paymentIntentId = paymentIntentId;
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

            // Create the charge
            await prisma.charge.create({
                data: {
                    amount: total,
                    description: `Room charge for order #${newOrder.id.substring(0, 8)}`,
                    status: 'PENDING',
                    customerId: userId,
                    paymentIntentId: paymentIntentId,
                    orderId: newOrder.id,
                }
            });

            // Update PaymentIntent outstanding amount when room charge is created
            if (paymentIntentId) {
                await prisma.paymentIntent.update({
                    where: { id: paymentIntentId },
                    data: {
                        outstandingAmount: {
                            increment: total
                        }   
                    }
                });
            }
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

export const createManualGuest = async (req: express.Request, res: express.Response) => {
    const { customerId , customerEmail } = (req as any).user;
    const { 
        bookingId,
        firstName, 
        lastName, 
        middleName, 
        email, 
        telephone, 
        nationality, 
        dateOfBirth, 
        city, 
        passportNumber,
        passportExpiryDate,
        passportIssuedCountry,
        idCard,
        relationshipType,
        saveAsRelation
    } = req.body;

    if (!customerId) {
        responseHandler(res, 401, "Unauthorized - Please log in");
        return;
    }

    if (!bookingId || !firstName || !lastName || !email) {
        responseHandler(res, 400, "Missing required fields");
        return;
    }

    if (customerEmail === email) {
        responseHandler(res, 400, 'Cannot Add Yourself');
        return;
    }

    try {
        // Verify that the booking belongs to the authenticated customer
        const firstBooking = await prisma.booking.findFirst({
            where: {
                id: bookingId,
                customerId: customerId
            }
        });

        if (!firstBooking) {
            responseHandler(res, 404, "Booking not found or doesn't belong to you");
            return;
        }

        // Create or update the guest customer record
        const guestCustomer = await prisma.customer.upsert({
            where: {
                guestEmail: email
            },
            create: {
                guestFirstName: firstName,
                guestLastName: lastName,
                guestMiddleName: middleName || null,
                guestEmail: email,
                guestPhone: telephone || null,
                guestNationality: nationality || null,
                dob: dateOfBirth ? new Date(dateOfBirth) : null,
                city: city || null,
                passportNumber: passportNumber || null,
                passportExpiry: passportExpiryDate ? new Date(passportExpiryDate) : null,
                passportIssuedCountry: passportIssuedCountry || null,
                idCard: idCard || null,
            },
            update: {
                guestFirstName: firstName,
                guestLastName: lastName,
                guestMiddleName: middleName || null,
                guestPhone: telephone || null,
                guestNationality: nationality || null,
                dob: dateOfBirth ? new Date(dateOfBirth) : null,
                city: city || null,
                passportNumber: passportNumber || null,
                passportExpiry: passportExpiryDate ? new Date(passportExpiryDate) : null,
                passportIssuedCountry: passportIssuedCountry || null,
                idCard: idCard || null,
            }
        });

        // Link the guest to the booking using GuestCheckInAccess table
        // Set token expiry to the day after booking check-in date
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        const tokenExpiresAt = new Date(booking!.checkIn);
        tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 1);
        tokenExpiresAt.setHours(23, 59, 59, 999);

        // Calculate completion status based on provided data
        const personalDetailsComplete = !!(firstName && lastName && email && dateOfBirth);
        const identityDetailsComplete = !!(nationality && ((passportNumber && passportExpiryDate && passportIssuedCountry) || idCard));
        const addressDetailsComplete = !!(city);
        
        let completionStatus = 'INCOMPLETE';
        if (personalDetailsComplete && identityDetailsComplete && addressDetailsComplete) {
            completionStatus = 'COMPLETE';
        } else if (personalDetailsComplete || identityDetailsComplete || addressDetailsComplete) {
            completionStatus = 'PARTIAL';
        }

        await prisma.guestCheckInAccess.upsert({
            where: {
                customerId_bookingId: {
                    customerId: guestCustomer.id,
                    bookingId: bookingId
                }
            },
            create: {
                customerId: guestCustomer.id,
                bookingId: bookingId,
                accessToken: `manual-guest-${guestCustomer.id}`, // Special token for manual guests
                tokenExpiresAt: tokenExpiresAt,
                guestType: 'MANUAL',
                invitationStatus: 'NOT_APPLICABLE',
                completionStatus: completionStatus as any,
                personalDetailsComplete,
                identityDetailsComplete,
                addressDetailsComplete,
                addedManuallyBy: customerId,
                addedManuallyAt: new Date(),
                checkInCompletedAt: completionStatus === 'COMPLETE' ? new Date() : null
            },
            update: {
                guestType: 'MANUAL',
                invitationStatus: 'NOT_APPLICABLE',
                completionStatus: completionStatus as any,
                personalDetailsComplete,
                identityDetailsComplete,
                addressDetailsComplete,
                addedManuallyBy: customerId,
                addedManuallyAt: new Date(),
                checkInCompletedAt: completionStatus === 'COMPLETE' ? new Date() : null
            }
        });

        // Create relationship if requested
        if (saveAsRelation && relationshipType && guestCustomer.id !== customerId) {
            try {
                await GuestRelationshipService.createRelationship(
                    customerId,
                    guestCustomer.id,
                    relationshipType as any,
                    true // Allow booking permissions by default
                );
            } catch (relationshipError) {
                // Log the error but don't fail the guest creation
                console.error("Error creating relationship:", relationshipError);
            }
        }

        responseHandler(res, 200, "Guest created successfully", guestCustomer);

    } catch (error) {
        console.error("Error creating manual guest:", error);
        handleError(res, error as Error);
    }
};

export const inviteBookingGuest = async (req: express.Request, res: express.Response) => {
    const { customerId } = (req as any).user; 
    const { bookingId, firstName, lastName, email, relationshipType, saveAsRelation } = req.body;

    if (!bookingId || !firstName || !lastName || !email) {
        responseHandler(res, 400, "Missing required fields");
        return;
    }

    try {
        // Verify that the booking belongs to the authenticated customer
        const booking = await prisma.booking.findFirst({
            where: {
                id: bookingId,
                customerId: customerId
            },
            include: {
                room: true
            }
        });

        if (!booking) {
            responseHandler(res, 404, "Booking not found or doesn't belong to you");
            return;
        }

        // Get inviter details
        const inviter = await prisma.customer.findUnique({
            where: { id: customerId }
        });

        if (!inviter) {
            responseHandler(res, 404, "Inviter not found");
            return;
        }

        if (inviter.guestEmail === email) {
            responseHandler(res, 400, "Cannot Invite Yourself");
            return;
        }

        // Create or update a guest customer record
        const guestCustomer = await prisma.customer.upsert({
            where: {
                guestEmail: email
            },
            create: {
                guestFirstName: firstName,
                guestLastName: lastName,
                guestEmail: email,
                guestPhone: ""
            },
            update: {
                guestFirstName: firstName,
                guestLastName: lastName
            }
        });

        
       
        const token = require('crypto').randomBytes(32).toString('hex');
        const tokenExpiresAt = new Date(booking.checkIn);
        tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 1);
        tokenExpiresAt.setHours(23, 59, 59, 999);

        // Create guest check-in access record
        await prisma.guestCheckInAccess.upsert({
            where: {
                customerId_bookingId: {
                    customerId: guestCustomer.id,
                    bookingId: booking.id
                }
            },
            create: {
                customerId: guestCustomer.id,
                bookingId: booking.id,
                accessToken: token,
                tokenExpiresAt: tokenExpiresAt,
                guestType: 'INVITED',
                invitationStatus: 'PENDING',
                completionStatus: 'INCOMPLETE',
                personalDetailsComplete: false,
                identityDetailsComplete: false,
                addressDetailsComplete: false,
                invitationSentAt: new Date()
            },
            update: {
                accessToken: token,
                tokenExpiresAt: tokenExpiresAt,
                guestType: 'INVITED',
                invitationStatus: 'PENDING',
                invitationSentAt: new Date()
            }
        }); 

        // Create the online check-in URL
        const baseUrl = process.env.NODE_ENV === 'local' ? process.env.FRONTEND_DEV_URL : process.env.FRONTEND_PROD_URL;
        const checkinUrl = `${baseUrl}/online-checkin/${token}`;

        // Send invitation email
        await EmailService.sendEmail({
            to: {
                email: email,
                name: `${firstName} ${lastName}`
            },
            templateType: "GUEST_CHECKIN_INVITATION",
            templateData: {
                guestName: `${firstName} ${lastName}`,
                inviterName: `${inviter.guestFirstName} ${inviter.guestLastName}`,
                roomName: booking.room?.name || "your room",
                checkinUrl: checkinUrl,
                checkInDate: new Date(booking.checkIn).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                checkOutDate: new Date(booking.checkOut).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
            }
        });

        // Create relationship if requested
        if (saveAsRelation && relationshipType && guestCustomer.id !== customerId) {
            try {
                await GuestRelationshipService.createRelationship(
                    customerId,
                    guestCustomer.id,
                    relationshipType as any,
                    true // Allow booking permissions by default
                );
            } catch (relationshipError) {
                // Log the error but don't fail the guest creation
                console.error("Error creating relationship:", relationshipError);
            }
        }

        responseHandler(res, 200, "Guest invitation sent successfully", {
            guest: {
                id: guestCustomer.id,
                firstName: guestCustomer.guestFirstName,
                lastName: guestCustomer.guestLastName,
                email: guestCustomer.guestEmail,
                invitationSent: true
            }
        });

    } catch (error) {
        console.error("Error inviting booking guest:", error);
        handleError(res, error as Error);
    }
};

export const deleteGuest = async (req: express.Request, res: express.Response) => {
    const { customerId } = (req as any).user;
    const { bookingId, guestId } = req.params;
    
    
    if (!bookingId || !guestId) {
        responseHandler(res, 400, "Missing booking ID or guest ID");
        return;
    }
    
    try {
        // Verify that the booking belongs to the authenticated customer
        const booking = await prisma.booking.findFirst({
            where: {
                id: bookingId,
                customerId: customerId
            }
        });
        
        if (!booking) {
            responseHandler(res, 404, "Booking not found or doesn't belong to you");
            return;
        }
        
        // Check if the guest access exists
        const guestAccess = await prisma.guestCheckInAccess.findFirst({
            where: {
                customerId: guestId,
                bookingId: bookingId
            }
        });
        
        if (!guestAccess) {
            responseHandler(res, 404, "Guest not found for this booking");
            return;
        }
        
        // Prevent deletion of main guest
        if (guestAccess.isMainGuest) {
            responseHandler(res, 400, "Cannot delete the main guest");
            return;
        }
        
        // Delete the guest access record
        await prisma.guestCheckInAccess.delete({
            where: {
                customerId_bookingId: {
                    customerId: guestId,
                    bookingId: bookingId
                }
            }
        });
        
        responseHandler(res, 200, "Guest deleted successfully");
        
    } catch (error) {
        console.error("Error deleting guest:", error);
        handleError(res, error as Error);
    }
};

export const applyGuestToAllBookings = async (req: express.Request, res: express.Response) => {
    const { customerId } = (req as any).user;
    const { 
        guestData, 
        excludeBookingId 
    } = req.body;
    
    if (!guestData) {
        responseHandler(res, 400, "Guest data is required");
        return;
    }
    
    try {
        // Extract the actual guest data from nested structure
        const actualGuestData = guestData.data || guestData;
        
        // Get all confirmed bookings for this customer (excluding the specified booking)
        const bookings = await prisma.booking.findMany({
            where: {
                customerId: customerId,
                status: "CONFIRMED",
                ...(excludeBookingId && {
                    id: {
                        not: excludeBookingId
                    }
                })
            }
        });
        
        if (bookings.length === 0) {
            responseHandler(res, 200, "No other bookings to apply guest to");
            return;
        }
        
        const results = [];
        
        for (const booking of bookings) {
            try {
                // Create or update a guest customer record
                const guestCustomer = await prisma.customer.upsert({
                    where: {
                        guestEmail: actualGuestData.guestEmail
                    },
                    create: {
                        guestFirstName: actualGuestData.guestFirstName,
                        guestLastName: actualGuestData.guestLastName,
                        guestMiddleName: actualGuestData.guestMiddleName || null,
                        guestEmail: actualGuestData.guestEmail,
                        guestPhone: actualGuestData.guestPhone || null,
                        guestNationality: actualGuestData.guestNationality || null,
                        dob: actualGuestData.dob ? new Date(actualGuestData.dob) : null,
                        city: actualGuestData.city || null,
                        passportNumber: actualGuestData.passportNumber || null,
                        passportExpiry: actualGuestData.passportExpiry ? new Date(actualGuestData.passportExpiry) : null,
                        passportIssuedCountry: actualGuestData.passportIssuedCountry || null,
                        idCard: actualGuestData.idCard || null,
                    },
                    update: {
                        guestFirstName: actualGuestData.guestFirstName,
                        guestLastName: actualGuestData.guestLastName,
                        guestMiddleName: actualGuestData.guestMiddleName || null,
                        guestPhone: actualGuestData.guestPhone || null,
                        guestNationality: actualGuestData.guestNationality || null,
                        dob: actualGuestData.dob ? new Date(actualGuestData.dob) : null,
                        city: actualGuestData.city || null,
                        passportNumber: actualGuestData.passportNumber || null,
                        passportExpiry: actualGuestData.passportExpiry ? new Date(actualGuestData.passportExpiry) : null,
                        passportIssuedCountry: actualGuestData.passportIssuedCountry || null,
                        idCard: actualGuestData.idCard || null,
                    }
                });
                
                // Set token expiry to the day after booking check-in date
                const tokenExpiresAt = new Date(booking.checkIn);
                tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 1);
                tokenExpiresAt.setHours(23, 59, 59, 999);
                
                // Calculate completion status based on provided data
                const personalDetailsComplete = !!(actualGuestData.guestFirstName && actualGuestData.guestLastName && actualGuestData.guestEmail && actualGuestData.dob);
                const identityDetailsComplete = !!(actualGuestData.guestNationality && ((actualGuestData.passportNumber && actualGuestData.passportExpiry && actualGuestData.passportIssuedCountry) || actualGuestData.idCard));
                const addressDetailsComplete = !!(actualGuestData.city);
                
                let completionStatus = 'INCOMPLETE';
                if (personalDetailsComplete && identityDetailsComplete && addressDetailsComplete) {
                    completionStatus = 'COMPLETE';
                } else if (personalDetailsComplete || identityDetailsComplete || addressDetailsComplete) {
                    completionStatus = 'PARTIAL';
                }
                
                // Link the guest to this booking
                await prisma.guestCheckInAccess.upsert({
                    where: {
                        customerId_bookingId: {
                            customerId: guestCustomer.id,
                            bookingId: booking.id
                        }
                    },
                    create: {
                        customerId: guestCustomer.id,
                        bookingId: booking.id,
                        accessToken: `replicated-guest-${guestCustomer.id}-${booking.id}-${Date.now()}`,
                        tokenExpiresAt: tokenExpiresAt,
                        guestType: 'MANUAL',
                        invitationStatus: 'NOT_APPLICABLE',
                        completionStatus: completionStatus as any,
                        personalDetailsComplete,
                        identityDetailsComplete,
                        addressDetailsComplete,
                        addedManuallyBy: customerId,
                        addedManuallyAt: new Date(),
                        checkInCompletedAt: completionStatus === 'COMPLETE' ? new Date() : null
                    },
                    update: {
                        guestType: 'MANUAL',
                        invitationStatus: 'NOT_APPLICABLE',
                        completionStatus: completionStatus as any,
                        personalDetailsComplete,
                        identityDetailsComplete,
                        addressDetailsComplete,
                        addedManuallyBy: customerId,
                        addedManuallyAt: new Date(),
                        checkInCompletedAt: completionStatus === 'COMPLETE' ? new Date() : null
                    }
                });
                
                results.push({
                    bookingId: booking.id,
                    success: true,
                    message: `Guest added to booking ${booking.id}`
                });
                
            } catch (bookingError) {
                console.error(`Error adding guest to booking ${booking.id}:`, bookingError);
                results.push({
                    bookingId: booking.id,
                    success: false,
                    message: `Failed to add guest to booking ${booking.id}`
                });
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        
        responseHandler(res, 200, `Guest applied to ${successCount}/${totalCount} bookings`, {
            results,
            summary: {
                total: totalCount,
                successful: successCount,
                failed: totalCount - successCount
            }
        });
        
    } catch (error) {
        console.error("Error applying guest to all bookings:", error);
        handleError(res, error as Error);
    }
};

// Guest Relationship Controllers
export const createNewRelationships = async (req: express.Request, res: express.Response) => {
    try {
        const { relatedCustomerId, relationshipType, canBookFor = true } = req.body;
        //@ts-ignore
        const { customerId } = req.user;

        if (!relatedCustomerId || !relationshipType) {
            return responseHandler(res, 400, "Related customer ID and relationship type are required");
        }

        const result = await GuestRelationshipService.createRelationship(
            customerId,
            relatedCustomerId,
            relationshipType,
            canBookFor
        );

        responseHandler(res, 201, "Relationship created successfully", result);
    } catch (error) {
        console.error("Error creating relationship:", error);
        handleError(res, error as Error);
    }
};

export const deleteRelationships = async (req: express.Request, res: express.Response) => {
    try {
        const { id: relatedCustomerId } = req.params;
        //@ts-ignore
        const { customerId } = req.user;

        if (!relatedCustomerId) {
            return responseHandler(res, 400, "Related customer ID is required");
        }

        const result = await GuestRelationshipService.removeRelationship(customerId, relatedCustomerId);

        responseHandler(res, 200, "Relationship removed successfully", result);
    } catch (error) {
        console.error("Error removing relationship:", error);
        handleError(res, error as Error);
    }
};

export const quickAddGuests = async (req: express.Request, res: express.Response) => {
    try {
        const { relatedCustomerIds, bookingId } = req.body;
        //@ts-ignore
        const { customerId: bookerId } = req.user;

        if (!Array.isArray(relatedCustomerIds) || relatedCustomerIds.length === 0) {
            return responseHandler(res, 400, "Related customer IDs array is required");
        }

        if (!bookingId) {
            return responseHandler(res, 400, "Booking ID is required");
        }

        const result = await GuestRelationshipService.quickAddRelatedGuests(
            bookerId,
            relatedCustomerIds,
            bookingId
        );

        responseHandler(res, 200, "Related guests added successfully", result);
    } catch (error) {
        console.error("Error quick adding related guests:", error);
        handleError(res, error as Error);
    }
};

export const getRelatedGuests = async (req: express.Request, res: express.Response) => {
    try {
        //@ts-ignore
        const { customerId } = req.user ;
        const includeDetails = req.query.includeDetails !== 'false';

        const result = await GuestRelationshipService.getRelatedGuests(customerId, includeDetails);

        responseHandler(res, 200, "Related guests retrieved successfully", result);
    } catch (error) {
        console.error("Error fetching related guests:", error);
        handleError(res, error as Error);
    }
};

export const searchCustomersForRelationship = async (req: express.Request, res: express.Response) => {
    try {
        const { q: searchTerm, limit = '10' } = req.query;
        //@ts-ignore
        const { customerId } = req.user;

        if (!searchTerm || typeof searchTerm !== 'string') {
            return responseHandler(res, 400, "Search term is required");
        }

        const result = await GuestRelationshipService.searchCustomersForRelationship(
            searchTerm,
            customerId,
            parseInt(limit as string)
        );

        responseHandler(res, 200, "Customers retrieved successfully", result);
    } catch (error) {
        console.error("Error searching customers:", error);
        handleError(res, error as Error);
    }
};

export const getRelationshipStats = async (req: express.Request, res: express.Response) => {
    try {
        //@ts-ignore
        const { customerId } = req.user;

        const result = await GuestRelationshipService.getRelationshipStats(customerId);

        responseHandler(res, 200, "Relationship stats retrieved successfully", result);
    } catch (error) {
        console.error("Error fetching relationship stats:", error);
        handleError(res, error as Error);
    }
};

// Admin endpoints for managing customer relationships
export const getCustomerRelationshipsAdmin = async (req: express.Request, res: express.Response) => {
    try {
        const { id: customerId } = req.params;

        if (!customerId) {
            return responseHandler(res, 400, "Customer ID is required");
        }

        const relationships = await GuestRelationshipService.getRelatedGuests(customerId, true);

        responseHandler(res, 200, "Customer relationships retrieved successfully", relationships);
    } catch (error) {
        console.error("Error fetching customer relationships:", error);
        handleError(res, error as Error);
    }
};

export const removeCustomerRelationshipAdmin = async (req: express.Request, res: express.Response) => {
    try {
        const { id: customerId, relatedId } = req.params;

        if (!customerId || !relatedId) {
            return responseHandler(res, 400, "Customer ID and related customer ID are required");
        }

        const result = await GuestRelationshipService.removeRelationship(customerId, relatedId);

        responseHandler(res, 200, "Relationship removed successfully", result);
    } catch (error) {
        console.error("Error removing relationship:", error);
        handleError(res, error as Error);
    }
};

export const updateCustomerAdminNotes = async (req: express.Request, res: express.Response) => {
    try {
        const { id: customerId } = req.params;
        const { adminNotes } = req.body;

        if (!customerId) {
            return responseHandler(res, 400, "Customer ID is required");
        }

        const updatedCustomer = await prisma.customer.update({
            where: { id: customerId },
            data: { adminNotes },
            select: {
                id: true,
                adminNotes: true
            }
        });

        responseHandler(res, 200, "Admin notes updated successfully", updatedCustomer);
    } catch (error) {
        console.error("Error updating admin notes:", error);
        handleError(res, error as Error);
    }
};

// Event Invitation Controllers
export const verifyEventInvitation = async (req: express.Request, res: express.Response) => {
    const { token } = req.params;

    if (!token) {
        responseHandler(res, 400, "Invitation token is required");
        return;
    }

    try {
        // Find the invitation by token
        const invitation = await prisma.eventInvitation.findUnique({
            where: { invitationToken: token },
            include: {
                event: {
                    include: {
                        eventEnhancements: {
                            include: {
                                enhancement: true
                            }
                        }
                    }
                },
                customer: {
                    select: {
                        id: true,
                        guestFirstName: true,
                        guestLastName: true,
                        guestEmail: true
                    }
                },
                booking: {
                    include: {
                        room: true
                    }
                }
            }
        });

        if (!invitation) {
            responseHandler(res, 404, "Invalid invitation token");
            return;
        }

        // Check if token has expired
        const now = new Date();
        if (invitation.tokenExpiresAt < now) {
            responseHandler(res, 400, "Invitation has expired. Please contact the hotel for assistance.", {
                status: 'EXPIRED'
            });
            return;
        }

        // Check if already responded
        if (invitation.invitationStatus === 'ACCEPTED') {
            responseHandler(res, 200, "You have already accepted this invitation", {
                status: 'ALREADY_ACCEPTED',
                invitation: {
                    id: invitation.id,
                    isMainGuest: invitation.isMainGuest,
                    invitationStatus: invitation.invitationStatus
                },
                event: invitation.event,
                booking: invitation.booking
            });
            return;
        }

        if (invitation.invitationStatus === 'DECLINED') {
            responseHandler(res, 200, "You have already declined this invitation", {
                status: 'ALREADY_DECLINED',
                invitation: {
                    id: invitation.id,
                    isMainGuest: invitation.isMainGuest,
                    invitationStatus: invitation.invitationStatus
                },
                event: invitation.event,
                booking: invitation.booking
            });
            return;
        }

        // Return invitation details
        responseHandler(res, 200, "Invitation verified successfully", {
            status: 'VALID',
            invitation: {
                id: invitation.id,
                event: invitation.event,
                customer: invitation.customer,
                booking: invitation.booking,
                isMainGuest: invitation.isMainGuest
            }
        });

    } catch (error) {
        console.error("Error verifying event invitation:", error);
        handleError(res, error as Error);
    }
};

export const acceptEventInvitation = async (req: express.Request, res: express.Response) => {
    const { token } = req.params;
    const { enhancementId } = req.body; // Enhancement selection for the event

    if (!token) {
        responseHandler(res, 400, "Invitation token is required");
        return;
    }

    try {
        // Find the invitation by token
        const invitation = await prisma.eventInvitation.findUnique({
            where: { invitationToken: token },
            include: {
                event: {
                    include: {
                        eventEnhancements: {
                            include: {
                                enhancement: true
                            }
                        }
                    }
                },
                customer: true,
                booking: {
                    include: {
                        paymentIntent: true
                    }
                }
            }
        });

        if (!invitation) {
            responseHandler(res, 404, "Invalid invitation token");
            return;
        }

        // Check if token has expired
        const now = new Date();
        if (invitation.tokenExpiresAt < now) {
            responseHandler(res, 400, "Invitation has expired. Please contact the hotel for assistance.");
            return;
        }

        // Check if already responded
        if (invitation.invitationStatus !== 'PENDING') {
            responseHandler(res, 400, `You have already ${invitation.invitationStatus.toLowerCase()} this invitation`);
            return;
        }

        // Verify the booking has a payment intent
        if (!invitation.booking.paymentIntent) {
            responseHandler(res, 400, "No payment information found for this booking");
            return;
        }

        // If enhancement is specified, verify it exists in the event
        let selectedEnhancementId = enhancementId;
        if (!selectedEnhancementId && invitation.event.eventEnhancements.length > 0) {
            // Default to first enhancement if none selected
            selectedEnhancementId = invitation.event.eventEnhancements[0].enhancementId;
        }

        if (!selectedEnhancementId) {
            responseHandler(res, 400, "No enhancement available for this event");
            return;
        }

        // Find the selected enhancement to get price
        const selectedEventEnhancement = invitation.event.eventEnhancements.find(
            ee => ee.enhancementId === selectedEnhancementId
        );
        if (!selectedEventEnhancement) {
            responseHandler(res, 400, "Invalid enhancement selected");
            return;
        }

        // Get the price (tax is already included in the price)
        const totalPrice = selectedEventEnhancement.overridePrice || selectedEventEnhancement.enhancement.price;

            await prisma.$transaction(async (tx) => {
            // Update invitation status
            const updatedInvitation = await tx.eventInvitation.update({
                where: { id: invitation.id },
                data: {
                    invitationStatus: 'ACCEPTED',
                    acceptedAt: new Date()
                }
            });

            // Check if participant already exists
            const existingParticipant = await tx.eventParticipant.findUnique({
                where: {
                    eventId_bookingId_customerId_enhancementId: {
                        eventId: invitation.eventId,
                        bookingId: invitation.bookingId,
                        customerId: invitation.customerId,
                        enhancementId: selectedEnhancementId
                    }
                }
            });

            let participant;
            if (existingParticipant) {
                // Update existing participant
                participant = await tx.eventParticipant.update({
                    where: { id: existingParticipant.id },
                    data: {
                        status: 'COMPLETED',
                        updatedAt: new Date(),
                        addedBy: 'GUEST', // Added by the guest themselves via invitation,
                        participantType: invitation.isMainGuest ? 'MAIN_GUEST' : 'GUEST',
                    }
                });
            } else {
                // Create event participant record (only created when invitation is ACCEPTED)
                // EventParticipant tracks actual participation, not invitation responses
                participant = await tx.eventParticipant.create({
                    data: {
                        eventId: invitation.eventId,
                        customerId: invitation.customerId,
                        bookingId: invitation.bookingId,
                        //@ts-ignore
                        paymentIntentId: invitation.booking.paymentIntent.id,
                        enhancementId: selectedEnhancementId,
                        participantType: invitation.isMainGuest ? 'MAIN_GUEST' : 'GUEST',
                        status: 'COMPLETED', // Will be COMPLETED when they attend the event
                        addedBy: 'GUEST', // Added by the guest themselves via invitation
                        notes: 'Accepted event invitation'
                    }
                });

                // Update event total guests count and revenue
                await tx.event.update({
                    where: { id: invitation.eventId },
                    data: {
                        totalGuests: {
                            increment: 1
                        },
                        totalRevenue: {
                            increment: totalPrice
                        }
                    }
                });

                // Update payment intent outstanding amount
                if (invitation.booking.paymentIntent) {
                    const currentOutstanding = invitation.booking.paymentIntent.outstandingAmount || 0;
                    await tx.paymentIntent.update({
                        where: { id: invitation.booking.paymentIntent.id },
                        data: {
                            outstandingAmount: currentOutstanding + totalPrice
                        }
                    });
                }
            }

            return { invitation: updatedInvitation, participant };
        });

        responseHandler(res, 200, "Event invitation accepted successfully", {
            status: 'SUCCESS',
            message: "You have successfully confirmed your attendance!",
            eventName: invitation.event.name,
            eventDate: invitation.event.eventDate
        });

    } catch (error) {
        console.error("Error accepting event invitation:", error);
        handleError(res, error as Error);
    }
};

export const declineEventInvitation = async (req: express.Request, res: express.Response) => {
    const { token } = req.params;
    const { reason } = req.body; // Optional reason for declining

    if (!token) {
        responseHandler(res, 400, "Invitation token is required");
        return;
    }

    try {
        // Find the invitation by token
        const invitation = await prisma.eventInvitation.findUnique({
            where: { invitationToken: token },
            include: {
                event: {
                    include: {
                        eventEnhancements: true
                    }
                },
                customer: true
            }
        });

        if (!invitation) {
            responseHandler(res, 404, "Invalid invitation token");
            return;
        }

        // Check if token has expired
        const now = new Date();
        if (invitation.tokenExpiresAt < now) {
            responseHandler(res, 400, "Invitation has expired. Please contact the hotel for assistance.");
            return;
        }

        // Check if already responded
        if (invitation.invitationStatus !== 'PENDING') {
            responseHandler(res, 400, `You have already ${invitation.invitationStatus.toLowerCase()} this invitation`);
            return;
        }

        // Check if there's an existing participant record (if they were previously accepted)
        const existingParticipant = await prisma.eventParticipant.findUnique({
            where: {
                eventId_bookingId_customerId_enhancementId: {
                    eventId: invitation.eventId,
                    bookingId: invitation.bookingId,
                    customerId: invitation.customerId,
                    enhancementId: invitation.event.eventEnhancements[0]?.enhancementId || ''
                }
            },
            include: {
                enhancement: true
            }
        });

        // Transaction to handle decline and cleanup
        await prisma.$transaction(async (tx) => {
            // Update invitation status to DECLINED
            await tx.eventInvitation.update({
                where: { id: invitation.id },
                data: {
                    invitationStatus: 'DECLINED',
                    declinedAt: new Date()
                }
            });

            // If participant exists (they previously accepted), remove them and update counts
            if (existingParticipant) {
                const enhancementPrice = existingParticipant.enhancement?.price || 0;
                
                // Delete the participant record
                await tx.eventParticipant.delete({
                    where: { id: existingParticipant.id }
                });

                // Update event total guests and revenue
                await tx.event.update({
                    where: { id: invitation.eventId },
                    data: {
                        totalGuests: {
                            decrement: 1
                        },
                        totalRevenue: {
                            decrement: enhancementPrice
                        }
                    }
                });

                // Get booking with payment intent
                const booking = await tx.booking.findUnique({
                    where: { id: invitation.bookingId },
                    include: { paymentIntent: true }
                });

                // Update payment intent outstanding amount
                if (booking?.paymentIntent && enhancementPrice > 0) {
                    const currentOutstanding = booking.paymentIntent.outstandingAmount || 0;
                    await tx.paymentIntent.update({
                        where: { id: booking.paymentIntent.id },
                        data: {
                            outstandingAmount: Math.max(0, currentOutstanding - enhancementPrice)
                        }
                    });
                }
            }
        });

        // Log the decline reason if provided (optional - could store in audit log)
        if (reason) {
            console.log(`Event invitation declined for ${invitation.event.name} by ${invitation.customer.guestEmail}. Reason: ${reason}`);
        }

        responseHandler(res, 200, "Event invitation declined", {
            status: 'SUCCESS',
            message: "You have declined the event invitation. We hope to see you at future events!",
            eventName: invitation.event.name
        });

    } catch (error) {
        console.error("Error declining event invitation:", error);
        handleError(res, error as Error);
    }
};

export const addGuestToEvent = async (req: express.Request, res: express.Response) => {
    const { token } = req.params;
    const { customerId } = req.body;
     
    if (!token) {
        responseHandler(res, 400, "Invitation token is required");
        return;
    }

    if (!customerId) {
        responseHandler(res, 400, "Customer ID is required");
        return;
    }

    try {
        // Find the main guest's invitation by token
        const mainGuestInvitation = await prisma.eventInvitation.findUnique({
            where: { invitationToken: token },
            include: {
                event: {
                    include: {
                        eventEnhancements: {
                            include: {
                                enhancement: true
                            }
                        }
                    }
                },
                customer: true,
                booking: {
                    include: {
                        paymentIntent: true
                    }
                }
            }
        });

        if (!mainGuestInvitation) {
            responseHandler(res, 404, "Invalid invitation token");
            return;
        }

        // Check if the requester is the main guest
        if (!mainGuestInvitation.isMainGuest) {
            responseHandler(res, 403, "Only the main guest can add additional guests");
            return;
        }

        // Check if main guest has accepted the invitation
        if (mainGuestInvitation.invitationStatus !== 'ACCEPTED') {
            responseHandler(res, 400, "You must accept the invitation before adding guests");
            return;
        }

        // Check if token has expired
        const now = new Date();
        if (mainGuestInvitation.tokenExpiresAt < now) {
            responseHandler(res, 400, "Invitation has expired");
            return;
        }

        // Get the customer to add
        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
        });

        if (!customer) {
            responseHandler(res, 404, "Customer not found");
            return;
        }

        // Transaction to update or create invitation and participant
        const result = await prisma.$transaction(async (tx) => {
            // Check if invitation already exists for this customer
            let invitation = await tx.eventInvitation.findUnique({
                where: {
                    customerId_bookingId_eventId: {
                        customerId: customerId,
                        bookingId: mainGuestInvitation.bookingId,
                        eventId: mainGuestInvitation.eventId
                    }
                }
            });
            
            // Get the first enhancement if available
            const firstEnhancement = mainGuestInvitation.event.eventEnhancements[0];
            const selectedEnhancementId = firstEnhancement?.enhancementId;
            
            // Get the price (tax is already included)
            const enhancementPrice = firstEnhancement?.overridePrice || firstEnhancement?.enhancement.price || 0;

            if (invitation) {
                // If invitation exists and is PENDING or DECLINED, update it to ACCEPTED
                if (invitation.invitationStatus === 'PENDING' || invitation.invitationStatus === 'DECLINED') {
                    invitation = await tx.eventInvitation.update({
                        where: { id: invitation.id },
                        data: {
                            invitationStatus: 'ACCEPTED',
                            acceptedAt: new Date(),
                        }
                    });

                    // Create EventParticipant since they're now accepted
                    await tx.eventParticipant.create({
                        data: {
                            eventId: mainGuestInvitation.eventId,
                            customerId: customerId,
                            bookingId: mainGuestInvitation.bookingId,
                            //@ts-ignore
                            paymentIntentId: mainGuestInvitation.booking.paymentIntent.id,
                            enhancementId: selectedEnhancementId,
                            participantType: 'GUEST',
                            status: 'COMPLETED',
                            addedBy: 'MAIN_GUEST',
                            notes: `Added by main guest: ${mainGuestInvitation.customer.guestFirstName} ${mainGuestInvitation.customer.guestLastName}`
                        }
                    });

                    // Update event total guests count and revenue
                    await tx.event.update({
                        where: { id: mainGuestInvitation.eventId },
                        data: {
                            totalGuests: {
                                increment: 1
                            },
                            totalRevenue: {
                                increment: enhancementPrice
                            }
                        }
                    });
                    
                    // Update payment intent outstanding amount
                    if (enhancementPrice > 0 && mainGuestInvitation.booking.paymentIntent) {
                        const currentOutstanding = mainGuestInvitation.booking.paymentIntent.outstandingAmount || 0;
                        await tx.paymentIntent.update({
                            where: { id: mainGuestInvitation.booking.paymentIntent.id },
                            data: {
                                outstandingAmount: currentOutstanding + enhancementPrice
                            }
                        });
                    }
                } else if (invitation.invitationStatus === 'ACCEPTED') {
                    // Already accepted, nothing to do
                    return { invitation, customer, alreadyAdded: true };
                }
            } else {
                // Create new invitation in ACCEPTED state
                invitation = await tx.eventInvitation.create({
                    data: {
                        eventId: mainGuestInvitation.eventId,
                        customerId: customerId,
                        bookingId: mainGuestInvitation.bookingId,
                        invitationToken: generateTokenForEventGuest(),
                        tokenExpiresAt: mainGuestInvitation.tokenExpiresAt,
                        invitationStatus: 'ACCEPTED',
                        acceptedAt: new Date(),
                        isMainGuest: false,
                        sentAt: new Date()
                    }
                });

                // Create EventParticipant
                await tx.eventParticipant.create({
                    data: {
                        eventId: mainGuestInvitation.eventId,
                        customerId: customerId,
                        bookingId: mainGuestInvitation.bookingId,
                        //@ts-ignore
                        paymentIntentId: mainGuestInvitation.booking.paymentIntent.id,
                        enhancementId: selectedEnhancementId,
                        participantType: 'GUEST',
                        status: 'PENDING',
                        addedBy: 'MAIN_GUEST',
                        notes: `Added by main guest: ${mainGuestInvitation.customer.guestFirstName} ${mainGuestInvitation.customer.guestLastName}`
                    }
                });

                // Update event total guests count and revenue
                await tx.event.update({
                    where: { id: mainGuestInvitation.eventId },
                    data: {
                        totalGuests: {
                            increment: 1
                        },
                        totalRevenue: {
                            increment: enhancementPrice
                        }
                    }
                });
                
                // Update payment intent outstanding amount
                if (enhancementPrice > 0 && mainGuestInvitation.booking.paymentIntent) {
                    const currentOutstanding = mainGuestInvitation.booking.paymentIntent.outstandingAmount || 0;
                    await tx.paymentIntent.update({
                        where: { id: mainGuestInvitation.booking.paymentIntent.id },
                        data: {
                            outstandingAmount: currentOutstanding + enhancementPrice
                        }
                    });
                }
            }

            return { invitation, customer, alreadyAdded: false };
        });

        if (result.alreadyAdded) {
            responseHandler(res, 200, "Guest is already added to the event", {
                status: 'ALREADY_ADDED',
                message: `${customer.guestFirstName} ${customer.guestLastName} is already attending this event`
            });
            return;
        }

        // Send confirmation email to the added guest
        await EmailService.sendEmail({
            to: {
                email: customer.guestEmail,
                name: `${customer.guestFirstName} ${customer.guestLastName}`
            },
            templateType: 'GUEST_ADDED_CONFIRMATION',
            templateData: {
                guestName: `${customer.guestFirstName} ${customer.guestLastName}`,
                eventName: mainGuestInvitation.event.name,
                eventDate: mainGuestInvitation.event.eventDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                eventTime: mainGuestInvitation.event.eventDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                mainGuestName: `${mainGuestInvitation.customer.guestFirstName} ${mainGuestInvitation.customer.guestLastName}`,
            }
        });

        responseHandler(res, 201, "Guest added to event successfully", {
            status: 'SUCCESS',
            message: `${customer.guestFirstName} ${customer.guestLastName} has been added to the event`
        });

    } catch (error: any) {
        console.error("Error adding guest to event:", error);
        handleError(res, error);
    }
};

export const getEventGuestsList = async (req: express.Request, res: express.Response) => {
    const { token } = req.params;

    if (!token) {
        responseHandler(res, 400, "Invitation token is required");
        return;
    }

    try {
        // Find the main guest's invitation with booking details
        const mainGuestInvitation = await prisma.eventInvitation.findUnique({
            where: { invitationToken: token },
            include: {
                event: true,
                customer: true,
                booking: {
                    include: {
                        customer: true,
                        guestCheckInAccess: {
                            include: {
                                customer: true
                            }
                        }
                    }
                }
            }
        });

        if (!mainGuestInvitation) {
            responseHandler(res, 404, "Invalid invitation token");
            return;
        }

        // Only main guests can manage the guest list
        if (!mainGuestInvitation.isMainGuest) {
            responseHandler(res, 403, "Only the main guest can manage the guest list");
            return;
        }

        // Get all guests from the booking
        const allBookingGuests = [];
        const addedCustomerIds = new Set();
        
        // Get all guests from guestCheckInAccess (this includes the main guest)
        for (const guestAccess of mainGuestInvitation.booking.guestCheckInAccess) {
            if (guestAccess.customer && !addedCustomerIds.has(guestAccess.customer.id)) {
                allBookingGuests.push({
                    customerId: guestAccess.customer.id,
                    firstName: guestAccess.customer.guestFirstName,
                    lastName: guestAccess.customer.guestLastName,
                    email: guestAccess.customer.guestEmail,
                    isMainBookingGuest: guestAccess.isMainGuest // Use the isMainGuest flag from guestCheckInAccess
                });
                addedCustomerIds.add(guestAccess.customer.id);
            }
        }
        
        // If no guests in guestCheckInAccess, fall back to booking customer
        if (allBookingGuests.length === 0 && mainGuestInvitation.booking.customer) {
            const customerId = mainGuestInvitation.booking.customer.id;
            allBookingGuests.push({
                customerId: customerId,
                firstName: mainGuestInvitation.booking.customer.guestFirstName,
                lastName: mainGuestInvitation.booking.customer.guestLastName,
                email: mainGuestInvitation.booking.customer.guestEmail,
                isMainBookingGuest: true
            });
        }

        // Get all event invitations for this event and booking
        const existingInvitations = await prisma.eventInvitation.findMany({
            where: {
                eventId: mainGuestInvitation.eventId,
                bookingId: mainGuestInvitation.bookingId
            },
            include: {
                customer: true
            }
        });

        // Get all EventParticipants to include the addedBy information
        const eventParticipants = await prisma.eventParticipant.findMany({
            where: {
                eventId: mainGuestInvitation.eventId,
                bookingId: mainGuestInvitation.bookingId
            }
        });

        // Categorize guests
        const invitedGuests = [];
        const availableToInvite = [];

        for (const guest of allBookingGuests) {
            const invitation = existingInvitations.find(inv => inv.customerId === guest.customerId);
            
            if (invitation) {
                // Only show as "invited" if they've ACCEPTED
                // PENDING and DECLINED guests should be available to add
                if (invitation.invitationStatus === 'ACCEPTED') {
                    // Find the EventParticipant to get addedBy information
                    const participant = eventParticipants.find(p => p.customerId === guest.customerId);
                    invitedGuests.push({
                        ...guest,
                        invitationId: invitation.id,
                        invitationStatus: invitation.invitationStatus,
                        invitedAt: invitation.createdAt,
                        acceptedAt: invitation.acceptedAt,
                        declinedAt: invitation.declinedAt,
                        addedBy: participant?.addedBy || 'GUEST', // Show who added this guest
                    });
                } else {
                    // PENDING or DECLINED - available for main guest to add
                    availableToInvite.push({
                        ...guest,
                        invitationId: invitation.id,
                        currentStatus: invitation.invitationStatus // Show current status so UI can display it
                    });
                }
            } else {
                // No invitation at all - available to add
                availableToInvite.push(guest);
            }
        }

        responseHandler(res, 200, "Booking guests retrieved successfully", {
            mainGuest: {
                firstName: mainGuestInvitation.customer.guestFirstName,
                lastName: mainGuestInvitation.customer.guestLastName,
                email: mainGuestInvitation.customer.guestEmail
            },
            event: {
                id: mainGuestInvitation.event.id,
                name: mainGuestInvitation.event.name,
                date: mainGuestInvitation.event.eventDate
            },
            booking: {
                id: mainGuestInvitation.booking.id,
                checkIn: mainGuestInvitation.booking.checkIn,
                checkOut: mainGuestInvitation.booking.checkOut
            },
            invitedGuests,
            availableToInvite,
            totalBookingGuests: allBookingGuests.length,
            totalInvited: invitedGuests.length,
            totalAvailable: availableToInvite.length
        });

    } catch (error) {
        console.error("Error fetching guest list:", error);
        handleError(res, error as Error);
    }
};

