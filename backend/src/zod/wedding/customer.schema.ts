import { z } from "zod";

const titles = ["Mr.", "Mrs."] as const;
const currentYear = new Date().getFullYear();

export const registerSchema = z.object({
  title1: z.enum(titles, { errorMap: () => ({ message: "Invalid title" }) }),
  name1: z.string().min(1, { message: "Name is required" }),
  title2: z.enum(titles, { errorMap: () => ({ message: "Invalid title" }) }),
  name2: z.string().min(1, { message: "Name is required" }),
  nights: z.coerce.number().int().min(1).max(7),
  guestCount: z.coerce.number().int().min(10).max(120),
  preferredMonth: z.coerce.number().int().min(4).max(10), // only April–October
  preferredYear: z.coerce.number().int().min(currentYear).max(currentYear + 3),
  email: z.string().email(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
