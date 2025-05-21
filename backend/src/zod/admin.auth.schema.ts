import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string(),
  role: z.string().min(1), 
  phone: z.string().min(1).max(10),
});

export { loginSchema, createUserSchema };



