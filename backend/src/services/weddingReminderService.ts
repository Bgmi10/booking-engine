import prisma from '../prisma';
import { EmailService } from './emailService';
import { addWeeks, differenceInDays } from 'date-fns';
import { WeddingProposal, Customer, ItineraryDay, ItineraryItem, ProposalStatus } from '@prisma/client';
import dotenv from "dotenv";

dotenv.config();

type WeddingProposalWithRelations = WeddingProposal & {
    customer: Customer;
    itineraryDays: (ItineraryDay & {
        items: ItineraryItem[];
    })[];
};

export class WeddingReminderService {
    private static async getWeddingsNeedingReminders(): Promise<WeddingProposalWithRelations[]> {
        const threeWeeksFromNow = addWeeks(new Date(), 3);
        const today = new Date();
        
        return await prisma.weddingProposal.findMany({
            where: {
                status: ProposalStatus.CONFIRMED,
                weddingDate: {
                    gt: today
                },
                OR: [
                    // Case 1: Initial reminder for weddings 3 weeks away
                    {
                        weddingDate: {
                            lte: threeWeeksFromNow
                        },
                        finalGuestConfirmationSent: false
                    },
                    // Case 2: Follow-up for unconfirmed guest counts
                    {
                        weddingDate: {
                            lte: threeWeeksFromNow
                        },
                        finalGuestConfirmationSent: true,
                        finalGuestCountConfirmed: false,
                        // Only send follow-up if last reminder was sent more than 48 hours ago
                        finalGuestConfirmationSentAt: {
                            lt: new Date(Date.now() - 48 * 60 * 60 * 1000)
                        }
                    }
                ]
            },
            include: {
                customer: true,
                itineraryDays: {
                    include: {
                        items: true
                    },
                    orderBy: {
                        dayNumber: 'asc'
                    }
                }
            }
        });
    }

    public static async sendFinalGuestCountReminders() {
        try {
            const weddingsNeedingReminders = await this.getWeddingsNeedingReminders();
            let remindersSent = 0;

            for (const wedding of weddingsNeedingReminders) {
                if (!wedding.customer) continue;

                const daysUntilWedding = differenceInDays(wedding.weddingDate, new Date());
                const isFollowUp = wedding.finalGuestConfirmationSent;

                // Get the maximum guest count across all itinerary items
                const maxGuestCount = Math.max(
                    ...wedding.itineraryDays.flatMap(day => 
                        day.items.map(item => item.guestCount)
                    ),
                    wedding.mainGuestCount
                );

                await EmailService.sendEmail({
                    to: {
                        email: wedding.customer.guestEmail,
                        name: `${wedding.customer.guestFirstName} ${wedding.customer.guestLastName}`
                    },
                    templateType: isFollowUp ? 'WEDDING_FINAL_GUEST_COUNT_FOLLOWUP' : 'WEDDING_FINAL_GUEST_COUNT',
                    templateData: {
                        customerName: wedding.customer.guestFirstName,
                        weddingName: wedding.name,
                        weddingDate: new Date(wedding.weddingDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }),
                        currentMaxGuests: maxGuestCount,
                        updateLink: `${process.env.NODE_ENV === "local" ? process.env.FRONTEND_DEV_URL : process.env.FRONTEND_PROD_URL}/wedding-portal/dashboard?sidebar=guests`,
                        daysRemaining: daysUntilWedding,
                        isUrgent: daysUntilWedding <= 14 // Mark as urgent if less than 2 weeks away
                    }
                });

                // Update reminder status
                await prisma.weddingProposal.update({
                    where: { id: wedding.id },
                    data: { 
                        finalGuestConfirmationSent: true,
                        finalGuestConfirmationSentAt: new Date()
                    }
                });

                remindersSent++;
            }

            console.log(`[WeddingReminder] Sent ${remindersSent} final guest count reminders`);
            return remindersSent;
        } catch (error) {
            console.error('[WeddingReminder] Error sending final guest count reminders:', error);
            throw error;
        }
    }

    public static async checkAndSendReminders() {
        try {
            const remindersSent = await this.sendFinalGuestCountReminders();
            return remindersSent;
        } catch (error) {
            console.error('[WeddingReminder] Failed to check and send reminders:', error);
            throw error;
        }
    }
} 