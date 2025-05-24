import { z } from "zod";

export const createEnhancementSchema = z.object({
  name: z.string(),
  price: z.number(),
  description: z.string(),
  image: z.string(),
  isActive: z.boolean(),
  availableDays: z.array(z.string()),
  pricingType: z.string(),
  seasonal: z.boolean(),
  seasonEnd: z.string().optional(),
  seasonStart: z.string().optional(),
});

export const updateEnhancementSchema = z.object({
  name: z.string().optional(),
  price: z.number().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  isActive: z.boolean().optional(),
  availableDays: z.array(z.string()).optional(),
  pricingType: z.string().optional(),
  seasonal: z.boolean().optional(),
  seasonEnd: z.string().optional(),
  seasonStart: z.string().optional(),
});

