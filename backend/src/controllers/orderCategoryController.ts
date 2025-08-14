import express from "express";
import { handleError, responseHandler } from "../utils/helper";
import prisma from "../prisma";

export const createOrderCategory = async (req: express.Request, res: express.Response) => {
    const { description, name, imageUrl, isAvailable, orderItemIds, availabilityRule } = req.body;

    if (!name || !imageUrl) {
        responseHandler(res, 400, "Name and image are required");
        return;
    }

    try {
        await prisma.orderCategory.create({
            data: {
                name,
                description,
                imageUrl,
                isAvailable,
                orderItems: {
                    connect: orderItemIds ? orderItemIds.map((id: string) => ({ id })) : []
                },
                availabilityRule: availabilityRule ? {
                    create: {
                        name: availabilityRule.name,
                        startTime: availabilityRule.startTime,
                        endTime: availabilityRule.endTime,
                        daysOfWeek: availabilityRule.daysOfWeek,
                        isActive: availabilityRule.isActive
                    }
                } : undefined
            }
        });

        responseHandler(res, 200, "success");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const getAllOrderCategories = async (req: express.Request, res: express.Response) => {

    try {
        const orderCategories = await prisma.orderCategory.findMany({
            include: { availabilityRule: true, orderItems: true, locations: {
                select: {
                    name: true
                }
            } }
        });

        responseHandler(res, 200, "success", orderCategories);
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const updateOrderCategory = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { name, description, imageUrl, isAvailable, orderItemIds, availabilityRule } = req.body;

    if (!id) {
        responseHandler(res, 400, "Missing category ID");
        return;
    }

    try {
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
        if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

        if (availabilityRule !== undefined) {
            const existingRule = await prisma.availabilityRule.findFirst({
                where: { orderCategoryId: id },
            });

            if (availabilityRule) {
                // If a rule is provided, create or update it
                updateData.availabilityRule = {
                    upsert: {
                        create: {
                            name: availabilityRule.name,
                            startTime: availabilityRule.startTime,
                            endTime: availabilityRule.endTime,
                            daysOfWeek: availabilityRule.daysOfWeek,
                            isActive: availabilityRule.isActive
                        },
                        update: {
                            name: availabilityRule.name,
                            startTime: availabilityRule.startTime,
                            endTime: availabilityRule.endTime,
                            daysOfWeek: availabilityRule.daysOfWeek,
                            isActive: availabilityRule.isActive
                        }
                    }
                };
            } else if (existingRule) {
                // If rule is null and one exists, delete it
                updateData.availabilityRule = {
                    delete: true
                };
            }
        }
        
        // Only handle product relationships if orderItemIds is explicitly provided
        if (orderItemIds !== undefined) {
            const currentCategory = await prisma.orderCategory.findUnique({
                where: { id },
                include: { orderItems: { select: { id: true } } },
            });

            if (!currentCategory) {
                responseHandler(res, 404, "Category not found");
                return;
            }

            const currentProductIds = currentCategory.orderItems.map((p) => p.id);
            const newProductIds = orderItemIds || [];

            const idsToConnect = newProductIds.filter(
                (productId: string) => !currentProductIds.includes(productId)
            );
            const idsToDisconnect = currentProductIds.filter(
                (productId: string) => !newProductIds.includes(productId)
            );

            updateData.orderItems = {
                connect: idsToConnect.map((id: string) => ({ id })),
                disconnect: idsToDisconnect.map((id: string) => ({ id })),
            };
        }

        if (Object.keys(updateData).length === 0) {
            responseHandler(res, 400, "No valid fields to update");
            return;
        }

        // Perform the update
        await prisma.orderCategory.update({
            where: { id },
            data: updateData,
        });

        responseHandler(res, 200, "OrderCategory updated successfully");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
};


export const deleteOrderCategory = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    if (!id) {
        responseHandler(res, 400, "Missing category ID");
        return;
    }

    try {
        await prisma.orderCategory.delete({
            where: { id }
        });
        responseHandler(res, 200, "success");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}