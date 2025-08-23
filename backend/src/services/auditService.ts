import prisma from "../prisma";
import { AuditEntityType, AuditActionType } from "@prisma/client";

export interface AuditLogData {
  entityType: AuditEntityType;
  entityId: string;
  actionType: AuditActionType;
  userId: string;
  reason?: string;
  notes?: string;
  previousValues?: any;
  newValues?: any;
  changedFields?: string[];
  paymentIntentId?: string;
  bookingId?: string;
  bookingGroupId?: string;
}

export class AuditService {
  /**
   * Create an audit log entry
   */
  static async createAuditLog(tx: any, data: AuditLogData) {
    try {
      // Use transaction context if provided, otherwise use prisma directly
      const db = tx || prisma;
      
      // First validate that the user exists
      const userExists = await db.user.findUnique({
        where: { id: data.userId },
        select: { id: true, name: true, email: true }
      });

      if (!userExists) {
        console.error(`User ${data.userId} not found in database for audit log`);
        throw new Error(`Invalid user ID for audit log: ${data.userId}`);
      }

      // Check if bookingGroupId exists before creating audit log
      let validBookingGroupId = data.bookingGroupId;
      if (data.bookingGroupId) {
        const groupExists = await db.bookingGroup.findUnique({
          where: { id: data.bookingGroupId },
          select: { id: true }
        });
        
        if (!groupExists) {
          console.warn(`BookingGroup ${data.bookingGroupId} not found. Creating audit log without bookingGroupId reference.`);
          validBookingGroupId = undefined;
        }
      }

      const auditLog = await db.bookingAuditLog.create({
        data: {
          entityType: data.entityType,
          entityId: data.entityId,
          actionType: data.actionType,
          userId: data.userId,
          reason: data.reason,
          notes: data.notes || (data.bookingGroupId && !validBookingGroupId ? `[Note: Original booking group ${data.bookingGroupId} was deleted]` : undefined),
          previousValues: data.previousValues,
          newValues: data.newValues,
          changedFields: data.changedFields || [],
          paymentIntentId: data.paymentIntentId,
          bookingId: data.bookingId,
          bookingGroupId: validBookingGroupId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      console.log(`Audit log created: ${data.actionType} on ${data.entityType} by user ${userExists.name} (${data.userId})`);
      return auditLog;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      throw error;
    }
  }

  /**
   * Log PaymentIntent cancellation
   */
  static async logPaymentIntentCancellation(
    paymentIntentId: string,
    userId: string,
    reason?: string,
    willRefund?: boolean,
    bookingGroupId?: string
  ) {
    // Create the primary payment intent cancellation log
    const auditLog = await this.createAuditLog(null, {
      entityType: "PAYMENT_INTENT",
      entityId: paymentIntentId,
      actionType: "CANCELLED",
      userId,
      reason,
      notes: willRefund ? "Cancellation with refund" : "Cancellation without refund",
      paymentIntentId,
      bookingGroupId,
    });

    // If this payment intent belongs to a booking group, also create a booking group audit log
    if (bookingGroupId) {
      await this.logBookingGroupCancellation(
        bookingGroupId,
        paymentIntentId,
        userId,
        reason,
        willRefund
      );
    }

    return auditLog;
  }

  /**
   * Log PaymentIntent refund
   */
  static async logPaymentIntentRefund(
    paymentIntentId: string,
    userId: string,
    reason?: string,
    refundAmount?: number,
    bookingGroupId?: string
  ) {
    // Create the primary payment intent refund log
    const auditLog = await this.createAuditLog(null, {
      entityType: "PAYMENT_INTENT",
      entityId: paymentIntentId,
      actionType: "REFUNDED",
      userId,
      reason,
      notes: refundAmount ? `Refund amount: €${refundAmount}` : undefined,
      paymentIntentId,
      bookingGroupId,
    });

    // If this payment intent belongs to a booking group, also create a booking group audit log
    if (bookingGroupId) {
      await this.logBookingGroupRefund(
        bookingGroupId,
        paymentIntentId,
        userId,
        reason,
        refundAmount
      );
    }

    return auditLog;
  }

  /**
   * Log PaymentIntent edit/update
   */
  static async logPaymentIntentEdit(
    paymentIntentId: string,
    userId: string,
    previousValues: any,
    newValues: any,
    changedFields: string[],
    reason?: string,
    bookingGroupId?: string
  ) {
    // Create the primary payment intent edit log
    const auditLog = await this.createAuditLog(null, {
      entityType: "PAYMENT_INTENT",
      entityId: paymentIntentId,
      actionType: "EDITED",
      userId,
      reason,
      previousValues,
      newValues,
      changedFields,
      paymentIntentId,
      bookingGroupId,
    });

    // If this payment intent belongs to a booking group, also create a booking group audit log
    if (bookingGroupId) {
      await this.logBookingGroupPaymentIntentChange(
        bookingGroupId,
        paymentIntentId,
        userId,
        "EDITED",
        previousValues,
        newValues,
        changedFields,
        reason
      );
    }

    return auditLog;
  }

  /**
   * Log room change
   */
  static async logRoomChange(
    bookingId: string,
    paymentIntentId: string,
    userId: string,
    previousRoomId: string,
    newRoomId: string,
    reason?: string,
    priceDifference?: number
  ) {
    return this.createAuditLog(null, {
      entityType: "ROOM_CHANGE",
      entityId: bookingId,
      actionType: "ROOM_CHANGED",
      userId,
      reason,
      notes: priceDifference ? `Price difference: €${priceDifference}` : undefined,
      previousValues: { roomId: previousRoomId },
      newValues: { roomId: newRoomId },
      changedFields: ["roomId"],
      paymentIntentId,
      bookingId,
    });
  }

  /**
   * Log booking edit (dates, guest info, etc.)
   */
  static async logBookingEdit(
    bookingId: string,
    paymentIntentId: string,
    userId: string,
    previousValues: any,
    newValues: any,
    changedFields: string[],
    reason?: string
  ) {
    const actionType = changedFields.includes("checkIn") || changedFields.includes("checkOut")
      ? "DATES_CHANGED" 
      : "EDITED";

    return this.createAuditLog(null, {
      entityType: "BOOKING",
      entityId: bookingId,
      actionType,
      userId,
      reason,
      previousValues,
      newValues,
      changedFields,
      paymentIntentId,
      bookingId,
    });
  }

  /**
   * Log guest information changes
   */
  static async logGuestInfoChange(
    paymentIntentId: string,
    userId: string,
    previousValues: any,
    newValues: any,
    changedFields: string[],
    reason?: string
  ) {
    return this.createAuditLog(null, {
      entityType: "GUEST_INFO_CHANGE",
      entityId: paymentIntentId,
      actionType: "GUEST_INFO_CHANGED",
      userId,
      reason,
      previousValues,
      newValues,
      changedFields,
      paymentIntentId,
    });
  }

  /**
   * Log pricing changes
   */
  static async logPricingChange(
    paymentIntentId: string,
    userId: string,
    previousAmount: number,
    newAmount: number,
    reason?: string
  ) {
    return this.createAuditLog(null, {
      entityType: "PRICING_CHANGE",
      entityId: paymentIntentId,
      actionType: "PRICING_CHANGED",
      userId,
      reason,
      previousValues: { amount: previousAmount },
      newValues: { amount: newAmount },
      changedFields: ["amount", "totalAmount"],
      paymentIntentId,
    });
  }

  /**
   * Get audit logs for a PaymentIntent
   */
  static async getPaymentIntentAuditLogs(paymentIntentId: string) {
    return prisma.bookingAuditLog.findMany({
      where: { paymentIntentId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get audit logs for a Booking
   */
  static async getBookingAuditLogs(bookingId: string) {
    return prisma.bookingAuditLog.findMany({
      where: { bookingId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get all audit logs with pagination
   */
  static async getAllAuditLogs(
    page: number = 1,
    limit: number = 50,
    entityType?: AuditEntityType,
    actionType?: AuditActionType,
    userId?: string
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (entityType) where.entityType = entityType;
    if (actionType) where.actionType = actionType;
    if (userId) where.userId = userId;

    const [auditLogs, total] = await Promise.all([
      prisma.bookingAuditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          paymentIntent: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
            },
          },
          booking: {
            select: {
              id: true,
              checkIn: true,
              checkOut: true,
              room: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.bookingAuditLog.count({ where }),
    ]);

    return {
      auditLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Log booking group related payment intent changes
   */
  static async logBookingGroupPaymentIntentChange(
    bookingGroupId: string,
    paymentIntentId: string,
    userId: string,
    actionType: string,
    previousValues: any,
    newValues: any,
    changedFields: string[],
    reason?: string
  ) {
    return this.createAuditLog(null, {
      entityType: "BOOKING_GROUP",
      entityId: bookingGroupId,
      actionType: actionType as any,
      userId,
      reason: reason || `Payment intent ${paymentIntentId.slice(-8)} modified in booking group`,
      previousValues,
      newValues,
      changedFields,
      paymentIntentId,
      bookingGroupId,
    });
  }

  /**
   * Log booking group refund
   */
  static async logBookingGroupRefund(
    bookingGroupId: string,
    paymentIntentId: string,
    userId: string,
    reason?: string,
    refundAmount?: number
  ) {
    return this.createAuditLog(null, {
      entityType: "BOOKING_GROUP",
      entityId: bookingGroupId,
      actionType: "REFUNDED",
      userId,
      reason: reason || `Payment intent ${paymentIntentId.slice(-8)} refunded`,
      notes: refundAmount ? `Refund amount: €${refundAmount}` : undefined,
      paymentIntentId,
      bookingGroupId,
    });
  }

  /**
   * Log booking group cancellation
   */
  static async logBookingGroupCancellation(
    bookingGroupId: string,
    paymentIntentId: string,
    userId: string,
    reason?: string,
    willRefund?: boolean
  ) {
    return this.createAuditLog(null, {
      entityType: "BOOKING_GROUP",
      entityId: bookingGroupId,
      actionType: "CANCELLED",
      userId,
      reason: reason || `Payment intent ${paymentIntentId.slice(-8)} cancelled`,
      notes: willRefund ? "Cancellation with refund" : "Cancellation without refund",
      paymentIntentId,
      bookingGroupId,
    });
  }

  /**
   * Get audit logs for a Booking Group
   */
  static async getBookingGroupAuditLogs(bookingGroupId: string) {
    return prisma.bookingAuditLog.findMany({
      where: { 
        OR: [
          { bookingGroupId },
          { 
            paymentIntent: {
              bookingGroupId
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Helper to detect changed fields between two objects
   */
  static detectChangedFields(oldObj: any, newObj: any): string[] {
    const changedFields: string[] = [];
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);

    for (const key of allKeys) {
      if (JSON.stringify(oldObj?.[key]) !== JSON.stringify(newObj?.[key])) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }
}

export default AuditService;