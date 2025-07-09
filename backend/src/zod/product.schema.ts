import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string({
    required_error: 'Name is required',
  }),
  description: z.string().optional(),
  price: z.number({
    required_error: 'Price is required',
  }).positive('Price must be a positive number'),
  pricingModel: z.enum(['FIXED', 'PER_PERSON']),
  type: z.enum(['REGULAR', 'WEDDING', 'RESTAURANT']),
  category: z.string({
    required_error: 'Category is required',
  }),
  sampleMenu: z.any().optional(),
  image: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive('Price must be a positive number').optional(),
  pricingModel: z.enum(['FIXED', 'PER_PERSON']).optional(),
  type: z.enum(['REGULAR', 'WEDDING', 'RESTAURANT']).optional(),
  category: z.string().optional(),
  sampleMenu: z.any().optional(),
  image: z.string().optional(),
  isActive: z.boolean().optional(),
}); 