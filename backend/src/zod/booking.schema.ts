import { z } from "zod";

export const createCheckoutSessionSchema = z.object({
  roomId: z.string(),
  guestName: z.string(),
  guestEmail: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  guestPhone: z.string(),
  guestNationality: z.string(),
});

