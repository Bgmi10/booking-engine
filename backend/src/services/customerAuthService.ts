import prisma from '../prisma';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { generateToken } from '../utils/jwt';
import { sendOTP } from '../utils/sendOtp';
import { generateToken as generateHexToken } from '../utils/tokenGenerator';

export class CustomerAuthService {
    static async generateActivationLink(customerId: string): Promise<void | string | undefined> {
        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
        });

        if (!customer) {
            throw new Error('Customer not found');
        }

        // Generate activation token
        const activationToken = generateHexToken();
        
        // Store token
        await prisma.customer.update({
            where: { id: customerId },
            data: {
                emailVerifyToken: activationToken
            }
        });

        return activationToken;
    }

    static async activateAccount(email: string, password: string, token: string): Promise<any> {
        const customer = await prisma.customer.findFirst({
            where: {
                guestEmail: email,
                emailVerifyToken: token,
                emailVerified: false
            }
        });

        if (!customer) {
            throw new Error('Invalid activation token or account already activated');
        }

        const hashedPassword = await hashPassword(password);
        
        const updatedCustomer = await prisma.customer.update({
            where: { id: customer.id },
            data: {
                password: hashedPassword,
                emailVerified: true,
                emailVerifyToken: null
            }
        });

        const authToken = generateToken({
            id: updatedCustomer.id,
            email: updatedCustomer.guestEmail,
            type: 'CUSTOMER'
        });

        return { customer: updatedCustomer, token: authToken };
    }

    static async login(email: string, password: string): Promise<any> {
        const customer = await prisma.customer.findUnique({
            where: { guestEmail: email }
        });

        if (!customer?.password || !customer.emailVerified) {
            throw new Error('Invalid credentials or account not activated');
        }

        const isValid = await comparePassword(password, customer.password);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        // Update last login
        await prisma.customer.update({
            where: { id: customer.id },
            data: { lastLogin: new Date() }
        });

        const token = generateToken({
            id: customer.id,
            email: customer.guestEmail,
            type: 'CUSTOMER'
        });

        return { customer, token };
    }

    static async initiatePasswordReset(email: string): Promise<{ success: boolean }> {
        const customer = await prisma.customer.findUnique({
            where: { guestEmail: email }
        });

        if (!customer) {
            return { success: false };
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        await prisma.otp.upsert({
            where: { 
                email: customer.guestEmail 
            },
            update: {
                otp: otp,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
            },
            create: {
                email: customer.guestEmail,
                otp: otp,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
            }
        });

        await sendOTP(customer.guestEmail, 'reset-password', otp);

        return { success: true };
    }

    static async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
        const otpRecord = await prisma.otp.findFirst({
            where: {
                email,
                otp,
                expiresAt: {
                    gt: new Date()
                }
            }
        });

        if (!otpRecord) {
            // Check if OTP exists but is expired
            const existingOtp = await prisma.otp.findFirst({
                where: {
                    email,
                    otp
                }
            });

            if (existingOtp) {
                // OTP exists but is expired
                throw new Error('OTP_EXPIRED');
            }

            // OTP does not exist at all
            throw new Error('INVALID_OTP');
        }

        const customer = await prisma.customer.findUnique({
            where: { guestEmail: email }
        });

        if (!customer) {
            throw new Error('CUSTOMER_NOT_FOUND');
        }

        const hashedPassword = await hashPassword(newPassword);
        
        // Update password and delete used OTP
        await prisma.$transaction([
            prisma.customer.update({
                where: { id: customer.id },
                data: {
                    password: hashedPassword
                }
            }),
            prisma.otp.delete({
                where: { id: otpRecord.id }
            })
        ]);
    }
}