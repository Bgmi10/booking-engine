import prisma from '../prisma';
import { adminEmails } from '../utils/constants';
import { getAdminDashboardSectionUrl, getWeddingPortalSectionUrl } from '../utils/helper';
import { EmailService } from './emailService';
import { ItineraryDay, ItineraryItem } from '@prisma/client';
import { format } from 'date-fns';

type ItineraryDayWithItems = ItineraryDay & {
    items: (ItineraryItem & {
        product: {
            name: string;
            description: string | null;
        };
    })[];
};

interface ChangeDetails {
    dayChanges: string[];
    itemChanges: string[];
}

export class ItineraryNotificationService {
    public static async sendItineraryChangeNotification(
        proposalId: string,
        previousState: ItineraryDayWithItems[],
        changedBy: 'admin' | 'customer'
    ): Promise<void> {
        try {
            const proposal = await prisma.weddingProposal.findUnique({
                where: { id: proposalId },
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
                    }
                }
            });

            if (!proposal) {
                throw new Error('Proposal not found');
            }

            // Compare previous state with current state to identify changes
            const changes = this.identifyChanges(previousState, proposal.itineraryDays);
            
            // If no changes detected, don't send notification
            if (changes.dayChanges.length === 0 && changes.itemChanges.length === 0) {
                console.log('No changes detected, skipping notification');
                return;
            }

            // Format the wedding date
            const weddingDate = format(new Date(proposal.weddingDate), 'EEEE, MMMM d, yyyy');
            
            // Determine who made the changes for the email
            const changeSource = changedBy === 'admin' ? 'our staff' : 'you';
            
            if (changedBy === 'admin') {
                await EmailService.sendEmail({
                    to: {
                        email: proposal.customer.guestEmail,
                        name: `${proposal.customer.guestFirstName} ${proposal.customer.guestLastName}`
                    },
                    templateType: 'ITINERARY_CHANGE_NOTIFICATION',
                    templateData: {
                        customerName: proposal.customer.guestFirstName,
                        weddingName: proposal.name,
                        weddingDate,
                        changedBy: changeSource,
                        dayChanges: changes.dayChanges,
                        itemChanges: changes.itemChanges,
                        portalLink: getWeddingPortalSectionUrl("itinerary"),
                        currentYear: new Date().getFullYear()
                    }
                });
            }
            
            // Send notification to admin if changes were made by customer
            if (changedBy === 'customer') {
                // Send to each admin
                for (const adminEmail of adminEmails) {
                    await EmailService.sendEmail({
                        to: {
                            email: adminEmail.trim(),
                            name: 'Admin'
                        },
                        templateType: 'ITINERARY_CHANGE_NOTIFICATION',
                        templateData: {
                            customerName: 'Admin',
                            weddingName: `${proposal.name} (${proposal.customer.guestFirstName} ${proposal.customer.guestLastName})`,
                            weddingDate,
                            changedBy: 'the customer',
                            dayChanges: changes.dayChanges,
                            itemChanges: changes.itemChanges,
                            portalLink: getAdminDashboardSectionUrl("wedding-proposals"),
                            currentYear: new Date().getFullYear()
                        }
                    });
                }
            }
            
            console.log(`Itinerary change notification sent for proposal ${proposalId}`);
        } catch (error) {
            console.error('Error sending itinerary change notification:', error);
            throw error;
        }
    }
    
    private static identifyChanges(
        previousState: ItineraryDayWithItems[],
        currentState: ItineraryDayWithItems[]
    ): ChangeDetails {
        const dayChanges: string[] = [];
        const itemChanges: string[] = [];
        
        // Check for added or removed days
        const prevDayNumbers = previousState.map(day => day.dayNumber);
        const currDayNumbers = currentState.map(day => day.dayNumber);
        
        // Find added days
        const addedDays = currDayNumbers.filter(num => !prevDayNumbers.includes(num));
        addedDays.forEach(dayNum => {
            const day = currentState.find(d => d.dayNumber === dayNum);
            if (day) {
                dayChanges.push(`Added Day ${dayNum} (${format(new Date(day.date), 'MMM d, yyyy')})`);
            }
        });
        
        // Find removed days
        const removedDays = prevDayNumbers.filter(num => !currDayNumbers.includes(num));
        removedDays.forEach(dayNum => {
            const day = previousState.find(d => d.dayNumber === dayNum);
            if (day) {
                dayChanges.push(`Removed Day ${dayNum} (${format(new Date(day.date), 'MMM d, yyyy')})`);
            }
        });
        
        // Check for date changes in existing days
        previousState.forEach(prevDay => {
            const currDay = currentState.find(d => d.dayNumber === prevDay.dayNumber);
            if (currDay) {
                // Check if date changed
                const prevDate = new Date(prevDay.date);
                const currDate = new Date(currDay.date);
                if (prevDate.getTime() !== currDate.getTime()) {
                    dayChanges.push(
                        `Day ${prevDay.dayNumber} date changed from ${format(prevDate, 'MMM d, yyyy')} to ${format(currDate, 'MMM d, yyyy')}`
                    );
                }
                
                // Check for item changes within this day
                this.compareItems(prevDay, currDay, itemChanges);
            }
        });
        
        return { dayChanges, itemChanges };
    }
    
    private static compareItems(
        prevDay: ItineraryDayWithItems,
        currDay: ItineraryDayWithItems,
        itemChanges: string[]
    ): void {
        // Check for added items
        currDay.items.forEach(currItem => {
            const prevItem = prevDay.items.find(p => p.id === currItem.id);
            
            if (!prevItem) {
                // New item added
                itemChanges.push(`Added "${currItem.product.name}" to Day ${currDay.dayNumber}`);
            } else {
                // Item exists, check for changes
                if (prevItem.guestCount !== currItem.guestCount) {
                    itemChanges.push(
                        `Changed guest count for "${currItem.product.name}" on Day ${currDay.dayNumber} from ${prevItem.guestCount} to ${currItem.guestCount}`
                    );
                }
                
                if (prevItem.status !== currItem.status) {
                    itemChanges.push(
                        `Changed status for "${currItem.product.name}" on Day ${currDay.dayNumber} from ${prevItem.status} to ${currItem.status}`
                    );
                }
                
                if (prevItem.price !== currItem.price) {
                    itemChanges.push(
                        `Updated price for "${currItem.product.name}" on Day ${currDay.dayNumber}`
                    );
                }
            }
        });
        
        // Check for removed items
        prevDay.items.forEach(prevItem => {
            const currItem = currDay.items.find(c => c.id === prevItem.id);
            if (!currItem) {
                itemChanges.push(`Removed "${prevItem.product.name}" from Day ${prevDay.dayNumber}`);
            }
        });
    }
} 