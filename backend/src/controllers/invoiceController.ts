import express from 'express';
import { InvoiceService } from '../services/invoiceService';
import { GroupInvoiceService } from '../services/groupInvoiceService';
import { responseHandler, handleError } from '../utils/helper';
import prisma from '../prisma';

const invoiceService = new InvoiceService();
const groupInvoiceService = new GroupInvoiceService();

export const generateCustomerInvoice = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  
  try {
    // Generate the invoice PDF
    const pdfBuffer = await invoiceService.generateInvoice(id);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating customer invoice:', error);
    handleError(res, error as Error);
  }
};

/**
 * Generate tax-optimized invoice PDF
 */
export const generateTaxOptimizedInvoice = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { replacements } = req.body; // Simple map of originalId -> replacementId
  
  try {
    // Check feature toggle
    const settings = await prisma.generalSettings.findFirst();
    if (!settings?.enableTaxOptimizationFeature) {
      responseHandler(res, 403, "Feature not enabled");
      return;
    }
    
    // Validate replacements format
    if (replacements && typeof replacements !== 'object') {
      responseHandler(res, 400, "Invalid replacements format");
      return;
    }
    
    // Generate the tax-optimized invoice PDF
    const pdfBuffer = await invoiceService.generateInvoice(id, replacements);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=tax-invoice-${id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating tax-optimized invoice:', error);
    handleError(res, error as Error);
  }
};

/**
 * Generate customer invoice PDF for booking group
 */
export const generateGroupCustomerInvoice = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const userId = (req as any).user?.id; // Get user ID from auth middleware
  
  try {
    // Generate the group invoice PDF
    const pdfBuffer = await groupInvoiceService.generateGroupInvoice(id, undefined, userId);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=group-invoice-${id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating group customer invoice:', error);
    handleError(res, error as Error);
  }
};

/**
 * Generate tax-optimized invoice PDF for booking group
 */
export const generateGroupTaxOptimizedInvoice = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { replacements } = req.body; // Simple map of originalId -> replacementId
  const userId = (req as any).user?.id; // Get user ID from auth middleware
  
  try {
    // Check feature toggle
    const settings = await prisma.generalSettings.findFirst();
    if (!settings?.enableTaxOptimizationFeature) {
      responseHandler(res, 403, "Feature not enabled");
      return;
    }
    
    // Validate replacements format
    if (replacements && typeof replacements !== 'object') {
      responseHandler(res, 400, "Invalid replacements format");
      return;
    }
    
    // Generate the tax-optimized group invoice PDF
    const pdfBuffer = await groupInvoiceService.generateGroupInvoice(id, replacements, userId);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=tax-group-invoice-${id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating group tax-optimized invoice:', error);
    handleError(res, error as Error);
  }
};