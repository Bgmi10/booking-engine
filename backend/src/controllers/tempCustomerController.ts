import express from "express";
import prisma from "../prisma";
import { handleError, responseHandler } from "../utils/helper";

export const getAllTempCustomers = async (req: express.Request, res: express.Response) => {
    try {
        const tempCustomers = await prisma.temporaryCustomer.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });
        responseHandler(res, 200, "success", tempCustomers);
    } catch (e) {
        console.error("Error fetching temporary customers:", e);
        handleError(res, e as Error);
    }
};

export const getTempCustomerChargePayments = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    if (!id) {
        responseHandler(res, 400, "Missing ID in params");
        return;
    }

    try {
        const charges = await prisma.charge.findMany({
            where: {
                tempCustomerId: id,
            },
            orderBy: {
                createdAt: "desc"
            },
        });

        responseHandler(res, 200, "success", { charges });
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
};

export const getTempCustomerOrders = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    if (!id) {
        responseHandler(res, 400, "Missing ID in params");
        return;
    }

    try {
        const orders = await prisma.order.findMany({
            where: {
                temporaryCustomerId: id
            },
            orderBy: {
                createdAt: "desc"
            },
        });

        responseHandler(res, 200, "success", { orders });
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}
