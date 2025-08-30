import { BookingType } from "@prisma/client";
import prisma from "../prisma";
import { responseHandler } from "../utils/helper";
import { AuditService } from "./auditService";
import express from "express"

export class BookingGroupService {
  /**
   * Create a new booking group
   */
  static async createBookingGroup(data: {
    groupName?: string;
    isAutoGrouped: boolean;
    paymentIntentIds?: string[];
    userId: string;
    reason?: string;
    bookingType: BookingType;
    mainGuestId?: string
    emailToMainGuestOnly?: boolean
  }, res?: express.Response) {
    const { groupName, isAutoGrouped, paymentIntentIds = [], userId, reason, mainGuestId, bookingType, emailToMainGuestOnly } = data;

    // Start transaction
    return await prisma.$transaction(async (tx) => {
      // If payment intents provided, check for existing payments first
      if (paymentIntentIds.length > 0) {
        // Get payment intents with payments and orders
        const paymentIntentsWithPaymentsOrOrders = await tx.paymentIntent.findMany({
          where: { 
            id: { in: paymentIntentIds },
            OR: [
              { charges: { some: {} } },
              { orders: { some: {} } }
            ]
          },
          select: { 
            id: true,
            charges: { select: { id: true } },
            orders: { select: { id: true } }
          },
        });

        if (paymentIntentsWithPaymentsOrOrders.length > 0) {
          if (res) {
            responseHandler(res, 400, "Cannot create group: One or more bookings have existing payments or orders. Please remove them first.");
            return null;
          } else {
            throw new Error("Cannot create group: One or more bookings have existing payments or orders.");
          }
        }
      }

      // Create the booking group
      const bookingGroup = await tx.bookingGroup.create({
        data: {
          groupName,
          isAutoGrouped,
          outstandingAmount: 0, 
          mainGuestId,
          bookingType,
          emailToMainGuestOnly
        },
      });

      // If payment intents provided, link them to the group
      if (paymentIntentIds.length > 0) {
        // Get payment intents to calculate outstanding amount
        const paymentIntents = await tx.paymentIntent.findMany({
          where: { id: { in: paymentIntentIds } },
          select: { 
            id: true, 
            outstandingAmount: true,
            bookingData: true,
            customerData: true,
          },
        });

        // Calculate total outstanding amount for the group
        const totalOutstanding = paymentIntents.reduce(
          (sum, pi) => sum + (pi.outstandingAmount || 0),
          0
        );

        // Update payment intents to link to group
        await tx.paymentIntent.updateMany({
          where: { id: { in: paymentIntentIds } },
          data: { bookingGroupId: bookingGroup.id },
        });

        // Update booking group with calculated outstanding amount
        await tx.bookingGroup.update({
          where: { id: bookingGroup.id },
          data: { outstandingAmount: totalOutstanding },
        });

        // Create audit log for group creation (skip for system-generated groups)
        if (userId !== 'SYSTEM') {
          await AuditService.createAuditLog(tx, {
            entityType: "BOOKING_GROUP",
            entityId: bookingGroup.id,
            actionType: "GROUP_CREATED",
            userId,
            reason: reason || `${isAutoGrouped ? 'Auto' : 'Manual'} group creation`,
            newValues: {
              groupName,
              isAutoGrouped,
              paymentIntentCount: paymentIntentIds.length,
              outstandingAmount: totalOutstanding,
            },
            bookingGroupId: bookingGroup.id,
          });
        } else {
          console.log(`[BookingGroupService] Auto-created group ${bookingGroup.id} without audit log (system-generated)`);
        }

        // Create audit logs for each payment intent added to group (skip for system-generated groups)
        if (userId !== 'SYSTEM') {
          for (const paymentIntent of paymentIntents) {
            await AuditService.createAuditLog(tx, {
              entityType: "PAYMENT_INTENT",
              entityId: paymentIntent.id,
              actionType: "BOOKING_ADDED_TO_GROUP",
              userId,
              reason: `Added to ${isAutoGrouped ? 'auto-created' : 'manual'} group`,
              previousValues: { bookingGroupId: null },
              newValues: { bookingGroupId: bookingGroup.id },
              changedFields: ["bookingGroupId"],
              paymentIntentId: paymentIntent.id,
              bookingGroupId: bookingGroup.id,
            });
          }
        }
      }

      return bookingGroup;
    });
  }

