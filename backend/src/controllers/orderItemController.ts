import express from "express";
import { handleError, responseHandler } from "../utils/helper";
import prisma from "../prisma";

export const createOrderItem = async (req: express.Request, res: express.Response) => {
    const { name, description, price, imageUrl } = req.body;

    if (!name || !description || !price || !imageUrl) {
        responseHandler(res, 400, "Missing body");
        return;
    }

    try {
        await prisma.orderItem.create({
            data: {
                name,
                imageUrl,
                description,
                price,
            }
        });
        responseHandler(res, 201, "OrderItem created successfully");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const updateOrderItem = async (req: express.Request, res: express.Response) => {
    const { name, description, price, imageUrl, isAvailable } = req.body;
    const { id } = req.params;

    if (!id) {
        responseHandler(res, 400, "Missing id in params");
        return;
    }

    // Dynamically build the data object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

    if (Object.keys(updateData).length === 0) {
        responseHandler(res, 400, "No valid fields to update");
        return;
    }

    try {
        await prisma.orderItem.update({
            where: { id },
            data: updateData
        });
        responseHandler(res, 200, "OrderItem updated successfully");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
};


export const deleteOrderItem = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    if (!id) {
        responseHandler(res, 400, "Missing id in params");
        return;
    }

    try {
        await prisma.orderItem.delete({
           where: { id }
        });
        responseHandler(res, 200, "OrderItem deleted successfully");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const getAllOrderItem = async (req: express.Request, res: express.Response) => {
    try {
        const orderItems = await prisma.orderItem.findMany();
        responseHandler(res, 200, "success", orderItems);
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

