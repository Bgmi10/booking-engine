import { Request, Response } from 'express';
import prisma from '../prisma';
import { handleError, responseHandler } from '../utils/helper';

export const createProduct = async (req: Request, res: Response) => {
    try {
        const product = await prisma.product.create({
            data: req.body,
        });
        responseHandler(res, 201, 'Product created successfully', product);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const products = await prisma.product.findMany({
            where: { type: "WEDDING", isActive: true }
        });
        responseHandler(res, 200, "success", products);
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }
}

export const getProductById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id },
        });

        if (!product) {
            responseHandler(res, 404, 'Product not found');
            return;
        }

        responseHandler(res, 200, 'Product fetched successfully', product);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.update({
            where: { id },
            data: req.body,
        });
        responseHandler(res, 200, 'Product updated successfully', product);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.product.delete({
            where: { id },
        });
        responseHandler(res, 200, 'Product deleted successfully');
    } catch (error) {
        handleError(res, error as Error);
    }
}; 