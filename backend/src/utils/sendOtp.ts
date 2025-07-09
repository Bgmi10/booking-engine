import { EmailService } from '../services/emailService';
import dotenv from "dotenv";

dotenv.config();

export const sendOTP = async (email: string, type: string, otp: string) => {
  await EmailService.sendEmail({
    to: { email, name: email.split('@')[0] },
    templateType: 'PASSWORD_RESET_OTP',
    templateData: {
      otp,
      year: new Date().getFullYear()
    }
  });
}; 