  /**
   * Update booking group details
   */
  static async updateBookingGroup(
    groupId: string,
    data: {
      groupName?: string;
      userId: string;
      reason?: string;
      mainGuestId?: string,
      emailToMainGuestOnly?: boolean;
      bookingType: BookingType
    }
  ) {
    const { groupName, userId, reason, mainGuestId, bookingType, emailToMainGuestOnly } = data;

    return await prisma.$transaction(async (tx) => {
      // Get current group data
      const currentGroup = await tx.bookingGroup.findUnique({
        where: { id: groupId },
      });

      if (!currentGroup) {
        throw new Error("Booking group not found");
      }

      // Update the group
      const updatedGroup = await tx.bookingGroup.update({
        where: { id: groupId },
        data: { groupName, mainGuestId, bookingType: bookingType, emailToMainGuestOnly },
      });

      // Create audit log
      await AuditService.createAuditLog(tx, {
        entityType: "BOOKING_GROUP",
        entityId: groupId,
        actionType: "GROUP_UPDATED",
        userId,
        reason: reason || "Group details updated",
        previousValues: { groupName: currentGroup.groupName },
        newValues: { groupName },
        changedFields: ["groupName"],
        bookingGroupId: groupId,
      });

      return updatedGroup;
    });
  }

  /**
   * Add payment intents to an existing group
   */
  static async addPaymentIntentsToGroup(
    groupId: string,
    paymentIntentIds: string[],
    userId: string,
    reason?: string,
    res?: any
  ) {
    return await prisma.$transaction(async (tx) => {
      // Verify group exists
      const group = await tx.bookingGroup.findUnique({
        where: { id: groupId },
        select: { id: true, outstandingAmount: true },
      });

      if (!group) {
        throw new Error("Booking group not found");
      }

      // Get payment intents to add with their payments
      const paymentIntents = await tx.paymentIntent.findMany({
        where: { 
          id: { in: paymentIntentIds },
          bookingGroupId: null,
          status: "SUCCEEDED" // Only unassigned payment intents
        },
        select: { 
          id: true, 
          outstandingAmount: true,
          payments: {
            where: {
              status: { in: ['COMPLETED', 'REFUNDED'] }
            }
          },
          charges: {
            where: {
              status: { in: ['SUCCEEDED', 'REFUNDED'] }
            }
          }
        },
      });

      if (paymentIntents.length === 0) {
        throw new Error("No valid payment intents to add");
      }

      // Check if any payment intents have received payments
      const paymentIntentsWithPayments = paymentIntents.filter(
        pi => pi.charges.length > 0
      );

      if (paymentIntentsWithPayments.length > 0) {
        responseHandler(res, 400, "Cannot merge due to payments already received. Please manually remove payments and re-add to group if needed.");
        return;
      }

      // Calculate additional outstanding amount
      const additionalOutstanding = paymentIntents.reduce(
        (sum, pi) => sum + (pi.outstandingAmount || 0),
        0
      );

      // Update payment intents
      await tx.paymentIntent.updateMany({
        where: { id: { in: paymentIntents.map(pi => pi.id) } },
        data: { bookingGroupId: groupId },
      });

      // Update group outstanding amount
      const newOutstandingAmount = (group.outstandingAmount || 0) + additionalOutstanding;
      await tx.bookingGroup.update({
        where: { id: groupId },
        data: { outstandingAmount: newOutstandingAmount },
      });

      // Create audit logs
      for (const paymentIntent of paymentIntents) {
        await AuditService.createAuditLog(tx, {
          entityType: "PAYMENT_INTENT",
          entityId: paymentIntent.id,
          actionType: "BOOKING_ADDED_TO_GROUP",
          userId,
          reason: reason || "Added to booking group",
          previousValues: { bookingGroupId: null },
          newValues: { bookingGroupId: groupId },
          changedFields: ["bookingGroupId"],
          paymentIntentId: paymentIntent.id,
          bookingGroupId: groupId,
        });
      }

      return { addedCount: paymentIntents.length, newOutstandingAmount };
    });
  }

