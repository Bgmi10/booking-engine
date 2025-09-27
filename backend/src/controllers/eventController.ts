import express from "express";
import { handleError, responseHandler, generateMergedBookingId } from "../utils/helper";
import prisma from "../prisma";
import { EmailService } from "../services/emailService";
import { generateToken } from "../utils/tokenGenerator";

export const createEvent = async (req: express.Request, res: express.Response) => {
 //@ts-ignore
 const { id: userId } = req.user;
 const { name, description, eventDate, eventType, enhancements, notes } = req.body;

 try {
   const event = await prisma.event.create({
    data: {
        name, 
        description,
        eventDate: new Date(eventDate),
        eventType,
        eventEnhancements: enhancements && enhancements.length > 0 ? {
          create: enhancements.map((enhancement: any) => ({
            enhancementId: typeof enhancement === 'string' ? enhancement : enhancement.enhancementId,
            overridePrice: typeof enhancement === 'object' ? enhancement.overridePrice : null,
            maxQuantity: typeof enhancement === 'object' ? enhancement.maxQuantity : null
          }))
        } : undefined,
        totalRevenue: 0,
        totalGuests: 0,
        status: "IN_PROGRESS",
    },
    include: {
      eventEnhancements: {
        include: {
          enhancement: true
        }
      }
    }
   });


   await prisma.bookingAuditLog.create({
    data: {
        actionType: "CREATED",
        entityType: "ENHANCEMENT_EVENT",
        entityId: event.id,
        notes,
        userId,
        eventId: event.id,
        newValues: {
          name,
          description,
          eventDate,
          eventType,
          enhancements,
          totalRevenue: 0,
          totalGuests: 0,
          status: "IN_PROGRESS"
        },
        changedFields: ["name", "description", "eventDate", "eventType", "enhancements", "status"]
    }
   })

   responseHandler(res, 200, "Event created successfully", event);
 } catch (e) {
    console.log(e);
    handleError(res, e as Error)
 }
}   

