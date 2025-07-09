import prisma from '../prisma';
import { EmailService } from './emailService';
import { addDays, isBefore, isAfter } from 'date-fns';

export class PaymentReminderService {
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
} 