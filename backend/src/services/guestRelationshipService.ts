import prisma from "../prisma";
import { RelationshipType } from "@prisma/client";

export class GuestRelationshipService { 

  private static getReversedRelationship(
    relationshipType: RelationshipType,
    gender?: string | null
  ): RelationshipType {
    const relationshipMap: Record<string, RelationshipType | { MALE: RelationshipType; FEMALE: RelationshipType }> = {
      HUSBAND: RelationshipType.WIFE,
      WIFE: RelationshipType.HUSBAND,
      SON: {
        MALE: RelationshipType.FATHER,
        FEMALE: RelationshipType.MOTHER
      },
      DAUGHTER: {
        MALE: RelationshipType.FATHER,
        FEMALE: RelationshipType.MOTHER
      },
      FATHER: {
        MALE: RelationshipType.SON,
        FEMALE: RelationshipType.DAUGHTER
      },
      MOTHER: {
        MALE: RelationshipType.SON,
        FEMALE: RelationshipType.DAUGHTER
      },
      PARTNER: RelationshipType.PARTNER,
      FRIEND: RelationshipType.FRIEND,
      OTHER_RELATIVE: RelationshipType.OTHER_RELATIVE
    };

    const reversed = relationshipMap[relationshipType];
    
    if (typeof reversed === 'object' && gender) {
      // For parent-child relationships, use gender to determine correct relationship
      return gender === 'MALE' ? reversed.MALE : reversed.FEMALE;
    }
    
    if (typeof reversed === 'string') {
      return reversed as RelationshipType;
    }

    // Default fallback
    return RelationshipType.OTHER_RELATIVE;
  }

  /**
   * Create a bi-directional relationship between two customers
   */
  static async createRelationship(
    customerId: string,
    relatedCustomerId: string,
    relationshipType: RelationshipType,
    canBookFor: boolean = true
  ) {
    try {
      // Prevent self-relationships
      if (customerId === relatedCustomerId) {
        throw new Error("Cannot create a relationship with oneself");
      }

      // Check if relationship already exists
      const existingRelationship = await prisma.guestRelationShip.findUnique({
        where: {
          customerId_relatedCustomerId: {
            customerId,
            relatedCustomerId
          }
        }
      });

      if (existingRelationship) {
        throw new Error("Relationship already exists between these customers");
      }

      // Get both customers to determine genders for proper relationship mapping
      const [customer, relatedCustomer] = await Promise.all([
        prisma.customer.findUnique({ where: { id: customerId } }),
        prisma.customer.findUnique({ where: { id: relatedCustomerId } })
      ]);

      if (!customer || !relatedCustomer) {
        throw new Error("One or both customers not found");
      }

      // Calculate reverse relationship type
      const reverseRelationshipType = this.getReversedRelationship(
        relationshipType,
        relatedCustomer.gender
      );

      // Create both relationships in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create forward relationship
        const forwardRelation = await tx.guestRelationShip.create({
          data: {
            customerId,
            relatedCustomerId,
            relationshipType,
            reverseRelationshipType: reverseRelationshipType,
            canBookFor
          }
        });

        // Create reverse relationship
        const reverseRelation = await tx.guestRelationShip.create({
          data: {
            customerId: relatedCustomerId,
            relatedCustomerId: customerId,
            relationshipType: reverseRelationshipType,
            reverseRelationshipType: relationshipType,
            canBookFor: canBookFor // Same permission for both directions initially
          }
        });

        return { forwardRelation, reverseRelation };
      });

