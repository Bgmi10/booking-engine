import { z } from "zod";

export const createRoomSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(1),
  description: z.string().min(1),
  images: z.array(z.string().min(1)).optional(),
  capacity: z.number().min(1),
  ratePolicyId: z.array(z.string().min(1)),
  amenities: z.array(z.string().min(1)).optional(),
  extraBedPrice: z.number().optional().nullable(),
  allowsExtraBed: z.boolean().optional(),
  maxCapacityWithExtraBed: z.number().optional().nullable()
});

export const updateRoomSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().min(1).optional(),
  description: z.string().min(1).optional(),
  images: z.array(z.string().min(1)).optional(),
  capacity: z.number().min(1).optional(),
  ratePolicyId: z.array(z.string().min(1)).optional(),
  amenities: z.array(z.string().min(1)).optional(),
  extraBedPrice: z.number().optional().nullable(),
  maxCapacityWithExtraBed: z.number().optional().nullable(),
  allowsExtraBed: z.boolean().optional()
});

export const updateRoomImageSchema = z.object({
  url: z.string().min(1),
});


