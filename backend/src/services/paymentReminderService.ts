import prisma from '../prisma';
import { EmailService } from './emailService';
import { addDays, format, differenceInDays } from 'date-fns';
import { generateMergedBookingId } from '../utils/helper';

export class PaymentReminderService {
    // Wedding Payment Reminder Methods
    private static async getUpcomingPayments(daysThreshold: number) {
        const thresholdDate = addDays(new Date(), daysThreshold);
        
        return await prisma.paymentStage.findMany({
            where: {
                status: 'PENDING',
                dueDate: {
                    lte: thresholdDate,
                    gt: new Date() // Only future payments
                }
            },
            include: {
                paymentPlan: {
                    include: {
                        proposal: {
                            include: {
                                customer: true
                            }
                        }
                    }
                }
            }
        });
    }

    private static async getOverduePayments() {
        return await prisma.paymentStage.findMany({
            where: {
                status: { in: ["PENDING", "PROCESSING"]},
                dueDate: {
                    lt: new Date() // Past due date
                }
            },
            include: {
                paymentPlan: {
                    include: {
                        proposal: {
                            include: {
                                customer: true
                            }
                        }
                    }
                }
            }
        });
    }

    public static async sendUpcomingPaymentReminders() {
        try {
            // Get payments due in the next 7 days
            const upcomingPayments = await this.getUpcomingPayments(7);
            let remindersSent = 0;

            for (const payment of upcomingPayments) {
                const { proposal } = payment.paymentPlan;
                if (!proposal || !proposal.customer) continue;

                await EmailService.sendEmail({
                    to: {
                        email: proposal.customer.guestEmail,
                        name: `${proposal.customer.guestFirstName} ${proposal.customer.guestLastName}`
                    },
                    templateType: 'PAYMENT_REMINDER_UPCOMING',
                    templateData: {
                        customerName: proposal.customer.guestFirstName,
                        proposalName: proposal.name,
                        paymentDescription: payment.description,
                        amount: new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'EUR'
                        }).format(payment.amount),
                        dueDate: payment.dueDate.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }),
                        paymentLink: `${process.env.FRONTEND_URL}/payment/${payment.id}`
                    }
                });

                // Log the reminder
                await prisma.paymentReminder.create({
                    data: {
                        paymentStageId: payment.id,
                        type: 'UPCOMING',
                        sentAt: new Date()
                    }
                });

                remindersSent++;
            }

            console.log(`[PaymentReminder] Sent ${remindersSent} upcoming payment reminders`);
            return remindersSent;
        } catch (error) {
            console.error('[PaymentReminder] Error sending upcoming payment reminders:', error);
            throw error;
        }
    }

    public static async sendOverduePaymentReminders() {
        try {
            const overduePayments = await this.getOverduePayments();
            let remindersSent = 0;

            for (const payment of overduePayments) {
                const { proposal } = payment.paymentPlan;
                if (!proposal || !proposal.customer) continue;

                // Check if we've already sent a reminder in the last 24 hours
                const recentReminder = await prisma.paymentReminder.findFirst({
                    where: {
                        paymentStageId: payment.id,
                        type: 'OVERDUE',
                        sentAt: {
                            gt: addDays(new Date(), -1)
                        }
                    }
                });

                if (recentReminder) continue; // Skip if recent reminder exists

                await EmailService.sendEmail({
                    to: {
                        email: proposal.customer.guestEmail,
                        name: `${proposal.customer.guestFirstName} ${proposal.customer.guestLastName}`
                    },
                    templateType: 'PAYMENT_REMINDER_OVERDUE',
                    templateData: {
                        customerName: proposal.customer.guestFirstName,
                        proposalName: proposal.name,
                        paymentDescription: payment.description,
                        amount: new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'EUR'
                        }).format(payment.amount),
                        dueDate: payment.dueDate.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }),
                        daysOverdue: Math.floor((new Date().getTime() - payment.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
                        paymentLink: payment.stripePaymentUrl
                    }
                });

                // Log the reminder
                await prisma.paymentReminder.create({
                    data: {
                        paymentStageId: payment.id,
                        type: 'OVERDUE',
                        sentAt: new Date()
                    }
                });

                remindersSent++;
            }

            console.log(`[PaymentReminder] Sent ${remindersSent} overdue payment reminders`);
            return remindersSent;
        } catch (error) {
            console.error('[PaymentReminder] Error sending overdue payment reminders:', error);
            throw error;
        }
    }

    // Booking Payment Reminder Methods
    private static async getUpcomingBookingPayments(daysThreshold: number) {
        const thresholdDate = addDays(new Date(), daysThreshold);
        
        return await prisma.paymentIntent.findMany({
            where: {
                paymentStructure: 'SPLIT_PAYMENT',
                remainingAmount: { gt: 0 },
                remainingDueDate: {
                    lte: thresholdDate,
                    gt: new Date()
                },
                status: { in: ['SUCCEEDED', 'PAYMENT_LINK_SENT'] }
            }
        });
    }

    private static async getOverdueBookingPayments() {
        return await prisma.paymentIntent.findMany({
            where: {
                paymentStructure: 'SPLIT_PAYMENT',
                remainingAmount: { gt: 0 },
                remainingDueDate: {
                    lt: new Date()
                },
                status: { in: ['SUCCEEDED', 'PAYMENT_LINK_SENT'] }
            }
        });
    }

    public static async sendBookingPaymentReminders() {
        try {
            const upcomingPayments = await this.getUpcomingBookingPayments(7);
            let remindersSent = 0;

            for (const paymentIntent of upcomingPayments) {
                if (!paymentIntent.customerData || !paymentIntent.remainingDueDate) continue;

                const customerData = JSON.parse(paymentIntent.customerData);
                const bookingData = JSON.parse(paymentIntent.bookingData);
                const booking = bookingData[0]; // Primary booking
                if (!booking) continue;

                const daysUntilDue = differenceInDays(paymentIntent.remainingDueDate, new Date());

                await EmailService.sendEmail({
                    to: {
                        email: customerData.email,
                        name: `${customerData.firstName} ${customerData.lastName}`
                    },
                    templateType: 'BOOKING_PAYMENT_REMINDER',
                    templateData: {
                        customerName: customerData.firstName,
                        confirmationNumber: `BK-${paymentIntent.id.slice(-6).toUpperCase()}`,
                        roomName: booking.roomDetails?.name || 'Your Room',
                        checkInDate: format(new Date(booking.checkIn), 'EEEE, MMMM dd, yyyy'),
                        checkOutDate: format(new Date(booking.checkOut), 'EEEE, MMMM dd, yyyy'),
                        remainingAmount: new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: paymentIntent.currency.toUpperCase()
                            //@ts-ignore
                        }).format(paymentIntent.remainingAmount),
                        dueDate: format(paymentIntent.remainingDueDate, 'EEEE, MMMM dd, yyyy'),
                        daysUntilDue: daysUntilDue,
                        paymentLink: `${process.env.FRONTEND_URL}/payment/${paymentIntent.id}/remaining`
                    }
                });

                remindersSent++;
            }

            console.log(`[BookingPaymentReminder] Sent ${remindersSent} booking payment reminders`);
            return remindersSent;
        } catch (error) {
            console.error('[BookingPaymentReminder] Error sending booking payment reminders:', error);
            throw error;
        }
    }

    public static async sendBookingOverdueNotices() {
        try {
            const overduePayments = await this.getOverdueBookingPayments();
            let noticesSent = 0;

            for (const paymentIntent of overduePayments) {
                if (!paymentIntent.customerData || !paymentIntent.remainingDueDate) continue;

                const customerData = JSON.parse(paymentIntent.customerData);
                const bookingData = JSON.parse(paymentIntent.bookingData);
                const booking = bookingData[0]; // Primary booking
                if (!booking) continue;

                const daysOverdue = differenceInDays(new Date(), paymentIntent.remainingDueDate);

                await EmailService.sendEmail({
                    to: {
                        email: customerData.email,
                        name: `${customerData.firstName} ${customerData.lastName}`
                    },
                    templateType: 'BOOKING_PAYMENT_OVERDUE',
                    templateData: {
                        customerName: customerData.firstName,
                        confirmationNumber: `BK-${paymentIntent.id.slice(-6).toUpperCase()}`,
                        roomName: booking.roomDetails?.name || 'Your Room',
                        checkInDate: format(new Date(booking.checkIn), 'EEEE, MMMM dd, yyyy'),
                        checkOutDate: format(new Date(booking.checkOut), 'EEEE, MMMM dd, yyyy'),
                        remainingAmount: new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: paymentIntent.currency.toUpperCase()
                            //@ts-ignore
                        }).format(paymentIntent.remainingAmount),
                        originalDueDate: format(paymentIntent.remainingDueDate, 'EEEE, MMMM dd, yyyy'),
                        daysOverdue: daysOverdue,
                        paymentLink: `${process.env.FRONTEND_URL}/payment/${paymentIntent.id}/remaining`
                    }
                });

                noticesSent++;
            }

            console.log(`[BookingPaymentOverdue] Sent ${noticesSent} booking overdue notices`);
            return noticesSent;
        } catch (error) {
            console.error('[BookingPaymentOverdue] Error sending booking overdue notices:', error);
            throw error;
        }
    }

    public static async sendSecondPaymentCreatedEmail(paymentIntentId: string, paymentUrl: string) {
        try {
            const paymentIntent = await prisma.paymentIntent.findUnique({
                where: { id: paymentIntentId },
                include: {
                    bookings: true
                }
            });

            if (!paymentIntent || !paymentIntent.customerData) {
                throw new Error('Payment intent or customer data not found');
            }

            const customerData = JSON.parse(paymentIntent.customerData);
            
            // Generate confirmation ID using generateMergedBookingId for consistency
            let confirmationId;
            if (paymentIntent.bookings && paymentIntent.bookings.length > 0) {
                const bookingIds = paymentIntent.bookings.map(booking => booking.id);
                confirmationId = generateMergedBookingId(bookingIds);
            } else {
                // Fallback if no bookings exist yet
                confirmationId = `BK-${paymentIntent.id.slice(-6).toUpperCase()}`;
            }

            // Calculate amounts for the template
            const totalAmount = paymentIntent.totalAmount || paymentIntent.amount || 0;
            const paidAmount = paymentIntent.prepaidAmount || (totalAmount * 0.3); // 30% already paid
            const remainingAmount = paymentIntent.remainingAmount || (totalAmount - paidAmount);

            await EmailService.sendEmail({
                to: {
                    email: customerData.email,
                    name: `${customerData.firstName} ${customerData.lastName}`
                },
                templateType: 'SECOND_PAYMENT_CREATED',
                templateData: {
                    customerName: customerData.firstName,
                    confirmationId: confirmationId,
                    paidAmount: paidAmount,
                    remainingAmount: remainingAmount,
                    totalAmount: totalAmount,
                    paymentUrl: paymentUrl
                }
            });

            console.log(`[SecondPaymentCreated] Sent second payment email for payment intent: ${paymentIntentId}`);
            return true;
        } catch (error) {
            console.error('[SecondPaymentCreated] Error sending second payment created email:', error);
            throw error;
        }
    }

    // Combined cron job method for all payment reminders
    public static async processAllPaymentReminders() {
        try {
            console.log('[PaymentReminderService] Starting payment reminder processing...');
            
            const results = await Promise.allSettled([
                this.sendUpcomingPaymentReminders(), // Wedding payments
                this.sendOverduePaymentReminders(),  // Wedding payments
                this.sendBookingPaymentReminders(),  // Booking payments
                this.sendBookingOverdueNotices()     // Booking payments
            ]);

            let totalReminders = 0;
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    totalReminders += result.value;
                } else {
                    console.error(`Payment reminder process ${index + 1} failed:`, result.reason);
                }
            });

            console.log(`[PaymentReminderService] Processing complete. Total reminders sent: ${totalReminders}`);
            return totalReminders;
        } catch (error) {
            console.error('[PaymentReminderService] Error in processAllPaymentReminders:', error);
            throw error;
        }
    }
} 