      return result;
    } catch (error) {
      console.error("Error creating relationship:", error);
      throw error;
    }
  }

  /**
   * Get all related guests for a customer
   */
  static async getRelatedGuests(customerId: string, includeDetails: boolean = true) {
    try {
      const relationships = await prisma.guestRelationShip.findMany({
        where: {
          customerId,
        },
        include: {
          relatedCustomer: includeDetails
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return relationships.map(rel => ({
        id: rel.id,
        relationshipType: rel.relationshipType,
        canBookFor: rel.canBookFor,
        customer: includeDetails ? {
          id: rel.relatedCustomer.id,
          firstName: rel.relatedCustomer.guestFirstName,
          middleName: rel.relatedCustomer.guestMiddleName,
          lastName: rel.relatedCustomer.guestLastName,
          email: rel.relatedCustomer.guestEmail,
          phone: rel.relatedCustomer.guestPhone,
          nationality: rel.relatedCustomer.guestNationality,
          dob: rel.relatedCustomer.dob,
          passportNumber: rel.relatedCustomer.passportNumber,
          passportExpiry: rel.relatedCustomer.passportExpiry,
          passportIssuedCountry: rel.relatedCustomer.passportIssuedCountry,
          gender: rel.relatedCustomer.gender,
          city: rel.relatedCustomer.city
        } : null,
        createdAt: rel.createdAt
      }));
    } catch (error) {
      console.error("Error fetching related guests:", error);
      throw error;
    }
  }

  /**
   * Get guests who can book on behalf of this customer
   */
  static async getAuthorizedBookers(customerId: string) {
    try {
      const relationships = await prisma.guestRelationShip.findMany({
        where: {
          relatedCustomerId: customerId,
          canBookFor: true
        },
        include: {
          customer: true
        }
      });

      return relationships.map(rel => ({
        id: rel.customer.id,
        name: `${rel.customer.guestFirstName} ${rel.customer.guestLastName}`,
        email: rel.customer.guestEmail,
        relationshipType: rel.reverseRelationshipType // Their relationship to this customer
      }));
    } catch (error) {
      console.error("Error fetching authorized bookers:", error);
      throw error;
    }
  }

  /**
   * Update relationship permissions
   */
  static async updateRelationshipPermissions(
    customerId: string,
    relatedCustomerId: string,
    canBookFor: boolean
  ) {
    try {
      const updated = await prisma.guestRelationShip.update({
        where: {
          customerId_relatedCustomerId: {
            customerId,
            relatedCustomerId
          }
        },
        data: {
          canBookFor
        }
      });

      return updated;
    } catch (error) {
      console.error("Error updating relationship permissions:", error);
      throw error;
    }
  }

  /**
   * Remove a bi-directional relationship
   */
  static async removeRelationship(customerId: string, relatedCustomerId: string) {
    try {
      // Delete both relationships in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Delete forward relationship
        const forward = await tx.guestRelationShip.delete({
          where: {
            customerId_relatedCustomerId: {
              customerId,
              relatedCustomerId
            }
          }
        });

        // Delete reverse relationship
        const reverse = await tx.guestRelationShip.delete({
          where: {
            customerId_relatedCustomerId: {
              customerId: relatedCustomerId,
              relatedCustomerId: customerId
            }
          }
        });

        return { forward, reverse };
      });

      return result;
    } catch (error) {
      console.error("Error removing relationship:", error);
      throw error;
    }
  }

  /**
   * Check if a customer can book on behalf of another
   */
  static async canBookForCustomer(bookerId: string, customerId: string): Promise<boolean> {
    try {
      // Customer can always book for themselves
      if (bookerId === customerId) {
        return true;
      }

      const relationship = await prisma.guestRelationShip.findUnique({
        where: {
          customerId_relatedCustomerId: {
            customerId: bookerId,
            relatedCustomerId: customerId
          }
        }
      });

      return relationship?.canBookFor || false;
    } catch (error) {
      console.error("Error checking booking permission:", error);
      return false;
    }
  }

  /**
   * Quick add multiple related guests to a booking
   */
  static async quickAddRelatedGuests(
    bookerId: string,
    relatedCustomerIds: string[],
    bookingId: string
  ) {
    try {
      // Verify the booker can book for all selected guests
      const verificationPromises = relatedCustomerIds.map(id => 
        this.canBookForCustomer(bookerId, id)
      );
      
      const permissions = await Promise.all(verificationPromises);
      const unauthorized = relatedCustomerIds.filter((id, index) => !permissions[index]);
      
      if (unauthorized.length > 0) {
        throw new Error(`Unauthorized to book for customers: ${unauthorized.join(', ')}`);
      }

      // Get all related customer details
      const relatedCustomers = await prisma.customer.findMany({
        where: {
          id: {
            in: relatedCustomerIds
          }
        }
      });
       
      const existingRelatedCustomer = await prisma.guestCheckInAccess.findMany({
        where: { customerId: { in: relatedCustomerIds } }
      })

      if (existingRelatedCustomer) {
        throw new Error("Guest already exist");
      }
      // Add guests to booking (this would integrate with your existing booking system)
      // This is a placeholder - you'd need to implement based on your booking structure
      const guestCheckInAccesses = await Promise.all(
        relatedCustomers.map(async customer => {
          const tokenExpiresAt = await this.calculateTokenExpiry(bookingId);
          return prisma.guestCheckInAccess.create({
            data: {
              customerId: customer.id,
              bookingId,
              accessToken: this.generateAccessToken(),
              tokenExpiresAt,
              isMainGuest: false,
              guestType: 'INVITED',
              invitationStatus: 'NOT_APPLICABLE',
              completionStatus: 'COMPLETE', // Assuming their details are already complete
              personalDetailsComplete: true,
              identityDetailsComplete: !!customer.passportNumber,
              addressDetailsComplete: !!customer.city
            },
            include: {
              customer: true
            }
          })
        })
      );

      // Update EventGuestRegistry with the added guests and create event participants if needed
      try {
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: {
            paymentIntent: {
              include: {
                eventGuestRegistries: true
              }
            }
          }
        });

        if (booking?.paymentIntent?.eventGuestRegistries?.[0]) {
          const registry = booking.paymentIntent.eventGuestRegistries[0];
          const paymentIntentId = booking.paymentIntent.id;
          
          // Get current sub-guests
          let currentSubGuests = [];
          if (registry.subGuests) {
            currentSubGuests = typeof registry.subGuests === 'string' 
              ? JSON.parse(registry.subGuests as string) 
              : registry.subGuests as any[];
          }

          const selectedEvents = registry.selectedEvents ? 
            (typeof registry.selectedEvents === 'string' ? 
              JSON.parse(registry.selectedEvents as string) : 
              registry.selectedEvents) : null;

          // Add all the new related guests to sub-guests and create event participants
          for (const customer of relatedCustomers) {
            const existingIndex = currentSubGuests.findIndex((g: any) => g.customerId === customer.id);
            
            const guestInfo = {
              customerId: customer.id,
              email: customer.guestEmail,
              name: `${customer.guestFirstName} ${customer.guestLastName}`,
              phone: customer.guestPhone || null,
              addedAt: new Date().toISOString(),
              type: 'related'
            };

            const isNewGuest = existingIndex === -1;
            if (isNewGuest) {
              currentSubGuests.push(guestInfo);
            } else {
              currentSubGuests[existingIndex] = guestInfo;
            }

            // Create event participants for new guests if there are selected events
            if (isNewGuest && selectedEvents) {
              for (const [enhancementId, eventData] of Object.entries(selectedEvents) as [string, any][]) {
                const plannedAttendees = eventData.plannedAttendees || 1;
                
                // Count existing participants for this event from this booking/registry
                const existingParticipantCount = await prisma.eventParticipant.count({
                  where: {
                    enhancementId: enhancementId,
                    registryId: registry.id
                  }
                });

                // Check if we've reached the planned attendee limit
                if (existingParticipantCount >= plannedAttendees) {
                  console.log(`[EventRegistry] Skipping event ${enhancementId} for guest ${customer.id} - already have ${existingParticipantCount}/${plannedAttendees} planned attendees`);
                  continue; // Skip this event, we've reached the planned limit
                }
                // Find the actual event
                const event = await prisma.event.findFirst({
                  where: {
                    eventEnhancements: {
                      some: {
                        enhancementId: enhancementId
                      }
                    },
                    status: {
                      in: ["IN_PROGRESS"]
                    }
                  },
                  include: {
                    eventEnhancements: {
                      where: {
                        enhancementId: enhancementId
                      },
                      include: {
                        enhancement: true
                      }
                    }
                  }
                });

                if (!event) continue;

                const existingParticipant = await prisma.eventParticipant.findFirst({
                  where: {
                    eventId: event.id,
                    customerId: customer.id,
                    enhancementId: enhancementId
                  }
                });

                if (!existingParticipant) {
                  await prisma.eventParticipant.create({
                    data: {
                      eventId: event.id,
                      customerId: customer.id,
                      bookingId: bookingId,
                      paymentIntentId: paymentIntentId,
                      enhancementId: enhancementId,
                      status: "PENDING",
                      addedBy: "MAIN_GUEST",
                      registryId: registry.id,
                      notes: `Related guest added to pre-registered event`
                    }
                  });

                  // Update event stats (only guest count, not revenue - already paid during booking)
                  await prisma.event.update({
                    where: { id: event.id },
                    data: {
                      totalGuests: {
                        increment: 1
                      }
                      // NO revenue increment - these events were already paid for during booking
                    }
                  });
                }
              }
            }
          }

          // Update registry
          await prisma.eventGuestRegistry.update({
            where: { id: registry.id },
            data: {
              subGuests: currentSubGuests,
              confirmedGuests: Math.min(currentSubGuests.length + 1, registry.totalGuestCount)
            }
          });

          // NO outstanding amount update - these events were already paid for during booking
          console.log(`[EventRegistry] Added ${relatedCustomers.length} related guests to registry ${registry.id} (pre-paid events)`);
        }
      } catch (error) {
        console.error("[EventRegistry] Error adding related guests with events:", error);
        // Non-critical, continue
      }

      return {
        added: relatedCustomers.length,
        guests: relatedCustomers,
        checkInAccesses: guestCheckInAccesses
      };
    } catch (error) {
      console.error("Error quick adding related guests:", error);
      throw error;
    }
  }

  /**
   * Get relationship statistics for a customer
   */
  static async getRelationshipStats(customerId: string) {
    try {
      const relationships = await prisma.guestRelationShip.groupBy({
        by: ['relationshipType'],
        where: {
          customerId
        },
        _count: {
          id: true
        }
      });

      const totalRelations = await prisma.guestRelationShip.count({
        where: {
          customerId
        }
      });

      const canBookForCount = await prisma.guestRelationShip.count({
        where: {
          customerId,
          canBookFor: true
        }
      });

      return {
        total: totalRelations,
        canBookFor: canBookForCount,
        byType: relationships.reduce((acc, curr) => {
          acc[curr.relationshipType] = curr._count.id;
          return acc;
        }, {} as Record<string, number>)
      };
    } catch (error) {
      console.error("Error fetching relationship stats:", error);
      throw error;
    }
  }

  /**
   * Search for existing customers to add as relations
   */
  static async searchCustomersForRelationship(
    searchTerm: string,
    excludeCustomerId: string,
    limit: number = 10
  ) {
    try {
      // Get already related customer IDs to exclude from search
      const existingRelations = await prisma.guestRelationShip.findMany({
        where: {
          customerId: excludeCustomerId
        },
        select: {
          relatedCustomerId: true
        }
      });

      const excludeIds = [excludeCustomerId, ...existingRelations.map(r => r.relatedCustomerId)];

      const customers = await prisma.customer.findMany({
        where: {
          id: {
            notIn: excludeIds
          },
          OR: [
            {
              guestEmail: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            },
            {
              guestFirstName: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            },
            {
              guestLastName: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            },
            {
              guestPhone: {
                contains: searchTerm
              }
            }
          ]
        },
        take: limit,
        select: {
          id: true,
          guestFirstName: true,
          guestMiddleName: true,
          guestLastName: true,
          guestEmail: true,
          guestPhone: true,
          gender: true
        }
      });

      return customers;
    } catch (error) {
      console.error("Error searching customers:", error);
      throw error;
    }
  }

  // Helper methods
  private static generateAccessToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  private static async calculateTokenExpiry(bookingId: string): Promise<Date> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { checkIn: true }
    });
    
    const expiry = new Date(booking?.checkIn || new Date());
    expiry.setDate(expiry.getDate() + 1);
    expiry.setHours(23, 59, 59, 999);
    
    return expiry;
  }
}