  /**
   * Remove payment intents from a group
   */
  static async removePaymentIntentsFromGroup(
    paymentIntentIds: string[],
    userId: string,
    reason?: string,
    keepCharges: boolean = false
  ) {
    return await prisma.$transaction(async (tx) => {
      // Get payment intents with their groups, orders, and bookings
      const paymentIntents = await tx.paymentIntent.findMany({
        where: { 
          id: { in: paymentIntentIds },
          bookingGroupId: { not: null },
        },
        select: { 
          id: true, 
          bookingGroupId: true, 
          outstandingAmount: true,
          bookings: {
            select: {
              id: true
            }
          },
          orders: {
            select: {
              id: true,
              total: true
            }
          }
        },
      });

      if (paymentIntents.length === 0) {
        throw new Error("No payment intents found in groups");
      }

      // Group by booking group for updating outstanding amounts
      const groupUpdates = new Map<string, number>();
      for (const pi of paymentIntents) {
        if (pi.bookingGroupId) {
          const current = groupUpdates.get(pi.bookingGroupId) || 0;
          groupUpdates.set(pi.bookingGroupId, current + (pi.outstandingAmount || 0));
        }
      }

      // Handle orders based on keepCharges flag
      if (keepCharges) {
        // If keeping orders, move them to be directly linked to the group
        for (const pi of paymentIntents) {
          // Update orders to be linked directly to the booking group
          if (pi.orders.length > 0) {
            await tx.order.updateMany({
              where: {
                paymentIntentId: pi.id
              },
              data: {
                paymentIntentId: null,
                bookingGroupId: pi.bookingGroupId
              }
            });
          }
        }
      }

      // Create audit logs BEFORE deleting payment intents
      for (const paymentIntent of paymentIntents) {
        const orderInfo = keepCharges 
          ? `Orders kept with group (${paymentIntent.orders.length} orders)`
          : `Orders deleted (${paymentIntent.orders.length} orders removed)`;
          
        await AuditService.createAuditLog(tx, {
          entityType: "BOOKING_GROUP",
          entityId: paymentIntent.bookingGroupId || "",
          actionType: "BOOKING_REMOVED_FROM_GROUP",
          userId,
          reason: `${reason || "Removed from booking group"} - ${orderInfo}`,
          previousValues: { 
            paymentIntentId: paymentIntent.id,
            keepOrders: keepCharges,
            orderCount: paymentIntent.orders.length,
            outstandingAmount: paymentIntent.outstandingAmount,
            bookingCount: paymentIntent.bookings.length
          },
          newValues: { 
            paymentIntentDeleted: true
          },
          changedFields: ["paymentIntents"],
          bookingGroupId: paymentIntent.bookingGroupId ?? "",
          notes: `Booking ${paymentIntent.id} deleted. ${keepCharges ? "Orders kept with group" : "All orders deleted"}. ${paymentIntent.bookings.length} rooms released.`
        });
      }

      // Delete all bookings first (rooms go back for sale)
      for (const pi of paymentIntents) {
        if (pi.bookings.length > 0) {
          await tx.booking.deleteMany({
            where: { paymentIntentId: pi.id }
          });
        }
      }

      // Delete the payment intents entirely
      await tx.paymentIntent.deleteMany({
        where: { id: { in: paymentIntentIds } }
      });

      // Update group outstanding amounts only if NOT keeping charges
      // If keeping charges, the financial obligations remain with the group
      if (!keepCharges) {
        for (const [groupId, amountToRemove] of groupUpdates) {
          const group = await tx.bookingGroup.findUnique({
            where: { id: groupId },
            select: { outstandingAmount: true },
          });

          if (group) {
            const newAmount = Math.max(0, (group.outstandingAmount || 0) - amountToRemove);
            await tx.bookingGroup.update({
              where: { id: groupId },
              data: { outstandingAmount: newAmount },
            });
          }
        }
      }

      return { 
        removedCount: paymentIntents.length,
        keepOrders: keepCharges,
        deletedOrdersCount: keepCharges ? 0 : paymentIntents.reduce((sum, pi) => sum + pi.orders.length, 0)
      };
    });
  }

  static async deleteBookingGroup(groupId: string, userId: string, reason?: string, res?: any) {
    return await prisma.$transaction(async (tx) => {
      // Check if group has any payment intents
      const paymentIntentCount = await tx.paymentIntent.count({
        where: { bookingGroupId: groupId },
      });

      if (paymentIntentCount > 0) {
        responseHandler(res, 400, "Cannot delete group with payment intents. Remove all payment intents first.");
        return;
      }
      
      const group = await tx.bookingGroup.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        responseHandler(res, 400, "Booking group not found");
        return;
      }

      await AuditService.createAuditLog(tx, {
        entityType: "BOOKING_GROUP",
        entityId: groupId,
        actionType: "GROUP_DELETED",
        userId,
        reason: reason || "Group deleted",
        previousValues: group,
        notes: `Booking group "${group.groupName || 'Unnamed Group'}" (ID: ${groupId}) was deleted`,
        // Don't set bookingGroupId to avoid cascade deletion
      });

      // Delete the group after creating audit log
      await tx.bookingGroup.delete({
        where: { id: groupId },
      });

      return { deleted: true };
    });
  }
  static async getBookingGroupDetails(groupId: string) {
    return await prisma.bookingGroup.findUnique({
      where: { id: groupId },
      include: {
        paymentIntents: {
          include: {
            bookings: {
              include: {
                room: true,
                customer: true,
              },
            },
            charges: true,
            orders: true,
          },
        },
        charges: {
          include: {
            customer: true,
          },
        },
        orders: {
          include: {
            customer: true,
          },
        },
        auditLogs: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  /**
   * Check if payment intents should be auto-grouped
   */
  static async checkAutoGrouping(paymentIntentIds: string[]): Promise<boolean> {
    // Get general settings
    const settings = await prisma.generalSettings.findFirst();
    const threshold = settings?.autoGroupingRoomCount || 2;

    // Count total number of bookings across all payment intents
    const bookingCount = await prisma.booking.count({
      where: {
        paymentIntentId: { in: paymentIntentIds },
      },
    });

    return bookingCount >= threshold;
  }
}