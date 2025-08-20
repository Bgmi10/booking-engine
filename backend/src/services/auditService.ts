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
}

export class AuditService {
  /**
   * Create an audit log entry
   */
  static async createAuditLog(data: AuditLogData) {
    try {
      // First validate that the user exists
      const userExists = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true, name: true, email: true }
      });

      if (!userExists) {
        console.error(`User ${data.userId} not found in database for audit log`);
        throw new Error(`Invalid user ID for audit log: ${data.userId}`);
      }

      const auditLog = await prisma.bookingAuditLog.create({
        data: {
          entityType: data.entityType,
          entityId: data.entityId,
          actionType: data.actionType,
          userId: data.userId,
          reason: data.reason,
          notes: data.notes,
          previousValues: data.previousValues,
          newValues: data.newValues,
          changedFields: data.changedFields || [],
          paymentIntentId: data.paymentIntentId,
          bookingId: data.bookingId,
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
    willRefund?: boolean
  ) {
    return this.createAuditLog({
      entityType: "PAYMENT_INTENT",
      entityId: paymentIntentId,
      actionType: "CANCELLED",
      userId,
      reason,
      notes: willRefund ? "Cancellation with refund" : "Cancellation without refund",
      paymentIntentId,
    });
  }

  /**
   * Log PaymentIntent refund
   */
  static async logPaymentIntentRefund(
    paymentIntentId: string,
    userId: string,
    reason?: string,
    refundAmount?: number
  ) {
    return this.createAuditLog({
      entityType: "PAYMENT_INTENT",
      entityId: paymentIntentId,
      actionType: "REFUNDED",
      userId,
      reason,
      notes: refundAmount ? `Refund amount: €${refundAmount}` : undefined,
      paymentIntentId,
    });
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
    reason?: string
  ) {
    return this.createAuditLog({
      entityType: "PAYMENT_INTENT",
      entityId: paymentIntentId,
      actionType: "EDITED",
      userId,
      reason,
      previousValues,
      newValues,
      changedFields,
      paymentIntentId,
    });
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
    return this.createAuditLog({
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

    return this.createAuditLog({
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
    return this.createAuditLog({
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
    return this.createAuditLog({
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