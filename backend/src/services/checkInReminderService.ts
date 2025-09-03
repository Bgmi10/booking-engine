import prisma from "../prisma";
import { EmailService } from "./emailService";
import AuditService from "./auditService";

export class CheckInReminderService {
    /**
     * Process check-in reminders for bookings checking in on a specific date
     * @param targetDate - The date to check for upcoming bookings
     * @param triggerDays - Number of days before check-in to send reminder
     * @returns Array of processed booking groups with their results
     */
    static async processCheckInReminders(targetDate: Date, triggerDays: number) {
        console.log(`[CheckInReminderService] Processing reminders for ${targetDate.toISOString().split('T')[0]} (${triggerDays} days ahead)`);
        
        const upcomingBookings = await this.getUpcomingBookings(targetDate);
        console.log(`[CheckInReminderService] Found ${upcomingBookings.length} bookings for check-in`);
        
        const bookingGroups = this.groupBookingsByDateAndPaymentIntent(upcomingBookings);
        console.log(`[CheckInReminderService] Grouped ${upcomingBookings.length} bookings into ${bookingGroups.size} email groups`);
        
        const results = [];
        
        // Process each group (same check-in date and payment intent)
        for (const [groupKey, groupBookings] of bookingGroups.entries()) {
            try {
                const result = await this.processBookingGroup(groupKey, groupBookings, triggerDays);
                results.push(result);
            } catch (error) {
                console.error(`[CheckInReminderService] Failed to process booking group ${groupKey}:`, error);
                results.push({
                    groupKey,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    bookingCount: groupBookings.length
                });
            }
        }
        
        console.log(`[CheckInReminderService] Completed processing. Results: ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed`);
        return results;
    }

