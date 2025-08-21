import prisma from "../prisma";
import { AuditService } from "./auditService";

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
  }) {
    const { groupName, isAutoGrouped, paymentIntentIds = [], userId, reason } = data;

    // Start transaction
    return await prisma.$transaction(async (tx) => {
      // Create the booking group
      const bookingGroup = await tx.bookingGroup.create({
        data: {
          groupName,
          isAutoGrouped,
          outstandingAmount: 0, // Will be calculated below
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

        // Create audit log for group creation
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

        // Create audit logs for each payment intent added to group
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
    }
  ) {
    const { groupName, userId, reason } = data;

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
        data: { groupName },
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
    reason?: string
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

      // Get payment intents to add
      const paymentIntents = await tx.paymentIntent.findMany({
        where: { 
          id: { in: paymentIntentIds },
          bookingGroupId: null, // Only unassigned payment intents
        },
        select: { id: true, outstandingAmount: true },
      });

      if (paymentIntents.length === 0) {
        throw new Error("No valid payment intents to add");
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
    reason?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // Get payment intents with their groups
      const paymentIntents = await tx.paymentIntent.findMany({
        where: { 
          id: { in: paymentIntentIds },
          bookingGroupId: { not: null },
        },
        select: { 
          id: true, 
          bookingGroupId: true, 
          outstandingAmount: true 
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

      // Update payment intents
      await tx.paymentIntent.updateMany({
        where: { id: { in: paymentIntentIds } },
        data: { bookingGroupId: null },
      });

      // Update group outstanding amounts
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

      // Create audit logs
      for (const paymentIntent of paymentIntents) {
        await AuditService.createAuditLog(tx, {
          entityType: "PAYMENT_INTENT",
          entityId: paymentIntent.id,
          actionType: "BOOKING_REMOVED_FROM_GROUP",
          userId,
          reason: reason || "Removed from booking group",
          previousValues: { bookingGroupId: paymentIntent.bookingGroupId },
          newValues: { bookingGroupId: null },
          changedFields: ["bookingGroupId"],
          paymentIntentId: paymentIntent.id,
          bookingGroupId: paymentIntent.bookingGroupId ?? "",
        });
      }

      return { removedCount: paymentIntents.length };
    });
  }

  /**
   * Delete a booking group (only if empty)
   */
  static async deleteBookingGroup(groupId: string, userId: string, reason?: string) {
    return await prisma.$transaction(async (tx) => {
      // Check if group has any payment intents
      const paymentIntentCount = await tx.paymentIntent.count({
        where: { bookingGroupId: groupId },
      });

      if (paymentIntentCount > 0) {
        throw new Error("Cannot delete group with payment intents. Remove all payment intents first.");
      }

      // Check if group has any orders
      const orderCount = await tx.order.count({
        where: { bookingGroupId: groupId },
      });

      if (orderCount > 0) {
        throw new Error("Cannot delete group with orders. Remove all orders first.");
      }

      // Get group data before deletion
      const group = await tx.bookingGroup.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        throw new Error("Booking group not found");
      }

      // Create audit log before deletion - don't reference bookingGroupId to avoid cascade deletion
      console.log(userId)
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

 
  /**
   * Get booking group with full details
   */
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