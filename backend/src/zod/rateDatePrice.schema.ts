import { z } from 'zod';

export const createRateDatePriceSchema = z.object({
  prices: z.array(z.object({
    roomId: z.string().uuid(),
    date: z.string().datetime(),
    price: z.number().positive(),
    priceType: z.enum(['BASE_OVERRIDE', 'ROOM_INCREASE', 'ROOM_OVERRIDE']).default('ROOM_OVERRIDE'),
  }))
});

export const updateRateDatePriceSchema = z.object({
  price: z.number().positive().optional(),
  priceType: z.enum(['BASE_OVERRIDE', 'ROOM_INCREASE', 'ROOM_OVERRIDE']).optional(),
  isActive: z.boolean().optional(),
});

export const getRateDatePricesSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  roomId: z.string().uuid().optional(),
});

export type CreateRateDatePriceInput = z.infer<typeof createRateDatePriceSchema>;
export type UpdateRateDatePriceInput = z.infer<typeof updateRateDatePriceSchema>;
export type GetRateDatePricesInput = z.infer<typeof getRateDatePricesSchema>;