    /**
     * Manually send check-in invitation for a specific payment intent (booking group)
     * @param paymentIntentId - The payment intent ID to send check-in for
     * @param userId - The admin user ID who initiated this action (for audit logging)
     * @returns Result of the operation
     */
    static async sendManualCheckInForPaymentIntent(paymentIntentId: string, userId?: string) {
        console.log(`[CheckInReminderService] Manually sending check-in invitation for payment intent: ${paymentIntentId}`);
        
        try {
            // Get all bookings for this payment intent
            const bookings = await prisma.booking.findMany({
                where: {
                    paymentIntentId: paymentIntentId,
                    status: "CONFIRMED"
                },
                include: {
                    room: true,
                    customer: true,
                    paymentIntent: {
                        include: {
                            bookingGroup: {
                                include: {
                                    mainGuest: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    checkIn: 'asc'
                }
            });

            if (bookings.length === 0) {
                throw new Error('No confirmed bookings found for this payment intent');
            }

            // Group by check-in date
            const bookingGroups = this.groupBookingsByCheckInDate(bookings);
            const results = [];

            for (const [checkInDate, dateBookings] of bookingGroups.entries()) {
                const groupKey = `${checkInDate}_${paymentIntentId}`;
                const daysUntilCheckIn = Math.ceil((new Date(checkInDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                
                const result = await this.processBookingGroup(groupKey, dateBookings, daysUntilCheckIn, true, userId);
                results.push(result);
            }

            return {
                success: true,
                results,
                message: `Manual check-in invitations sent for ${results.length} check-in date(s)`
            };

        } catch (error) {
            console.error(`[CheckInReminderService] Error sending manual check-in for payment intent ${paymentIntentId}:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                paymentIntentId
            };
        }
    }

    /**
     * Manually send check-in invitation for a specific booking
     * @param bookingId - The booking ID to send check-in for
     * @param userId - The admin user ID who initiated this action (for audit logging)
     * @returns Result of the operation
     */
    static async sendManualCheckInForBooking(bookingId: string, userId?: string) {
        console.log(`[CheckInReminderService] Manually sending check-in invitation for booking: ${bookingId}`);
        
        try {
            const booking = await prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    room: true,
                    customer: true,
                    paymentIntent: {
                        include: {
                            bookingGroup: {
                                include: {
                                    mainGuest: true
                                }
                            }
                        }
                    }
                }
            });

            if (!booking) {
                throw new Error('Booking not found');
            }

            if (booking.status !== 'CONFIRMED') {
                throw new Error('Booking is not confirmed');
            }

            const daysUntilCheckIn = Math.ceil((booking.checkIn.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            const groupKey = `${booking.checkIn.toISOString().split('T')[0]}_${booking.paymentIntentId || 'direct'}`;
            
            const result = await this.processBookingGroup(groupKey, [booking], daysUntilCheckIn, true, userId);

            return {
                success: true,
                result,
                message: 'Manual check-in invitation sent successfully'
            };

        } catch (error) {
            console.error(`[CheckInReminderService] Error sending manual check-in for booking ${bookingId}:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                bookingId
            };
        }
    }

    /**
     * Get upcoming bookings for a specific target date
     */
    private static async getUpcomingBookings(targetDate: Date) {
        return await prisma.booking.findMany({
            where: {
                checkIn: {
                    gte: targetDate,
                    lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000) // Same day
                },
                status: "CONFIRMED",
            },
            include: {
                room: true,
                customer: true,
                paymentIntent: {
                    include: {
                        bookingGroup: {
                            include: {
                                mainGuest: true
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Group bookings by check-in date and payment intent
     */
    private static groupBookingsByDateAndPaymentIntent(bookings: any[]) {
        const bookingGroups = new Map<string, typeof bookings>();
        
        for (const booking of bookings) {
            const checkInDate = booking.checkIn.toISOString().split('T')[0];
            const paymentIntentId = booking.paymentIntentId || 'direct';
            const groupKey = `${checkInDate}_${paymentIntentId}`;
            
            if (!bookingGroups.has(groupKey)) {
                bookingGroups.set(groupKey, []);
            }
            bookingGroups.get(groupKey)!.push(booking);
        }
        
        return bookingGroups;
    }

    /**
     * Group bookings by check-in date only
     */
    private static groupBookingsByCheckInDate(bookings: any[]) {
        const bookingGroups = new Map<string, typeof bookings>();
        
        for (const booking of bookings) {
            const checkInDate = booking.checkIn.toISOString().split('T')[0];
            
            if (!bookingGroups.has(checkInDate)) {
                bookingGroups.set(checkInDate, []);
            }
            bookingGroups.get(checkInDate)!.push(booking);
        }
        
        return bookingGroups;
    }

    /**
     * Process a single booking group and send check-in invitation
     */
    private static async processBookingGroup(
        groupKey: string, 
        groupBookings: any[], 
        triggerDays: number,
        isManual: boolean = false,
        userId?: string
    ) {
        try {
            // Check if any booking in this group already has a token (unless manual)
            if (!isManual) {
                const existingAccess = await prisma.guestCheckInAccess.findFirst({
                    where: {
                        bookingId: {
                            in: groupBookings.map(b => b.id)
                        },
                        tokenExpiresAt: {
                            gt: new Date() // Only active tokens
                        }
                    }
                });
                
                if (existingAccess) {
                    console.log(`[CheckInReminderService] Token already exists for booking group ${groupKey}, skipping...`);
                    return {
                        groupKey,
                        success: true,
                        skipped: true,
                        reason: 'Token already exists',
                        bookingCount: groupBookings.length
                    };
                }
            }
            
            const firstBooking = groupBookings[0];
            let recipientEmail: string;
            let recipientName: string;
            let customerId: string;
            
            if (firstBooking.customer) {
                // Direct customer booking
                recipientEmail = firstBooking.customer.guestEmail;
                recipientName = `${firstBooking.customer.guestFirstName} ${firstBooking.customer.guestLastName}`;
                customerId = firstBooking.customer.id;
            } else if (firstBooking.paymentIntent?.bookingGroup?.mainGuest) {
                // Group booking - send to main guest
                const mainGuest = firstBooking.paymentIntent.bookingGroup.mainGuest;
                recipientEmail = mainGuest.guestEmail;
                recipientName = `${mainGuest.guestFirstName} ${mainGuest.guestLastName}`;
                customerId = mainGuest.id;
            } else {
                throw new Error(`No customer or main guest found for booking group ${groupKey}`);
            }
            
            // Set token expiry to the day after check-in (as per client requirement)
            const tokenExpiresAt = new Date(firstBooking.checkIn);
            tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 1); // Day after check-in
            tokenExpiresAt.setHours(23, 59, 59, 999); // End of day
            
            // Create main guest access record ONLY for the first booking (main room)
            const bookingToken = require('crypto').randomBytes(32).toString('hex');
            
            // Calculate completion status based on customer data
            const customer = firstBooking.customer || (firstBooking.paymentIntent?.bookingGroup?.mainGuest);
            if (!customer) {
                throw new Error(`No customer data found for first booking in group ${groupKey}`);
            }
            
            const personalDetailsComplete = !!(
                customer.guestFirstName && 
                customer.guestLastName && 
                customer.guestEmail && 
                customer.dob
            );
            
            const identityDetailsComplete = !!(
                customer.guestNationality && 
                customer.passportNumber && 
                customer.passportExpiry && 
                customer.passportIssuedCountry
            );
            
            const addressDetailsComplete = !!(customer.city);
            
            let completionStatus = 'INCOMPLETE';
            if (personalDetailsComplete && identityDetailsComplete && addressDetailsComplete) {
                completionStatus = 'COMPLETE';
            } else if (personalDetailsComplete || identityDetailsComplete || addressDetailsComplete) {
                completionStatus = 'PARTIAL';
            }
            
            try {
                // Create or update main guest record ONLY for the first booking
                await prisma.guestCheckInAccess.upsert({
                    where: {
                        customerId_bookingId: {
                            customerId: customerId,
                            bookingId: firstBooking.id
                        }
                    },
                    create: {
                        customerId: customerId,
                        bookingId: firstBooking.id,
                        accessToken: bookingToken,
                        tokenExpiresAt: tokenExpiresAt,
                        isMainGuest: true,
                        guestType: 'MAIN_GUEST',
                        invitationStatus: 'NOT_APPLICABLE',
                        completionStatus: completionStatus as any,
                        personalDetailsComplete,
                        identityDetailsComplete,
                        addressDetailsComplete,
                        checkInCompletedAt: completionStatus === 'COMPLETE' ? new Date() : null
                    },
                    update: {
                        accessToken: bookingToken,
                        tokenExpiresAt: tokenExpiresAt,
                        completionStatus: completionStatus as any,
                        personalDetailsComplete,
                        identityDetailsComplete,
                        addressDetailsComplete,
                        checkInCompletedAt: completionStatus === 'COMPLETE' ? new Date() : null
                    }
                });
                
                console.log(`[CheckInReminderService] ${isManual ? 'Updated' : 'Created'} main guest access record for first booking ${firstBooking.id}`);
                
            } catch (error: any) {
                if (error.code === 'P2002') {
                    // Handle unique constraint violation
                    const existingRecord = await prisma.guestCheckInAccess.findFirst({
                        where: {
                            bookingId: firstBooking.id,
                            customerId: customerId,
                            tokenExpiresAt: {
                                gt: new Date()
                            }
                        }
                    });
                    if (existingRecord && !isManual) {
                        console.log(`[CheckInReminderService] Main guest access record already exists for booking ${firstBooking.id}, using existing token`);
                    } else {
                        throw error;
                    }
                } else {
                    throw error;
                }
            }
            
            // Use the first booking's token for the email URL
            const firstBookingAccess = await prisma.guestCheckInAccess.findFirst({
                where: {
                    bookingId: groupBookings[0].id,
                    customerId: customerId
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            
            const checkinToken = firstBookingAccess?.accessToken || bookingToken;
            
            // Create the online check-in URL
            const baseUrl = process.env.NODE_ENV === 'local' ? process.env.FRONTEND_DEV_URL : process.env.FRONTEND_PROD_URL;
            const checkinUrl = `${baseUrl}/online-checkin/${checkinToken}`;
            
            // Prepare booking details for email template
            const bookingDetails = groupBookings.map(booking => ({
                roomName: booking.room.name,
                checkIn: booking.checkIn,
                checkOut: booking.checkOut
            }));
            
            // Send single online check-in invitation email for all bookings in this group
            await EmailService.sendEmail({
                to: {
                    email: recipientEmail,
                    name: recipientName
                },
                templateType: 'ONLINE_CHECKIN_INVITATION',
                subject: `${isManual ? 'Re-sent: ' : ''}Complete Your Online Check-In${groupBookings.length > 1 ? ' - Multiple Rooms' : ` - ${firstBooking.room.name}`}`,
                templateData: {
                    customerName: recipientName,
                    roomName: firstBooking.room.name, // For backward compatibility
                    bookings: bookingDetails, // New field for multiple bookings
                    checkInDate: firstBooking.checkIn.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    checkinUrl: checkinUrl,
                    daysUntilCheckin: Math.max(0, triggerDays),
                    isMultipleBookings: groupBookings.length > 1,
                    isManualResend: isManual
                }
            });
            
            console.log(`[CheckInReminderService] ${isManual ? 'Manual' : 'Automated'} check-in invitation sent to ${recipientEmail} for ${groupBookings.length} booking(s) in group ${groupKey}`);
            
            // Log audit entry for manual check-in invitations
            if (isManual && userId) {
                try {
                    // Determine the entity type and context
                    const firstBooking = groupBookings[0];
                    const paymentIntentId = firstBooking.paymentIntentId;
                    const bookingGroupId = firstBooking.paymentIntent?.bookingGroupId;
                    
                    // Log audit for the payment intent or booking group
                    await AuditService.createAuditLog(null, {
                        entityType: bookingGroupId ? 'BOOKING_GROUP' : 'PAYMENT_INTENT',
                        entityId: bookingGroupId || paymentIntentId,
                        actionType: 'CHECKIN_INVITATION_SENT',
                        userId: userId,
                        reason: `Manual check-in invitation sent by admin`,
                        notes: `Check-in invitation sent to ${recipientEmail} for ${groupBookings.length} booking(s). Check-in URL: ${checkinUrl}`,
                        newValues: {
                            recipientEmail,
                            recipientName,
                            bookingCount: groupBookings.length,
                            checkinUrl,
                            bookingIds: groupBookings.map(b => b.id),
                            triggerDays: Math.max(0, triggerDays),
                            isManualResend: true
                        },
                        paymentIntentId: paymentIntentId,
                        bookingGroupId: bookingGroupId,
                        bookingId: groupBookings.length === 1 ? groupBookings[0].id : undefined
                    });
                    
                    console.log(`[CheckInReminderService] Audit log created for manual check-in invitation: ${groupKey}`);
                } catch (auditError) {
                    console.error(`[CheckInReminderService] Failed to create audit log for check-in invitation ${groupKey}:`, auditError);
                    // Don't fail the check-in process if audit logging fails
                }
            }
            
            return {
                groupKey,
                success: true,
                recipientEmail,
                recipientName,
                bookingCount: groupBookings.length,
                checkinUrl,
                isManual
            };
            
        } catch (error) {
            console.error(`[CheckInReminderService] Failed to process booking group ${groupKey}:`, error);
            throw error;
        }
    }
}