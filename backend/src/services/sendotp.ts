import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export const sendOtp = async (email: string, type: string, otp: string, resetLink?: string) => {
  const typeMap: Record<string, string> = {
    signup: "Sign Up",
    login: "Login",
    "forgot-password": "Password Reset",
    "Password Reset Link": "Password Reset Link",
    "reset-password": "Password Reset",
    verify: "Email Verification",
  };
  const readableType = typeMap[type] || "Verification";

  let htmlContent: string;

  if (resetLink) {
    // Template with reset link
    htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: auto; background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center;">
          
          <!-- Logo -->
          <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="height: 48px; margin-bottom: 24px;" />
          
          <!-- Heading -->
          <h2 style="color: #0f172a; font-size: 20px; margin-bottom: 16px;">🔐 ${readableType}</h2>
          
          <!-- Message -->
          <p style="font-size: 16px; margin-bottom: 24px; color: #334155;">
            We received a request to reset your password for your <strong>La Torre</strong> account.
          </p>
          
          <!-- Reset Button -->
          <div style="margin: 32px 0;">
            <a href=${resetLink} style="padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
              ${resetLink}
            </a>
          </div>
          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e2e8f0;" />
          
          <!-- Footer -->
          <p style="font-size: 12px; color: #94a3b8;">
            If you didn't request this password reset, you can safely ignore this email.<br />
            © ${new Date().getFullYear()} La Torre. All rights reserved.
          </p>
        </div>
      </div>
    `;
  } else {
    // Original OTP-only template
    htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: auto; background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center;">
          
          <!-- Logo -->
          <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="height: 48px; margin-bottom: 24px;" />
          
          <!-- Heading -->
          <h2 style="color: #0f172a; font-size: 20px; margin-bottom: 16px;">🔐 ${readableType} OTP Code</h2>
          
          <!-- Message -->
          <p style="font-size: 16px; margin-bottom: 12px; color: #334155;">
            Use the following OTP to complete your <strong>${readableType}</strong> with <strong>La Torre</strong>.
          </p>
          
          <!-- OTP Code -->
          <div style="font-size: 32px; font-weight: 700; color: #1d4ed8; margin: 24px 0;">${otp}</div>
          
          <!-- Expiry Notice -->
          <p style="font-size: 14px; color: #64748b;">
            This code will expire in <strong>5 minutes</strong>.
          </p>
          
          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e2e8f0;" />
          
          <!-- Footer -->
          <p style="font-size: 12px; color: #94a3b8;">
            If you didn't request this code, you can safely ignore this email.<br />
            © ${new Date().getFullYear()} La Torre. All rights reserved.
          </p>
        </div>
      </div>
    `;
  }

  // Send Email via Brevo
  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: "La Torre", email: process.env.BREVO_SENDER_EMAIL },
        to: [{ email }],
        subject: `${readableType} - ${resetLink ? 'Reset Your Password' : 'Your OTP Code'}`,
        htmlContent,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`${resetLink ? 'Reset link and OTP' : 'OTP'} sent to ${email}: ${otp}`);
  } catch (error: any) {
    console.error("Error sending email via Brevo:", error.response?.data || error.message);
    throw new Error("Failed to send OTP");
  }
};