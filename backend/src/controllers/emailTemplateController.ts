import { Request, Response } from 'express';
import prisma from '../prisma';
import { responseHandler } from '../utils/helper';

// Template variable documentation
const templateVariables = {
  BOOKING_CONFIRMATION: [
    {
      name: 'customerDetails',
      type: 'object',
      description: 'Customer information',
      example: {
        firstName: 'John',
        middleName: 'Robert',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        nationality: 'US',
      },
    },
    {
      name: 'bookings',
      type: 'array',
      description: 'Array of booking information',
      example: [{
        id: 'booking123',
        room: {
          name: 'Deluxe Suite',
          description: 'Luxurious suite with mountain view',
          amenities: ['WiFi', 'AC', 'Mini Bar'],
          price: 200,
          capacity: 2,
        },
        checkIn: '2024-03-20',
        checkOut: '2024-03-25',
        totalGuests: 2,
        request: 'Early check-in requested',
      }],
    },
    {
      name: 'payment',
      type: 'object',
      description: 'Payment information',
      example: {
        amount: 1000,
        currency: 'EUR',
        status: 'PAID',
        stripeSessionId: 'cs_test_123',
      },
    },
    {
      name: 'enhancementBookings',
      type: 'array',
      description: 'Booked enhancements',
      example: [{
        quantity: 2,
        notes: 'Special request',
        enhancement: {
          title: 'Wine Package',
          description: 'Premium wine selection',
          price: 50,
          pricingType: 'PER_STAY',
        },
      }],
    },
  ],
  ADMIN_NOTIFICATION: [
    {
      name: 'customerDetails',
      type: 'object',
      description: 'Customer information',
      example: {
        firstName: 'John',
        middleName: 'Robert',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        nationality: 'US',
      },
    },
    {
      name: 'bookings',
      type: 'array',
      description: 'Array of booking information',
      example: [{
        id: 'booking123',
        room: {
          name: 'Deluxe Suite',
          description: 'Luxurious suite with mountain view',
          amenities: ['WiFi', 'AC', 'Mini Bar'],
          price: 200,
          capacity: 2,
        },
        checkIn: '2024-03-20',
        checkOut: '2024-03-25',
        totalGuests: 2,
        request: 'Early check-in requested',
      }],
    },
    {
      name: 'payment',
      type: 'object',
      description: 'Payment information',
      example: {
        amount: 1000,
        currency: 'EUR',
        status: 'PAID',
        stripeSessionId: 'cs_test_123',
      },
    },
  ],
  PAYMENT_LINK: [
    {
      name: 'customerDetails',
      type: 'object',
      description: 'Customer information',
      example: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
    },
    {
      name: 'paymentLink',
      type: 'string',
      description: 'Stripe payment link URL',
      example: 'https://checkout.stripe.com/pay/cs_test_123',
    },
    {
      name: 'expiresAt',
      type: 'string',
      description: 'Payment link expiration date',
      example: '2024-03-21 15:00:00',
    },
    {
      name: 'bookingDetails',
      type: 'object',
      description: 'Booking summary',
      example: {
        totalAmount: 1000,
        currency: 'EUR',
        rooms: 2,
        checkIn: '2024-03-20',
        checkOut: '2024-03-25',
      },
    },
  ],
};

// Get all templates
export const getTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    responseHandler(res, 200, 'Templates retrieved successfully', templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    responseHandler(res, 500, 'Failed to fetch templates');
  }
};

// Get template by ID
export const getTemplateById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      responseHandler(res, 404, 'Template not found');
      return;
    }

    responseHandler(res, 200, 'Template retrieved successfully', template);
  } catch (error) {
    console.error('Error fetching template:', error);
    responseHandler(res, 500, 'Failed to fetch template');
  }
};

// Get available variables for template type
export const getTemplateVariables = async (req: Request, res: Response) => {
  const { type } = req.params;
  const variables = templateVariables[type as keyof typeof templateVariables];

  if (!variables) {
    responseHandler(res, 404, 'Template type not found');
    return;
  }

  responseHandler(res, 200, 'Variables retrieved successfully', variables);
};

// Create new template
export const createTemplate = async (req: Request, res: Response) => {
  try {
    const template = await prisma.emailTemplate.create({
      data: req.body,
    });
    responseHandler(res, 201, 'Template created successfully', template);
  } catch (error) {
    console.error('Error creating template:', error);
    responseHandler(res, 500, 'Failed to create template');
  }
};

// Update template
export const updateTemplate = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const template = await prisma.emailTemplate.update({
      where: { id },
      data: req.body,
    });
    responseHandler(res, 200, 'Template updated successfully', template);
  } catch (error) {
    console.error('Error updating template:', error);
    responseHandler(res, 500, 'Failed to update template');
  }
};

// Delete template
export const deleteTemplate = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.emailTemplate.delete({
      where: { id },
    });
    responseHandler(res, 200, 'Template deleted successfully');
  } catch (error) {
    console.error('Error deleting template:', error);
    responseHandler(res, 500, 'Failed to delete template');
  }
}; 