import { z } from "zod";

export const createRatePolicySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  nightlyRate: z.number().min(0).optional(),
  isActive: z.boolean(),
  refundable: z.boolean().optional(),
  discountPercentage: z.number().min(0).optional(),
  prepayPercentage: z.number().min(0).optional(),
  fullPaymentDays: z.number().min(0).optional(),
  changeAllowedDays: z.number().min(0).optional(),
  rebookValidityDays: z.number().min(0).optional(),
});

export const updateRatePolicySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  nightlyRate: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  refundable: z.boolean().optional(),
  prepayPercentage: z.number().min(0).optional(),
  fullPaymentDays: z.number().min(0).optional(),
  changeAllowedDays: z.number().min(0).optional(),
  rebookValidityDays: z.number().min(0).optional(),
  discountPercentage: z.number().min(0).optional(),
});


