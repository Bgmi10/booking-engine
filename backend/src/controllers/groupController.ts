import express from "express";
import { handleError, responseHandler } from "../utils/helper";
import prisma from "../prisma";
import { v4 as uuidv4 } from 'uuid';

export const createBookingsGroup = async (req: express.Request, res: express.Response) => {
    const { bookingIds, groupName, primaryEmail } = req.body;

    if (!bookingIds || !groupName || !primaryEmail) {
        responseHandler(res, 400, "Missing body");
        return;
    }

    try {
        const groupId = uuidv4();
        await prisma.booking.updateMany({
            where: { id: { in: bookingIds }},
            data: {
                groupId
            }
        });

        await prisma.customer.updateMany({
            where: { 
              bookings: { some: { id: { in: bookingIds } } }
            },
            data: { groupName, groupEmail: primaryEmail }
        });

        responseHandler(res, 200, "success");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}