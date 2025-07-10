import { Request, Response } from 'express';
import prisma from '../prisma';
import { handleError, responseHandler } from '../utils/helper';

export const createExternalVendor = async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    const { type, name, email, phone, notes } = req.body;

    if (!type || !name) {
      responseHandler(res, 400, 'Type and name are required');
      return;
    }

    const newVendor = await prisma.externalVendor.create({
      data: {
        type,
        name,
        email,
        phone,
        notes,
        proposalId,
      },
    });

    responseHandler(res, 201, 'Vendor created successfully', newVendor);
  } catch (error: any) {
    handleError(res, error);
  }
};

export const getExternalVendorsForProposal = async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    const vendors = await prisma.externalVendor.findMany({
      where: { proposalId },
      orderBy: { createdAt: 'asc' },
    });
    responseHandler(res, 200, 'Vendors retrieved successfully', vendors);
  } catch (error: any) {
    handleError(res, error);
  }
};

export const updateExternalVendor = async (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;
    const { type, name, email, phone, notes } = req.body;

    const updatedVendor = await prisma.externalVendor.update({
      where: { id: vendorId },
      data: {
        type,
        name,
        email,
        phone,
        notes,
      },
    });

    responseHandler(res, 200, 'Vendor updated successfully', updatedVendor);
  } catch (error: any) {
    if (error.code === 'P2025') {
      responseHandler(res, 404, 'Vendor not found');
      return;
    }
    handleError(res, error);
  }
};

export const deleteExternalVendor = async (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;
    await prisma.externalVendor.delete({
      where: { id: vendorId },
    });
    responseHandler(res, 200, 'Vendor deleted successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      responseHandler(res, 404, 'Vendor not found');
      return;
    }
    handleError(res, error);
  }
};
