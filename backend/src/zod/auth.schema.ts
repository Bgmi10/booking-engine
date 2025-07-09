import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long')
});

export const resetPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().min(6, 'OTP must be at least 6 characters long'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters long')
});

export const activateAccountSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    token: z.string().min(1, 'Activation token is required')
});