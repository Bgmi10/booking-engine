import { z } from 'zod';

export const itineraryItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  guestCount: z.number().int().min(1, 'At least one guest is required').max(120, 'Maximum 120 guests per item'),
  status: z.enum(['CONFIRMED', 'OPTIONAL']).default('OPTIONAL'),
  price: z.number().optional(),
  notes: z.string().optional(),
  customMenu: z.any().optional(),
});

export const itineraryDaySchema = z.object({
  dayNumber: z.number().int().min(1, 'Day number must be at least 1'),
  date: z.string().or(z.date()),
  items: z.array(itineraryItemSchema).optional(),
});

export const paymentPlanStageSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().or(z.string().transform(val => parseFloat(val))),
  dueDate: z.string().or(z.date()),
});

export const paymentPlanSchema = z.object({
  stages: z.array(paymentPlanStageSchema),
});

export const createProposalSchema = z.object({
  name: z.string().min(1, 'Proposal name is required'),
  weddingDate: z.string().or(z.date()),
  mainGuestCount: z.number().int().min(1, 'At least one guest is required').max(120, 'Maximum 120 guests allowed'),
  customerId: z.string().min(1, 'Customer is required'),
  termsAndConditions: z.string().optional(),
  itineraryDays: z.array(itineraryDaySchema).min(2, 'Minimum 2 days required').max(10, 'Maximum 10 days allowed'),
  paymentPlan: paymentPlanSchema.optional(),
});

export const updateProposalSchema = createProposalSchema.partial();

export const updateProposalStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
}); 