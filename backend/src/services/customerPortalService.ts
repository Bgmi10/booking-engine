import prisma from '../prisma';
import { ProposalStatus } from '@prisma/client';
import { ItineraryNotificationService } from './itineraryNotificationService';

export class CustomerPortalService {
    // Get proposal details for customer
    static async getProposalDetails(customerId: string, proposalId: string) {
        const proposal = await prisma.weddingProposal.findFirst({
            where: {
                id: proposalId,
                customerId: customerId
            },
            include: {
                customer: true,
                itineraryDays: {
                    include: {
                        items: {
                            include: {
                                product: true
                            }
                        }
                    },
                    orderBy: {
                        dayNumber: 'asc'
                    }
                },
                paymentPlan: {
                    include: {
                        stages: {
                            orderBy: {
                                dueDate: 'asc'
                            }
                        }
                    }
                }
            }
        });

        if (!proposal) {
            throw new Error('Proposal not found or access denied');
        }

        return proposal;
    }

    static async updateMainGuestCount(customerId: string, proposalId: string, newCount: number) {
        // Verify ownership and access
        const proposal = await prisma.weddingProposal.findFirst({
            where: {
                id: proposalId,
                customerId: customerId
            }
        });

        if (!proposal) {
            throw new Error('Proposal not found or access denied');
        }

        if (newCount > 120) {
            throw new Error('Maximum guest count exceeded');
        }

        // Update the main guest count
        const updatedProposal = await prisma.weddingProposal.update({
            where: {
                id: proposalId
            },
            data: {
                mainGuestCount: newCount
            }
        });

        return updatedProposal;
    }

    // Update the entire itinerary
    static async updateItinerary(customerId: string, proposalId: string, itineraryDays: any[]) {
        // Verify ownership and access
        const proposal = await prisma.weddingProposal.findFirst({
            where: {
                id: proposalId,
                customerId: customerId
            },
            include: {
                itineraryDays: {
                    include: {
                        items: {
                            include: {
                                product: true
                            }
                        }
                    }
                }
            }
        });

        if (!proposal) {
            throw new Error('Proposal not found or access denied');
        }

        // Store previous state for comparison
        const previousState = [...proposal.itineraryDays];

        // Update each day in the itinerary
        for (const updatedDay of itineraryDays) {
            const existingDay = proposal.itineraryDays.find(day => day.id === updatedDay.id);
            
            if (existingDay) {
                // Update existing day
                await prisma.itineraryDay.update({
                    where: { id: existingDay.id },
                    data: {
                        date: new Date(updatedDay.date)
                    }
                });
                
                // Delete existing items
                await prisma.itineraryItem.deleteMany({
                    where: { dayId: existingDay.id }
                });
                
                // Create new items
                if (updatedDay.items && updatedDay.items.length > 0) {
                    for (const item of updatedDay.items) {
                        await prisma.itineraryItem.create({
                            data: {
                                dayId: existingDay.id,
                                productId: item.productId,
                                guestCount: item.guestCount > 120 ? 120 : item.guestCount,
                                status: item.status,
                                price: item.price,
                                notes: item.notes || null,
                                customMenu: item.customMenu || null
                            }
                        });
                    }
                }
            }
        }

        // Send notification about the changes
        ItineraryNotificationService.sendItineraryChangeNotification(
            proposalId,
            previousState,
            'customer'
        ).catch(error => {
            console.error('Failed to send itinerary change notification:', error);
        });

        return await this.getProposalDetails(customerId, proposalId);
    }

    // Accept proposal
    static async acceptProposal(customerId: string, proposalId: string) {
        // Verify ownership and access
        const proposal = await prisma.weddingProposal.findFirst({
            where: {
                id: proposalId,
                customerId: customerId
            }
        });

        if (!proposal) {
            throw new Error('Proposal not found or access denied');
        }

        if (proposal.status === ProposalStatus.ACCEPTED) {
            throw new Error('Proposal is already accepted');
        }

        // Update proposal status to ACCEPTED
        const updatedProposal = await prisma.weddingProposal.update({
            where: { id: proposalId },
            data: { status: ProposalStatus.ACCEPTED }
        });

        return updatedProposal;
    }

    // Get payment plan for a proposal
    static async getPaymentPlan(customerId: string, proposalId: string) {
        const paymentPlan = await prisma.paymentPlan.findFirst({
            where: {
                proposalId: proposalId,
                proposal: {
                    customerId: customerId
                }
            },
            include: {
                stages: {
                    orderBy: {
                        dueDate: 'asc'
                    }
                }
            }
        });

        if (!paymentPlan) {
            throw new Error('Payment plan not found or access denied');
        }

        return paymentPlan;
    }

    // Confirm final guest numbers
    static async confirmFinalGuestNumbers(customerId: string, proposalId: string) {
        // Verify ownership and access
        const proposal = await prisma.weddingProposal.findFirst({
            where: {
                id: proposalId,
                customerId: customerId
            }
        });

        if (!proposal) {
            throw new Error('Proposal not found or access denied');
        }

        // Update proposal to mark guest count as confirmed
        const updatedProposal = await prisma.weddingProposal.update({
            where: { id: proposalId },
            data: {
                finalGuestCountConfirmed: true,
                finalGuestCountConfirmedAt: new Date()
            }
        });

        return updatedProposal;
    }
} 