export const deleteEvent = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    if (!id) {
        responseHandler(res, 400, "Id missing");
        return;
    }

    try {
        await prisma.event.delete({
            where: { id } 
        });

        responseHandler(res, 200, "Event deleted successfully");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const editEvent = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    //@ts-ignore
    const { id: userId } = req.user;
    const { name, description, eventDate, eventType, status, enhancements, reason, notes } = req.body;
    
    if (!id) {
        responseHandler(res, 400, "Id missing");
        return;
    }

    if (!reason || reason.trim() === '') {
        responseHandler(res, 400, "Reason for update is required");
        return;
    }

    try {
        // Get current event to track changes
        const currentEvent = await prisma.event.findUnique({
            where: { id },
            include: {
                eventEnhancements: true
            }
        });

        if (!currentEvent) {
            responseHandler(res, 404, "Event not found");
            return;
        }

        // Prepare update data
        const updateData: any = {};
        const previousValues: any = {};
        const newValues: any = {};
        const changedFields: string[] = [];

        // Track field changes
        if (name && name !== currentEvent.name) {
            updateData.name = name;
            previousValues.name = currentEvent.name;
            newValues.name = name;
            changedFields.push("name");
        }

        if (description !== undefined && description !== currentEvent.description) {
            updateData.description = description;
            previousValues.description = currentEvent.description;
            newValues.description = description;
            changedFields.push("description");
        }

        if (eventDate && new Date(eventDate).getTime() !== currentEvent.eventDate.getTime()) {
            updateData.eventDate = new Date(eventDate);
            previousValues.eventDate = currentEvent.eventDate;
            newValues.eventDate = new Date(eventDate);
            changedFields.push("eventDate");
        }

        if (eventType && eventType !== currentEvent.eventType) {
            updateData.eventType = eventType;
            previousValues.eventType = currentEvent.eventType;
            newValues.eventType = eventType;
            changedFields.push("eventType");
        }

        if (status && status !== currentEvent.status) {
            updateData.status = status;
            previousValues.status = currentEvent.status;
            newValues.status = status;
            changedFields.push("status");
        }

        // Start transaction to update event and handle enhancements
        const updatedEvent = await prisma.$transaction(async (tx) => {
            // Update the event
            const event = await tx.event.update({
                where: { id },
                data: updateData,
                include: {
                    eventEnhancements: {
                        include: {
                            enhancement: true
                        }
                    }
                }
            });

            // Handle enhancement updates if provided
            if (enhancements !== undefined) {
                // Store previous enhancement data for audit log
                const previousEnhancementData = currentEvent.eventEnhancements.map(e => ({
                    enhancementId: e.enhancementId,
                    overridePrice: e.overridePrice,
                    maxQuantity: e.maxQuantity
                }));
                
                const newEnhancementData = enhancements as any[];
                const newEnhancementIds = newEnhancementData.map(e => 
                    typeof e === 'string' ? e : e.enhancementId
                );
                const currentEnhancementIds = currentEvent.eventEnhancements.map(e => e.enhancementId);

                const toRemove = currentEnhancementIds.filter(id => !newEnhancementIds.includes(id));
                const toAdd = newEnhancementData.filter(e => {
                    const id = typeof e === 'string' ? e : e.enhancementId;
                    return !currentEnhancementIds.includes(id);
                });
                const toUpdate = newEnhancementData.filter(e => {
                    const id = typeof e === 'string' ? e : e.enhancementId;
                    return currentEnhancementIds.includes(id);
                });

                // Track if any changes were made
                let enhancementsChanged = false;

                // Remove old enhancements
                if (toRemove.length > 0) {
                    await tx.eventEnhancement.deleteMany({
                        where: {
                            eventId: id,
                            enhancementId: { in: toRemove }
                        }
                    });
                    enhancementsChanged = true;
                }

                // Add new enhancements
                if (toAdd.length > 0) {
                    await tx.eventEnhancement.createMany({
                        data: toAdd.map((enhancement: any) => ({
                            eventId: id,
                            enhancementId: typeof enhancement === 'string' ? enhancement : enhancement.enhancementId,
                            overridePrice: typeof enhancement === 'object' ? enhancement.overridePrice : null,
                            maxQuantity: typeof enhancement === 'object' ? enhancement.maxQuantity : null
                        }))
                    });
                    enhancementsChanged = true;
                }

                // Update existing enhancements (for override price and max quantity changes)
                for (const enhancement of toUpdate) {
                    const enhancementId = typeof enhancement === 'string' ? enhancement : enhancement.enhancementId;
                    const currentEnhancement = currentEvent.eventEnhancements.find(e => e.enhancementId === enhancementId);
                    
                    // Check if override price or max quantity changed
                    const overridePrice = typeof enhancement === 'object' ? enhancement.overridePrice : null;
                    const maxQuantity = typeof enhancement === 'object' ? enhancement.maxQuantity : null;
                    
                    if (currentEnhancement && 
                        (currentEnhancement.overridePrice !== overridePrice || 
                         currentEnhancement.maxQuantity !== maxQuantity)) {
                        await tx.eventEnhancement.update({
                            where: {
                                eventId_enhancementId: {
                                    eventId: id,
                                    enhancementId: enhancementId
                                }
                            },
                            data: {
                                overridePrice,
                                maxQuantity
                            }
                        });
                        enhancementsChanged = true;
                    }
                }

                if (enhancementsChanged) {
                    previousValues.enhancements = previousEnhancementData;
                    newValues.enhancements = newEnhancementData;
                    changedFields.push("enhancements");
                }
            }

            // Create audit log if there were changes
            if (changedFields.length > 0) {
                await tx.bookingAuditLog.create({
                    data: {
                        actionType: "EDITED",
                        entityType: "ENHANCEMENT_EVENT",
                        entityId: id,
                        reason,
                        notes,
                        userId,
                        eventId: id,
                        previousValues,
                        newValues,
                        changedFields
                    }
                });
            }

            return event;
        });

        // Fetch the updated event with logs
        const eventWithLogs = await prisma.event.findUnique({
            where: { id },
            include: {
                eventEnhancements: {
                    include: {
                        enhancement: true
                    }
                },
                logs: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        responseHandler(res, 200, "Event updated successfully", eventWithLogs);
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const getAllEvents = async (req: express.Request, res: express.Response) => {
    try {
        const events = await prisma.event.findMany({
            include: {
                eventEnhancements: {
                    include: {
                        enhancement: true
                    }
                },
                eventParticipants: {
                    include: {
                        customer: {
                            select: {
                                id: true,
                                guestFirstName: true,
                                guestLastName: true,
                                guestEmail: true,
                                guestPhone: true
                            }
                        },
                        enhancement: true,
                        booking: {
                            include: {
                                room: {
                                    select: {
                                        name: true
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
                                guestCheckInAccess: {
                                    include: {
                                        customer: {
                                            select: {
                                                id: true,
                                                guestFirstName: true,
                                                guestLastName: true,
                                                guestEmail: true,
                                                guestPhone: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                eventInvitations: {
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
                            include: {
                                room: {
                                    select: {
                                        name: true
                                    }
                                },
                                guestCheckInAccess: {
                                    include: {
                                        customer: {
                                            select: {
                                                id: true,
                                                guestFirstName: true,
                                                guestLastName: true,
                                                guestEmail: true,
                                                guestPhone: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                logs: {
                    include: {
                        user: {
                            select: {
                                name: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                _count: {
                    select: {
                        eventInvitations: true,
                        eventParticipants: true
                    }
                }
            }
        });

        responseHandler(res, 200, "success", events);
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const sendEventInvite = async (req: express.Request, res: express.Response) => {
    const { eventId } = req.params;
    //@ts-ignore
    const { id: userId } = req.user;

    if (!eventId) {
        responseHandler(res, 400, "Event Id is required");
        return;
    }
    
    try {
        // Get event details with enhancements
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                eventEnhancements: {
                    include: {
                        enhancement: true
                    }
                }
            }
        });

        if (!event) {
            responseHandler(res, 404, "Event not found");
            return;
        }

        if (event.status === 'CANCELLED') {
            responseHandler(res, 400, "Cannot send invitations for cancelled events");
            return;
        }

        if (event.status === 'COMPLETED') {
            responseHandler(res, 400, "Cannot send invitations for completed events");
            return;
        }

        // Get general settings for check-in/out times
        const generalSettings = await prisma.generalSettings.findFirst();
        const defaultCheckInTime = generalSettings?.standardCheckInTime || '14:00';
        const defaultCheckOutTime = generalSettings?.standardCheckOutTime || '10:00';

        // Get all bookings (including future bookings) where guests will be present during the event
        const allBookings = await prisma.booking.findMany({
            where: {
                status: {
                    in: ['CONFIRMED', 'PENDING']
                },
            },
            include: {
                customer: true,
                paymentIntent: {
                    select: {
                        bookingData : true
                    }
                },
                guestCheckInAccess: {
                    include: {
                        customer: true
                    }
                }
            }
        });

        // Filter bookings where guests will actually be present during the event
        const eligibleBookings = allBookings.filter(booking => {
            const checkInDate = new Date(booking.checkIn);
            const checkOutDate = new Date(booking.checkOut);
            const eventDate = new Date(event.eventDate);
            
            const d = JSON.parse(booking?.paymentIntent?.bookingData || "");
            //const isExistingEvent = d.selectedEventsDetails.eventId === event.id;

            console.log(d)
            
            // Get the actual check-in and check-out times
            const checkInTime = booking.checkInTime || defaultCheckInTime
            const checkOutTime = booking.checkOutTime || defaultCheckOutTime;
            
            // Create DateTime objects with proper times
            const [checkInHour, checkInMinute] = checkInTime.split(':').map(Number);
            const [checkOutHour, checkOutMinute] = checkOutTime.split(':').map(Number);
            
            const actualCheckInDateTime = new Date(checkInDate);
            actualCheckInDateTime.setHours(checkInHour, checkInMinute, 0, 0);
            
            const actualCheckOutDateTime = new Date(checkOutDate);
            actualCheckOutDateTime.setHours(checkOutHour, checkOutMinute, 0, 0);
            
            // Guest is eligible if event is after their actual check-in time and before their actual check-out time
            const isEligible = eventDate >= actualCheckInDateTime && eventDate < actualCheckOutDateTime;
        
            return isEligible;
        });

        if (!eligibleBookings || eligibleBookings.length === 0) {
            console.log(`No eligible bookings for event on ${event.eventDate}. Checked ${allBookings.length} total bookings.`);
            responseHandler(res, 400, `No bookings found for the event date (${new Date(event.eventDate).toLocaleDateString()}). Checked ${allBookings.length} total bookings. Invitations can only be sent to guests who have confirmed bookings that overlap with the event date.`);
            return;
        }

        // Collect all unique guests (main guests + additional guests)
        const guestsToInvite = new Map();
        
        for (const booking of eligibleBookings) {
            // Add main guest
            if (booking.customer) {
                guestsToInvite.set(booking.customer.id, {
                    customer: booking.customer,
                    bookingId: booking.id,
                    isMainGuest: true
                });
            }

            // Add additional guests from guestCheckInAccess
            for (const guestAccess of booking.guestCheckInAccess) {
                if (guestAccess.customer && !guestsToInvite.has(guestAccess.customer.id)) {
                    guestsToInvite.set(guestAccess.customer.id, {
                        customer: guestAccess.customer,
                        bookingId: booking.id,
                        isMainGuest: guestAccess.isMainGuest
                    });
                }
            }
        }
        
        // Determine base URL based on environment
        const baseUrl = process.env.NODE_ENV === 'local' 
            ? process.env.FRONTEND_DEV_URL 
            : process.env.FRONTEND_PROD_URL;

        let successCount = 0;
        let failedCount = 0;
        let skippedCount = 0;

        // Send invitations to all eligible guests
        for (const [customerId, guestData] of guestsToInvite) {
            try {
                // Check if this customer is already a participant in the event
                const existingParticipant = await prisma.eventParticipant.findFirst({
                    where: {
                        eventId: eventId,
                        customerId: customerId,
                        status: { not: 'CANCELLED' }
                    }
                });

                // Skip if they're already a registered participant
                if (existingParticipant) {
                    console.log(`Skipping invitation for ${guestData.customer.guestEmail} - already registered as participant`);
                    skippedCount++;
                    continue;
                }

                // Get the booking details to get checkout date
                const bookingToGetCheckoutData = await prisma.booking.findUnique({
                    where: { id: guestData.bookingId },
                    select: { checkOut: true, checkIn: true }
                });

                // Set invitation expiry to checkout date
                const invitationTokenExpiry = bookingToGetCheckoutData?.checkOut || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                // Check if invitation already exists for this event
                const existingInvitation = await prisma.eventInvitation.findUnique({
                    where: {
                        customerId_bookingId_eventId: {
                            customerId: customerId,
                            bookingId: guestData.bookingId,
                            eventId: eventId
                        }
                    }
                });

                let invitationToken: string;
                
                if (existingInvitation) {
                    // Update existing invitation
                    invitationToken = existingInvitation.invitationToken;
                    await prisma.eventInvitation.update({
                        where: { id: existingInvitation.id },
                        data: {
                            sentAt: new Date(),
                            tokenExpiresAt: invitationTokenExpiry
                        }
                    });
                } else {
                    // Create new invitation
                    invitationToken = generateToken();
                    await prisma.eventInvitation.create({
                        data: {
                            eventId: eventId,
                            bookingId: guestData.bookingId,
                            customerId: customerId,
                            invitationToken: invitationToken,
                            tokenExpiresAt: invitationTokenExpiry,
                            isMainGuest: guestData.isMainGuest,
                            invitationStatus: 'PENDING',
                            sentAt: new Date()
                        }
                    });
                }

                // Prepare enhancement details for email
                const enhancementsList = event.eventEnhancements.map(ee => ({
                    name: ee.enhancement.name,
                    description: ee.enhancement.description,
                    price: ee.overridePrice || ee.enhancement.price,
                    pricingType: ee.enhancement.pricingType
                }));

                // Create invitation URL
                const invitationUrl = `${baseUrl}/event-invitation/${invitationToken}`;

                // Format event date and time
                const eventDateTime = new Date(event.eventDate);
                const formattedDate = eventDateTime.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const formattedTime = eventDateTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                // Create formatted enhancements list for email
                const enhancementsHtml = enhancementsList.length > 0
                    ? enhancementsList.map(e => 
                        `<li>${e.name}${e.price ? ` - €${e.price}` : ''}</li>`
                      ).join('')
                    : '';

                // Get event price from first enhancement (with override price taking precedence)
                const eventPrice = event.eventEnhancements.length > 0
                    ? (event.eventEnhancements[0].overridePrice || event.eventEnhancements[0].enhancement.price)
                    : null;

                // Get booking details for the email
                const booking = await prisma.booking.findUnique({
                    where: { id: guestData.bookingId },
                    include: { 
                        room: true,
                        paymentIntent: {
                            include: {
                                bookings: true
                            }
                        }
                    }
                });

                // Send email using EmailService  
                await EmailService.sendEmail({
                    to: {
                        email: guestData.customer.guestEmail,
                        name: `${guestData.customer.guestFirstName} ${guestData.customer.guestLastName}`
                    },
                    templateType: 'ENHANCEMENT_INVITATION',
                    templateData: {
                        customerName: `${guestData.customer.guestFirstName} ${guestData.customer.guestLastName}`,
                        isMainGuest: guestData.isMainGuest,
                        isEventInvitation: true,
                        eventName: event.name,
                        eventDescription: event.description || '',
                        eventDate: formattedDate,
                        eventTime: formattedTime,
                        eventPrice: eventPrice,
                        enhancementsPreview: enhancementsHtml,
                        portalUrl: invitationUrl,
                        acceptUrl: `${invitationUrl}/accept`,
                        declineUrl: `${invitationUrl}/decline`,
                        expirationDate: invitationTokenExpiry.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }),
                        // Add booking details for the email template
                        // Generate merged booking ID from all bookings under the same payment intent
                        bookingReference: booking?.paymentIntent?.bookings 
                            ? generateMergedBookingId(booking.paymentIntent.bookings.map(b => b.id))
                            : booking?.id.substring(0, 8).toUpperCase(),
                        roomName: booking?.room?.name || '',
                        checkInDate: booking?.checkIn ? new Date(booking.checkIn).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }) : '',
                        checkOutDate: booking?.checkOut ? new Date(booking.checkOut).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }) : ''
                    }
                });

                successCount++;
            } catch (error) {
                console.error(`Failed to send invitation to ${guestData.customer.guestEmail}:`, error);
                failedCount++;
            }
        }

        // Create audit log
        await prisma.bookingAuditLog.create({
            data: {
                actionType: "ENHANCEMENT_EVENT_EMAIL_SENT",
                entityType: "ENHANCEMENT_EVENT",
                entityId: eventId,
                userId,
                eventId,
                notes: `Sent invitations to ${successCount} guests. ${skippedCount > 0 ? `Skipped ${skippedCount} already registered participants.` : ''} ${failedCount > 0 ? `Failed to send to ${failedCount} guests.` : ''}`,
                newValues: {
                    invitationsSent: successCount,
                    invitationsFailed: failedCount,
                    invitationsSkipped: skippedCount
                },
                changedFields: ["invitations"]
            }
        });

        responseHandler(res, 200, `Event invitations sent to guests staying during the event date`, {
            eventId,
            totalGuests: guestsToInvite.size,
            successCount,
            failedCount,
            skippedCount,
            eligibleBookings: eligibleBookings.length,
            eventDate: event.eventDate
        });

    } catch (error) {
        console.error("Error sending event invitations:", error);
        handleError(res, error as Error);
    }
}

// Get all bookings with their guests for event management
export const getEventBookingsWithGuests = async (req: express.Request, res: express.Response) => {
    const { eventId } = req.params;
    const { search } = req.query;
    
    try {
        // Validate event exists
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                eventParticipants: {
                    select: {
                        id: true,
                        customerId: true,
                        bookingId: true,
                        addedBy: true,
                        status: true,
                        notes: true
                    }
                },
                eventInvitations: {
                    select: {
                        id: true,
                        customerId: true,
                        bookingId: true,
                        invitationStatus: true,
                        isMainGuest: true
                    }
                }
            }
        });
        
        if (!event) {
            responseHandler(res, 404, "Event not found");
            return;
        }
        
        // Build search conditions
        const searchConditions = search ? {
            OR: [
                {
                    room: {
                        name: {
                            contains: search as string,
                            mode: 'insensitive' as any
                        }
                    }
                },
                {
                    customer: {
                        OR: [
                            {
                                guestFirstName: {
                                    contains: search as string,
                                    mode: 'insensitive' as any
                                }
                            },
                            {
                                guestLastName: {
                                    contains: search as string,
                                    mode: 'insensitive' as any
                                }
                            },
                            {
                                guestEmail: {
                                    contains: search as string,
                                    mode: 'insensitive' as any
                                }
                            }
                        ]
                    }
                },
                {
                    guestCheckInAccess: {
                        some: {
                            customer: {
                                OR: [
                                    {
                                        guestFirstName: {
                                            contains: search as string,
                                            mode: 'insensitive' as any
                                        }
                                    },
                                    {
                                        guestLastName: {
                                            contains: search as string,
                                            mode: 'insensitive' as any
                                        }
                                    },
                                    {
                                        guestEmail: {
                                            contains: search as string,
                                            mode: 'insensitive' as any
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            ]
        } : {};
        
        // Get all bookings with their guests
        const bookings = await prisma.booking.findMany({
            where: {
                status: {
                    in: ['CONFIRMED', 'PENDING']
                },
                ...searchConditions
            },
            include: {
                room: {
                    select: {
                        id: true,
                        name: true
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
                paymentIntent: {
                    select: {
                        id: true,
                        status: true
                    }
                },
                guestCheckInAccess: {
                    include: {
                        customer: {
                            select: {
                                id: true,
                                guestFirstName: true,
                                guestLastName: true,
                                guestEmail: true,
                                guestPhone: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                checkIn: 'desc'
            }
        });
        
        // Transform the data to include guest status
        const bookingsWithGuestStatus = bookings.map(booking => {
            // Get all guests from guestCheckInAccess
            const guests = booking.guestCheckInAccess.map(access => {
                // Find if this guest is a participant
                const participant = event.eventParticipants.find(
                    p => p.customerId === access.customer.id && p.bookingId === booking.id
                );
                
                // Find if this guest has an invitation
                const invitation = event.eventInvitations.find(
                    inv => inv.customerId === access.customer.id && inv.bookingId === booking.id
                );
                
                return {
                    customerId: access.customer.id,
                    firstName: access.customer.guestFirstName,
                    lastName: access.customer.guestLastName,
                    email: access.customer.guestEmail,
                    phone: access.customer.guestPhone,
                    isMainBookingGuest: access.isMainGuest,
                    invitationId: invitation?.id,
                    invitationStatus: invitation?.invitationStatus,
                    participantId: participant?.id,
                    addedBy: participant?.addedBy,
                    participantNotes: participant?.notes
                };
            });
            
            return {
                id: booking.id,
                checkIn: booking.checkIn,
                checkOut: booking.checkOut,
                room: booking.room,
                customer: booking.customer,
                paymentIntent: booking.paymentIntent,
                guests
            };
        });
        
        responseHandler(res, 200, "Bookings retrieved successfully", bookingsWithGuestStatus);
        
    } catch (error) {
        console.error("Error fetching bookings:", error);
        handleError(res, error as Error);
    }
}

// Search customers for adding to event
export const searchCustomersForEvent = async (req: express.Request, res: express.Response) => {
    const { search } = req.query;
    const { eventId } = req.params;
    
    try {
        // Validate event exists
        const event = await prisma.event.findUnique({
            where: { id: eventId }
        });
        
        if (!event) {
            responseHandler(res, 404, "Event not found");
            return;
        }
        
        // Get existing participants to exclude them
        const existingParticipants = await prisma.eventParticipant.findMany({
            where: { eventId },
            select: { customerId: true }
        });
        
        const excludeIds = existingParticipants.map(p => p.customerId);
        
        // Search customers
        const customers = await prisma.customer.findMany({
            where: {
                AND: [
                    {
                        id: {
                            notIn: excludeIds
                        }
                    },
                    search ? {
                        OR: [
                            {
                                guestFirstName: {
                                    contains: search as string,
                                    mode: 'insensitive'
                                }
                            },
                            {
                                guestLastName: {
                                    contains: search as string,
                                    mode: 'insensitive'
                                }
                            },
                            {
                                guestEmail: {
                                    contains: search as string,
                                    mode: 'insensitive'
                                }
                            }
                        ]
                    } : {}
                ]
            },
            select: {
                id: true,
                guestFirstName: true,
                guestLastName: true,
                guestEmail: true,
                guestPhone: true,
                bookings: {
                    select: {
                        id: true,
                        checkIn: true,
                        checkOut: true,
                        room: {
                            select: {
                                name: true
                            }
                        },
                        paymentIntent: {
                            select: {
                                id: true,
                                status: true
                            }
                        }
                    },
                    orderBy: {
                        checkIn: 'desc'
                    },
                    take: 5
                }
            },
            take: 20
        });
        
        responseHandler(res, 200, "Customers found", customers);
        
    } catch (error) {
        console.error("Error searching customers:", error);
        handleError(res, error as Error);
    }
}

// Add participant to event (Admin)
export const addEventParticipant = async (req: express.Request, res: express.Response) => {
    const { eventId } = req.params;
    const { customerId, bookingId, reason, notes } = req.body;
    //@ts-ignore
    const userId = req.user?.id;
    
    try {
        // Validate event exists with enhancements
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                eventEnhancements: {
                    include: {
                        enhancement: true
                    }
                }
            }
        });
        
        if (!event) {
            responseHandler(res, 404, "Event not found");
            return;
        }
        
        // Get customer and booking details
        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
        });
        
        if (!customer) {
            responseHandler(res, 404, "Customer not found");
            return;
        }
        
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                paymentIntent: true
            }
        });
        
        if (!booking || !booking.paymentIntent) {
            responseHandler(res, 400, "Valid booking with payment intent required");
            return;
        }
        
        const selectedEnhancementId = event.eventEnhancements[0]?.enhancementId;
        
        if (!selectedEnhancementId) {
            responseHandler(res, 400, "No enhancement available for this event");
            return;
        }
        
        // Get enhancement details for pricing
        const selectedEnhancement = event.eventEnhancements.find(
            ee => ee.enhancementId === selectedEnhancementId
        );
        
        const enhancementPrice = selectedEnhancement?.overridePrice || 
                                selectedEnhancement?.enhancement.price || 0;
        
        // Start transaction
        const result = await prisma.$transaction(async (tx) => {
            // Check if participant already exists
            const existingParticipant = await tx.eventParticipant.findUnique({
                where: {
                    eventId_bookingId_customerId_enhancementId: {
                        eventId,
                        bookingId,
                        customerId,
                        enhancementId: selectedEnhancementId
                    }
                }
            });
            
            if (existingParticipant) {
                throw new Error("Participant already exists for this event");
            }

            // Check if we have an EventGuestRegistry with prepaid attendees
            const eventRegistry = await tx.eventGuestRegistry.findFirst({
                where: {
                    bookingId: bookingId,
                    status: { in: ['PROVISIONAL', 'CONFIRMED'] }
                }
            });

            let shouldCharge = true;
            let createOrderAndCharge = true;

            // If we have a registry with prepaid events, check limits
            if (eventRegistry && eventRegistry.selectedEvents) {
                const selectedEvents = typeof eventRegistry.selectedEvents === 'string' 
                    ? JSON.parse(eventRegistry.selectedEvents as string) 
                    : eventRegistry.selectedEvents;

                // Handle both array and object formats
                const eventsArray = Array.isArray(selectedEvents) ? selectedEvents : Object.values(selectedEvents);
                
                // Find the event data that matches this enhancement
                const eventData = eventsArray.find((e: any) => e.id === selectedEnhancementId);
                
                if (eventData && eventData.plannedAttendees) {
                    // Count existing participants for this event from this registry
                    const existingParticipantCount = await tx.eventParticipant.count({
                        where: {
                            enhancementId: selectedEnhancementId,
                            registryId: eventRegistry.id,
                            status: { not: 'CANCELLED' }
                        }
                    });

                    console.log(`[Admin Add] Event ${selectedEnhancementId}: ${existingParticipantCount}/${eventData.plannedAttendees} participants exist`);

                    // If within prepaid limit, don't charge
                    if (existingParticipantCount < eventData.plannedAttendees) {
                        shouldCharge = false;
                        createOrderAndCharge = false;
                        console.log(`[Admin Add] Within prepaid limit - no charge needed`);
                    } else {
                        console.log(`[Admin Add] Exceeds prepaid limit - charging for additional guest`);
                    }
                }
            }
            
            // Create or update invitation
            await tx.eventInvitation.upsert({
                where: {
                    customerId_bookingId_eventId: {
                        customerId,
                        bookingId,
                        eventId
                    }
                },
                create: {
                    eventId,
                    bookingId,
                    customerId,
                    invitationToken: generateToken(),
                    tokenExpiresAt: new Date(booking.checkOut),
                    invitationStatus: 'ACCEPTED',
                    acceptedAt: new Date(),
                    isMainGuest: false
                },
                update: {
                    invitationStatus: 'ACCEPTED',
                    acceptedAt: new Date()
                }
            });
            
            // Create participant
            const participant = await tx.eventParticipant.create({
                data: {
                    eventId,
                    bookingId,
                    customerId,
                    //@ts-ignore
                    paymentIntentId: booking.paymentIntent.id,
                    enhancementId: selectedEnhancementId,
                    participantType: 'GUEST',
                    status: 'COMPLETED',
                    addedBy: 'ADMIN',
                    notes: notes || `Added by admin: ${reason}`,
                    registryId: eventRegistry?.id || null
                },
                include: {
                    customer: true,
                    enhancement: true,
                    event: true
                }
            });

            // Only update revenue and create order if charging
            if (shouldCharge && enhancementPrice > 0) {
                await tx.event.update({
                    where: { id: eventId },
                    data: {
                        totalGuests: {
                            increment: 1
                        },
                        totalRevenue: {
                            increment: enhancementPrice
                        }
                    }
                });

                // Create order following stripeWebhook pattern
                const enhancement = selectedEnhancement?.enhancement;
                await tx.order.create({
                    data: {
                        customer: { connect: { id: customerId } },
                        paymentIntent: { connect: { id: booking?.paymentIntent?.id } },
                        items: [{
                            name: `${event.name} - Additional Guest`,
                            description: enhancement?.description || event.description,
                            imageUrl: enhancement?.image || null,
                            price: enhancementPrice,
                            tax: enhancement?.tax ?? 0,
                            pricingType: enhancement?.pricingType || 'PER_GUEST',
                            quantity: 1
                        }],
                        total: enhancementPrice,
                        status: 'DELIVERED'
                    }
                });

                // Update payment intent outstanding amount
                const currentOutstanding = booking?.paymentIntent?.outstandingAmount || 0;
                await tx.paymentIntent.update({
                    where: { id: booking?.paymentIntent?.id },
                    data: {
                        outstandingAmount: currentOutstanding + enhancementPrice
                    }
                });
            } else {
                // Just update guest count, no revenue change for prepaid guests
                await tx.event.update({
                    where: { id: eventId },
                    data: {
                        totalGuests: {
                            increment: 1
                        }
                    }
                });
            }
            
            // Create audit log
            await tx.bookingAuditLog.create({
                data: {
                    entityType: 'ENHANCEMENT_EVENT_PARTICIPANT',
                    entityId: participant.id,
                    actionType: 'GUEST_ADDED',
                    userId,
                    eventId,
                    eventParticipantId: participant.id,
                    bookingId,
                    //@ts-ignore
                    paymentIntentId: booking.paymentIntent.id,
                    reason: reason || 'Added by admin',
                    notes: notes || `Admin added ${customer.guestFirstName} ${customer.guestLastName} to event`,
                    newValues: {
                        customerId,
                        enhancementId: selectedEnhancementId,
                        price: enhancementPrice,
                        status: 'PENDING',
                        addedBy: 'ADMIN'
                    },
                    changedFields: ['participant_added']
                }
            });
            
            return { participant, event, customer, booking };
        });
        
        const eventDateTime = new Date(result.event.eventDate);
        const formattedDate = eventDateTime.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const formattedTime = eventDateTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        
        await EmailService.sendEmail({
            to: {
                email: result.customer.guestEmail,
                name: `${result.customer.guestFirstName} ${result.customer.guestLastName}`
            },
            templateType: 'GUEST_ADDED_CONFIRMATION',
            templateData: {
                guestName: `${result.customer.guestFirstName} ${result.customer.guestLastName}`,
                eventName: result.event.name,
                eventDate: formattedDate,
                eventTime: formattedTime,
                mainGuestName: `Admin`,
                eventDescription: result.event.description || '',
                eventPrice: enhancementPrice > 0 ? enhancementPrice : null
            }
        });
        
        responseHandler(res, 201, "Participant added successfully", result.participant);
        
    } catch (error) {
        console.error("Error adding participant:", error);
        handleError(res, error as Error);
    }
}

// Remove participant from event (Admin)
export const removeEventParticipant = async (req: express.Request, res: express.Response) => {
    const { eventId, participantId } = req.params;
    const { reason, notes } = req.body;
    //@ts-ignore
    const userId = req.user?.id;
    
    try {
        // Get participant details before deletion
        const participant = await prisma.eventParticipant.findUnique({
            where: { id: participantId },
            include: {
                customer: true,
                enhancement: true,
                event: {
                    include: {
                        eventEnhancements: true
                    }
                },
                booking: {
                    include: {
                        paymentIntent: true
                    }
                }
            }
        });
        
        if (!participant || participant.eventId !== eventId) {
            responseHandler(res, 404, "Participant not found in this event");
            return;
        }
        
        // Get the correct price from EventEnhancement or use default enhancement price
        const eventEnhancement = participant.event.eventEnhancements.find(
            ee => ee.enhancementId === participant.enhancementId
        );
        const enhancementPrice = eventEnhancement?.overridePrice ?? participant.enhancement.price;
        
        // Start transaction
        await prisma.$transaction(async (tx) => {
            // Update invitation status to DECLINED
            await tx.eventInvitation.updateMany({
                where: {
                    eventId,
                    customerId: participant.customerId,
                    bookingId: participant?.bookingId || ""
                },
                data: {
                    invitationStatus: 'DECLINED',
                    declinedAt: new Date()
                }
            });
            
            
            // Delete participant
            await tx.eventParticipant.delete({
                where: { id: participantId }
            });
            
            // Update event total guests and revenue
            await tx.event.update({
                where: { id: eventId },
                data: {
                    totalGuests: {
                        decrement: 1
                    },
                    totalRevenue: {
                        decrement: enhancementPrice
                    }
                }
            });
            
            // Update payment intent outstanding amount
            if (enhancementPrice > 0 && participant?.booking?.paymentIntent) {
                const currentOutstanding = participant?.booking?.paymentIntent.outstandingAmount || 0;
                await tx.paymentIntent.update({
                    where: { id: participant?.booking?.paymentIntent.id },
                    data: {
                        outstandingAmount: Math.max(0, currentOutstanding - enhancementPrice)
                    }
                });
            }
            
            // Create audit log
            await tx.bookingAuditLog.create({
                data: {
                    entityType: 'ENHANCEMENT_EVENT_PARTICIPANT',
                    entityId: participantId,
                    actionType: 'REMOVED',
                    userId,
                    eventId,
                    bookingId: participant.bookingId,
                    paymentIntentId: participant?.booking?.paymentIntent?.id,
                    reason: reason || 'Removed by admin',
                    notes: notes || `Admin removed ${participant.customer.guestFirstName} ${participant.customer.guestLastName} from event`,
                    previousValues: {
                        customerId: participant.customerId,
                        enhancementId: participant.enhancementId,
                        price: enhancementPrice,
                        status: participant.status,
                        addedBy: participant.addedBy,
                        participantNotes: participant.notes
                    },
                    changedFields: ['participant_removed']
                }
            });
        });
        
        responseHandler(res, 200, "Participant removed successfully");
        
    } catch (error) {
        console.error("Error removing participant:", error);
        handleError(res, error as Error);
    }
}


export const getEventsByPaymentIntent = async (req: express.Request, res: express.Response) => {
    const { eventregistryId } = req.params;

    try {
        const eventGuestRegistry = await prisma.eventGuestRegistry.findUnique({
            where: { id: eventregistryId },
            include: {
                eventParticipants: {
                    include: {
                        customer: true,
                        event: true,
                        enhancement: true
                    }
                },
                booking: true,
                paymentIntent: true
            }
        })

        if (!eventGuestRegistry) {
            responseHandler(res, 404, "Event guest registry not found");
            return;
        }

        responseHandler(res, 200, "Events retrieved successfully", eventGuestRegistry);
        
    } catch (error) {
        console.error("Error getting events by payment intent:", error);
        handleError(res, error as Error);
    }
};
