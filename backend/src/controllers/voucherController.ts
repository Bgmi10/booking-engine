import express from "express";
import prisma from "../prisma";
import { handleError, responseHandler } from "../utils/helper";
import { now } from "../utils/constants";

export const createVoucherProduct = async (req: express.Request, res: express.Response) => {
    const { name, description, imageUrl, value, isActive } = req.body;

    try {
     await prisma.voucherProduct.create({
        data: {
            name,
            description,
            imageUrl,
            value,
            isActive
        }
     });

     responseHandler(res, 200, "Voucher product created successfully");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const deleteVoucherProduct = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    if (!id) {
        responseHandler(res, 400, "id is missing");
        return;
    }

    try {
     await prisma.voucherProduct.delete({
        where: { id }
     })

     responseHandler(res, 200, "Voucher product deleted successfully");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const getAllVoucherProducts = async (req: express.Request, res: express.Response) => {
    try {
     const products = await prisma.voucherProduct.findMany({});

     responseHandler(res, 200, "success", products);
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const editVoucherProduct = async (req: express.Request, res: express.Response) => {
    const { name, description, imageUrl, value, isActive } = req.body;
    const { id } = req.params;

    if (!id) {
        responseHandler(res, 400, "id is missing");
        return;
    }
    
    try {
     await prisma.voucherProduct.update({
        where: { id },
        data: {
            name,
            description,
            imageUrl,
            value,
            isActive
        }
     });

     responseHandler(res, 200, "Voucher product created successfully");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const createVoucher = async (req: express.Request, res: express.Response) => {
    const { name, description, code, type, discountPercent, fixedAmount, maxUsage, maxUsagePerUser, validFrom, validTill, roomIds, roomScope, rateScope, ratePolicyIds, isActive, productIds, } = req.body;

    //@ts-ignore
    const { userId } = req.user;

    try {
     await prisma.voucher.create({
        data: {
            name, description, code, type, discountPercent, fixedAmount, maxUsage, maxUsagePerUser, validFrom, validTill, roomIds, roomScope, rateScope, ratePolicyIds, isActive, productIds, createdBy: userId, products: productIds && productIds.length > 0
            ? { connect: productIds.map((id: string) => ({ id }))}
            : undefined
        },
        
     });

     responseHandler(res, 200, "Voucher created successfully");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const editVoucher = async (req: express.Request, res: express.Response) => {
    const { name, description, code, type, discountPercent, fixedAmount, maxUsage, maxUsagePerUser, validFrom, validTill, roomIds, roomScope, rateScope, ratePolicyIds, isActive, productIds, } = req.body;
    const { id } = req.params;

    if (!id) {
        responseHandler(res, 400, "Id is required");
        return;
    }

    try {
     await prisma.voucher.update({
        where: { id },
        data: {
            name, description, code, type, discountPercent, fixedAmount, maxUsage, maxUsagePerUser, validFrom, validTill, roomIds, roomScope, rateScope, ratePolicyIds, isActive, productIds
        }
     });

     responseHandler(res, 200, "Voucher updated successfully");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const deleteVoucher = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    if (!id) {
        responseHandler(res, 400, "Id is required");
        return;
    }

    try {
     await prisma.voucher.delete({
        where: { id }
     });

     responseHandler(res, 200, "Voucher deleted successfully");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const getAllVouchers = async (req: express.Request, res: express.Response) => {
    try {
     const vouchers = await prisma.voucher.findMany({
        include: { 
            products: true
        }
     });

     responseHandler(res, 200, "success", vouchers);
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const validateVoucher = async (req: express.Request, res: express.Response) => {
    const { code } = req.params
    if (!code) {
      responseHandler(res, 400, "Promotional code is required");
      return;
    }
  
    try {
      const voucher = await prisma.voucher.findUnique({
        where: { code },
        include: { products: true },
      });
  
      if (!voucher) {
        responseHandler(res, 404, "Promotional code not found");
        return;
      }
  
      if (!voucher.isActive) {
        responseHandler(res, 403, "This promotional code is no longer active");
        return;
      }
  
      if (voucher.validFrom > now) {
        responseHandler(res, 403, `This promotional code will be valid from ${voucher.validFrom.toDateString()}`);
        return;
      }
  
      if (voucher.validTill < now) {
        responseHandler(res, 403, "This promotional code has expired");
        return;
      }

      // Check max usage limit
      if (voucher.maxUsage && voucher?.maxUsage <= voucher.currentUsage) {
        responseHandler(res, 403, "This promotional code has reached its maximum usage limit");
        return;
      }

      responseHandler(res, 200, "Promotional code is valid", voucher);
    } catch (e) {
      console.error(e);
      handleError(res, e as Error);
    }
};
  

export const getVouchers = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    if (!id) {
        responseHandler(res, 400, "Promotional code is required");
        return;
    }

    try {
        const voucher = await prisma.voucher.findUnique({
            where: { id },
            include: { products: true }
        });

        responseHandler(res, 200, "success", voucher);
    } catch (e) {
        console.error(e);
        handleError(res, e as Error);
    }
}