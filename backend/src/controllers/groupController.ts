import express from "express";
import { handleError, responseHandler } from "../utils/helper";
import prisma from "../prisma";
import { BookingGroupService } from "../services/bookingGroupService";
// New comprehensive booking group endpoints
export const createBookingGroup = async (req: express.Request, res: express.Response) => {
    try {
        const { groupName, paymentIntentIds, reason, mainGuestId, bookingType, emailToMainGuestOnly } = req.body;
        //@ts-ignore
        const userId = req.user!.id;

        if (!paymentIntentIds || !Array.isArray(paymentIntentIds) || paymentIntentIds.length === 0) {
            responseHandler(res, 400, "Payment intent IDs are required");
            return;
        }

        const bookingGroup = await BookingGroupService.createBookingGroup({
            groupName,
            isAutoGrouped: false,
            paymentIntentIds,
            userId,
            reason,
            mainGuestId,
            bookingType,
            emailToMainGuestOnly
        }, res);

        if (bookingGroup) {
            responseHandler(res, 201, "Booking group created successfully", bookingGroup);
        }
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const updateBookingGroup = async (req: express.Request, res: express.Response) => {
    try {
        const { id } = req.params;
        const { groupName, reason, mainGuestId, bookingType, emailToMainGuestOnly } = req.body;
        //@ts-ignore
        const userId = req.user!.id;

        const updatedGroup = await BookingGroupService.updateBookingGroup(id, {
            groupName,
            userId,
            reason,
            mainGuestId,
            bookingType,
            emailToMainGuestOnly
        });

        responseHandler(res, 200, "Booking group updated successfully", updatedGroup);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const addPaymentIntentsToGroup = async (req: express.Request, res: express.Response) => {
    try {
        const { id } = req.params;
        const { paymentIntentIds, reason } = req.body;
        //@ts-ignore
        const userId = req.user!.id;

        if (!paymentIntentIds || !Array.isArray(paymentIntentIds)) {
            responseHandler(res, 400, "Payment intent IDs are required");
            return;
        }

        const result = await BookingGroupService.addPaymentIntentsToGroup(
            id,
            paymentIntentIds,
            userId,
            reason,
            res
        );

        responseHandler(res, 200, "Payment intents added to group", result);    
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const removePaymentIntentsFromGroup = async (req: express.Request, res: express.Response) => {
    try {
        const { paymentIntentIds, reason, keepCharges = false } = req.body;
        //@ts-ignore
        const userId = req.user!.id;

        if (!paymentIntentIds || !Array.isArray(paymentIntentIds)) {
            responseHandler(res, 400, "Payment intent IDs are required");
            return;
        }

        const result = await BookingGroupService.removePaymentIntentsFromGroup(
            paymentIntentIds,
            userId,
            reason,
            keepCharges
        );

        responseHandler(res, 200, "Payment intents removed from group", result);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const deleteBookingGroup = async (req: express.Request, res: express.Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        //@ts-ignore
        const userId = req.user!.id;

        const result = await BookingGroupService.deleteBookingGroup(id, userId, reason, res);

        responseHandler(res, 200, "Booking group deleted successfully", result);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const getBookingGroup = async (req: express.Request, res: express.Response) => {
    try {
        const { id } = req.params;

        const bookingGroup = await BookingGroupService.getBookingGroupDetails(id);

        if (!bookingGroup) {
            responseHandler(res, 404, "Booking group not found");
            return;
        }

        responseHandler(res, 200, "Booking group retrieved successfully", bookingGroup);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const getAllBookingGroups = async (req: express.Request, res: express.Response) => {
    try {
        const bookingGroups = await prisma.bookingGroup.findMany({
            include: {
                paymentIntents: {
                    include: {
                        bookings: {
                            include: {
                                room: true,
                            },
                        },
                        customer: true,
                    },
                },
                _count: {
                    select: {
                        paymentIntents: true,
                        charges: true,
                        orders: true,
                    },
                },
                orders: true,
                charges: true
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        responseHandler(res, 200, "Booking groups retrieved successfully", bookingGroups);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const getBookingGroupAuditLogs = async (req: express.Request, res: express.Response) => {
    try {
        const { id } = req.params;

        const auditLogs = await prisma.bookingAuditLog.findMany({
            where: {
                OR: [
                    { bookingGroupId: id },
                    { 
                        AND: [
                            { entityType: "BOOKING_GROUP" },
                            { entityId: id }
                        ]
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
            orderBy: {
                createdAt: 'desc',
            },
        });

        responseHandler(res, 200, "Audit logs retrieved successfully", auditLogs);
    } catch (error) {
        handleError(res, error as Error);
    }
};

// Get all deletion audit logs
export const getAllDeletionAuditLogs = async (req: express.Request, res: express.Response) => {
    try {
        const auditLogs = await prisma.bookingAuditLog.findMany({
            where: {
                actionType: "GROUP_DELETED"
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        responseHandler(res, 200, "Deletion audit logs retrieved successfully", auditLogs);
    } catch (error) {
        handleError(res, error as Error);
    }
};