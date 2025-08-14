import express from "express";
import { handleError, responseHandler } from "../utils/helper";
import prisma from "../prisma";

export const createLocation = async (req: express.Request, res: express.Response) => {
   const { name, categoryIds } = req.body;

    if (!name) {
       responseHandler(res, 400, "Location name is required");
       return;
    } 
    
    const existingLocation = await prisma.location.findUnique({ where: { name } });
    
    if (existingLocation) {
        responseHandler(res, 400, "Location with this name already exists");
        return;
    }

    try {
        const location = await prisma.location.create({ 
          data: {
            name,
            orderCategories: {
              connect: categoryIds ? categoryIds.map((id: string) => ({ id })) : [],
            },
          }
        });

        responseHandler(res, 201, "Location created successfully", location);
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const updateLocation = async (req: express.Request, res: express.Response) => {
    const { name, categoryIds } = req.body;
    const { id } = req.params;

    if (!id) {
       responseHandler(res, 400, "Missing id in params");
       return;
    }
    
    try {
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;

        if (categoryIds !== undefined) {
          const currentLocation = await prisma.location.findUnique({
            where: { id },
            include: { orderCategories: { select: { id: true } } },
          });

          if (!currentLocation) {
            responseHandler(res, 404, "Location not found");
            return;
          }

          const currentCategoryIds = currentLocation.orderCategories.map((c) => c.id);
          const newCategoryIds = categoryIds || [];

          const idsToConnect = newCategoryIds.filter(
            (catId: string) => !currentCategoryIds.includes(catId)
          );
          const idsToDisconnect = currentCategoryIds.filter(
            (catId: string) => !newCategoryIds.includes(catId)
          );

          updateData.orderCategories = {
            connect: idsToConnect.map((catId: string) => ({ id: catId })),
            disconnect: idsToDisconnect.map((catId: string) => ({ id: catId })),
          };
        }

        if (Object.keys(updateData).length === 0) {
          responseHandler(res, 400, "No fields to update");
          return;
        }

        await prisma.location.update({
          where: { id },
          data: updateData,
        });

        responseHandler(res, 200, "Location updated successfully");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}
 
export const deleteLocation = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    if (!id) {
       responseHandler(res, 400, "Missing id in params");
       return;
    }
    
    try {
        await prisma.location.delete({
          where: { id }
        });
        responseHandler(res, 200, "Location deleted successfully");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const getAllLocations = async (req: express.Request, res: express.Response) => {    
    try {
        const locations = await prisma.location.findMany({ include: { orderCategories: { include: {
          orderItems: true
        }} }});
        responseHandler(res, 200, "success", locations);
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}