import dotenv from "dotenv";
import prisma from ".";
import { hashPassword } from '../utils/bcrypt';
import { adminEmails } from "../utils/constants";

dotenv.config();

const emailStyles = {
  fontFamily: "'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  primaryColor: "#1f2937",
  secondaryColor: "#6b7280",
  accentColor: "#059669",
  backgroundColor: "#f8fafc",
  borderColor: "#e2e8f0",
  successColor: "#10b981",
  warningColor: "#f59e0b",
  errorColor: "#ef4444",
  infoColor: "#3b82f6",
};

// Generate professional email footer
const generateEmailFooter = () => `
  <div style="background: ${emailStyles.backgroundColor}; padding: 40px 24px; border-top: 1px solid ${emailStyles.borderColor};">
    <div style="max-width: 600px; margin: 0 auto; text-align: center;">
      <div style="margin-bottom: 32px;">
        <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 16px 0; font-size: 20px; font-weight: 600; font-family: ${emailStyles.fontFamily};">Contact Information</h3>
        <div style="color: ${emailStyles.secondaryColor}; font-size: 15px; line-height: 1.8; font-family: ${emailStyles.fontFamily};">
          <div style="margin-bottom: 8px;"><span style="font-size: 16px;">📍</span> Via Francigena, Historic Center</div>
          <div style="margin-bottom: 8px;"><span style="font-size: 16px;">📞</span> +39 123 456 7890</div>
          <div style="margin-bottom: 8px;"><span style="font-size: 16px;">📧</span> info@latorresullaviafrancigena.com</div>
          <div><span style="font-size: 16px;">🌐</span> www.latorre.farm/weddings</div>
        </div>
      </div>
      
      <div style="border-top: 1px solid ${emailStyles.borderColor}; padding-top: 24px;">
        <div style="text-align: center; padding: 24px;">
          <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 40px; margin-bottom: 24px;" />
        </div>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: ${emailStyles.secondaryColor}; line-height: 1.6; font-family: ${emailStyles.fontFamily};">
          © ${new Date().getFullYear()} La Torre sulla via Francigena. All rights reserved.<br>
          You received this email because you made a booking with us.
        </p>
        <div style="display: inline-flex; gap: 16px;">
          <a href="https://www.latorre.farm/terms" style="color: ${emailStyles.secondaryColor}; text-decoration: none; font-size: 13px; font-family: ${emailStyles.fontFamily}; padding: 8px 16px; border: 1px solid ${emailStyles.borderColor}; border-radius: 6px;">Terms & Conditions</a>
          <a href="https://www.latorre.farm/privacy" style="color: ${emailStyles.secondaryColor}; text-decoration: none; font-size: 13px; font-family: ${emailStyles.fontFamily}; padding: 8px 16px; border: 1px solid ${emailStyles.borderColor}; border-radius: 6px;">Privacy Policy</a>
        </div>
      </div>
    </div>
  </div>
`;

const createUser = async () => {
  const randomPassword = Math.random().toString(36).substring(2, 15);
  const hashedPassword = await hashPassword(randomPassword);

  for (const email of adminEmails) {
    await prisma.user.create({
      data: {
        name: "Admin",
        email: email,
        password: hashedPassword,
        role: "ADMIN",
      },
    });
  }

  console.log("✅ Admin user created", "pass:", randomPassword);
};

createUser()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

const createSettings = async () => {
  await prisma.generalSettings.upsert({
    where: { id: "1"},
    create: {
      id: "1",
      minStayDays: 2,
      chargePaymentConfig: JSON.stringify({ qr_code: true, hosted_invoice: true, cash: true, manual_transaction_id: true })
    },
    update: {
      id: "1",
      minStayDays: 2,
      chargePaymentConfig: JSON.stringify({ qr_code: true, hosted_invoice: true, cash: true, manual_transaction_id: true })
    }
  });
  console.log("✅ Settings created");
};

createSettings()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

async function main() {
  const templates = [
    {
      name: 'Charge Refund Confirmation',
      type: 'CHARGE_REFUND_CONFIRMATION',
      subject: 'Refund Processed for Your Payment to La Torre',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Refund Confirmation - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>
    
          <!-- Refund Hero -->
          <div style="background: linear-gradient(135deg, ${emailStyles.infoColor} 0%, #3b82f6 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">💰</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Refund Processed</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">
              We have successfully processed your refund.
            </p>
          </div>
    
          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
            <!-- Personal Greeting -->
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{customerName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                This email is to confirm that we have processed a refund for your recent payment.
              </p>
            </div>
    
            <!-- Refund Summary -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">📋 Refund Details</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Refund Amount:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-size: 18px;">{{refundCurrency}} {{refundAmount}}</span>
                  </div>
                   <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Original Charge:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{chargeDescription}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Transaction Date:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{transactionDate}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Refund ID:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-family: monospace; background: ${emailStyles.backgroundColor}; padding: 6px 12px; border-radius: 6px;">{{refundId}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Refund Reason:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{refundReason}}</span>
                  </div>
                </div>
              </div>
            </div>
    
            <!-- Refund Processing Note -->
            {{#if (or (eq paymentMethod "STRIPE") (eq paymentMethod "BANK_TRANSFER"))}}
            <div style="background: #fef3c7; border-radius: 12px; padding: 24px; margin-bottom: 32px; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin: 0 0 16px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #f59e0b;"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>
                Refund Processing Information
              </h3>
              <div style="background: white; padding: 16px; border-radius: 8px;">
                <p style="color: #a16207; margin: 0; font-size: 15px; line-height: 1.7;">
                  This email is to confirm that your refund has been issued by <strong>La Torre sulla via Francigena</strong>. 
                  It can take approximately <strong>10 days</strong> to appear on your statement. If it takes longer, 
                  please contact your bank for assistance.
                </p>
              </div>
            </div>
            {{/if}}
    
            <!-- Contact Information -->
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.infoColor}; margin: 0 0 20px 0; font-size: 20px;">📞 Need Assistance?</h3>
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7;">
                  If you have any questions about this refund, our team is here to help:
                </p>
                <ul style="color: ${emailStyles.infoColor}; margin: 0; padding-left: 20px; line-height: 2;">
                  <li><strong>Email:</strong> info@latorresullaviafrancigena.com</li>
                  <li><strong>Phone:</strong> +39 0577 123456</li>
                  <li><strong>Hours:</strong> 9:00 AM - 6:00 PM (CET)</li>
                </ul>
              </div>
            </div>
          </div>
    
          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        customerName: { type: 'string', description: 'Customer full name', example: 'John Doe' },
        refundAmount: { type: 'number', description: 'The amount refunded', example: 50.00 },
        refundCurrency: { type: 'string', description: 'The currency of the refund', example: 'EUR' },
        chargeDescription: { type: 'string', description: 'Description of the original charge', example: 'Extra services' },
        transactionDate: { type: 'string', description: 'Date of the original charge', example: 'January 1, 2024' },
        refundId: { type: 'string', description: 'The ID of the refund transaction', example: 're_123456789' },
        refundReason: { type: 'string', description: 'The reason for the refund', example: 'Service not rendered' },
      }
    },
    {
      name: 'Charge Confirmation',
      type: 'CHARGE_CONFIRMATION',
      subject: 'Extra Charges - La Torre (#{{chargeId}})',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Extra Charges - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>
    
          <!-- Extra Charges Hero -->
          <div style="background: linear-gradient(135deg, ${emailStyles.warningColor} 0%, #f97316 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">💳</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Extra Charges</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">
              Additional charges have been added to your account
            </p>
          </div>
    
          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
            <!-- Personal Greeting -->
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{customerName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                Additional charges have been added to your account during your stay at La Torre sulla via Francigena. Please review the details below and complete your payment.
              </p>
            </div>

            <!-- Charge Details -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">📋 Charge Details</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Charge ID:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-family: monospace; background: ${emailStyles.backgroundColor}; padding: 6px 12px; border-radius: 6px;">#{{chargeId}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Amount:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-size: 18px;">€{{amount}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Description:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{description}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Charge Date:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{chargeDate}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Status:</span>
                    <span style="background: ${emailStyles.warningColor}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">PENDING</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Payment Link Card -->
            <div style="background: #fff7ed; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #9a3412; margin: 0 0 20px 0; font-size: 20px;">🔒 Secure Payment</h3>
              <div style="background: white; border-radius: 8px; padding: 24px; text-align: center;">
                <p style="color: #9a3412; margin: 0 0 20px 0; font-size: 15px;">
                  Click the button below to complete your payment securely:
                </p>
                <a href="{{paymentLink}}" style="display: inline-block; background: ${emailStyles.warningColor}; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin-bottom: 20px;">
                  Pay Now
                </a>
                <p style="color: #9a3412; margin: 0; font-size: 14px;">
                  This payment link will expire on {{expiresAt}}
                </p>
              </div>
            </div>

            <!-- Customer Information -->
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.infoColor}; margin: 0 0 20px 0; font-size: 20px;">👤 Customer Information</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #bfdbfe;">
                    <span style="font-weight: 600; color: ${emailStyles.infoColor}; font-family: ${emailStyles.fontFamily};">Name:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600; font-family: ${emailStyles.fontFamily};">{{customerName}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #bfdbfe;">
                    <span style="font-weight: 600; color: ${emailStyles.infoColor}; font-family: ${emailStyles.fontFamily};">Email:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600; font-family: ${emailStyles.fontFamily};">{{customerEmail}}</span>
                  </div>
                  {{#if customerPhone}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #bfdbfe;">
                    <span style="font-weight: 600; color: ${emailStyles.infoColor}; font-family: ${emailStyles.fontFamily};">Phone:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600; font-family: ${emailStyles.fontFamily};">{{customerPhone}}</span>
                  </div>
                  {{/if}}
                  {{#if customerNationality}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0;">
                    <span style="font-weight: 600; color: ${emailStyles.infoColor}; font-family: ${emailStyles.fontFamily};">Nationality:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600; font-family: ${emailStyles.fontFamily};">{{customerNationality}}</span>
                  </div>
                  {{/if}}
                </div>
              </div>
            </div>

            <!-- Security Notice -->
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.infoColor}; margin: 0 0 20px 0; font-size: 20px;">🛡️ Secure Transaction</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <ul style="color: ${emailStyles.infoColor}; margin: 0; padding-left: 20px; line-height: 2;">
                  <li>All payments are processed securely through Stripe</li>
                  <li>Your payment information is encrypted end-to-end</li>
                  <li>We never store your card details</li>
                  <li>Look for the padlock icon in your browser</li>
                </ul>
              </div>
            </div>

            <!-- Contact Information -->
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.infoColor}; margin: 0 0 20px 0; font-size: 20px;">📞 Need Assistance?</h3>
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7;">
                  If you have any questions about these charges or need assistance with the payment process, our team is here to help:
                </p>
                <ul style="color: ${emailStyles.infoColor}; margin: 0; padding-left: 20px; line-height: 2;">
                  <li><strong>Email:</strong> info@latorresullaviafrancigena.com</li>
                  <li><strong>Phone:</strong> +39 0577 123456</li>
                  <li><strong>Hours:</strong> 9:00 AM - 6:00 PM (CET)</li>
                </ul>
              </div>
            </div>

            <!-- Final Message -->
            <div style="text-align: center; padding: 32px 24px; background: linear-gradient(135deg, ${emailStyles.backgroundColor} 0%, #f1f5f9 100%); border-radius: 16px; margin-bottom: 24px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 16px 0; font-size: 26px; font-weight: 700;">Thank You!</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 24px 0; font-size: 17px; line-height: 1.7;">
                We appreciate your business and look forward to serving you again at La Torre sulla via Francigena.
              </p>
              <div style="color: ${emailStyles.infoColor}; font-size: 18px; font-weight: 600;">
                We hope to see you soon! 🌟
              </div>
            </div>
          </div>
    
          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        chargeId: { type: 'string', description: 'Charge ID', example: 'CHG123' },
        customerName: { type: 'string', description: 'Customer full name', example: 'John Doe' },
        customerEmail: { type: 'string', description: 'Customer email', example: 'john@example.com' },
        customerPhone: { type: 'string', description: 'Customer phone number', example: '+1234567890', optional: true },
        customerNationality: { type: 'string', description: 'Customer nationality', example: 'Italian', optional: true },
        amount: { type: 'number', description: 'Charge amount', example: 50.00 },
        currency: { type: 'string', description: 'Charge currency', example: 'EUR' },
        description: { type: 'string', description: 'Charge description', example: 'Extra services during stay' },
        chargeDate: { type: 'string', description: 'Date when charge was added', example: 'January 1, 2024' },
        paymentLink: { type: 'string', description: 'Payment link URL', example: 'https://example.com/pay' },
        expiresAt: { type: 'string', description: 'Payment link expiry date', example: 'January 1, 2024 6:00 PM' }
      }
    },
    {
      name: 'Password Reset OTP',
      type: 'PASSWORD_RESET_OTP',
      subject: 'Password Reset - Your OTP Code',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: auto; background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center;">
            <!-- Logo -->
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="height: 48px; margin-bottom: 24px;" />

            <!-- Heading -->
            <h2 style="color: #0f172a; font-size: 20px; margin-bottom: 16px;">🔐 Password Reset OTP</h2>

            <!-- Message -->
            <p style="font-size: 16px; margin-bottom: 12px; color: #334155;">
              Use the following OTP to reset your password with <strong>La Torre</strong>.
            </p>

            <!-- OTP Code -->
            <div style="font-size: 32px; font-weight: 700; color: #1d4ed8; margin: 24px 0;">{{otp}}</div>

            <!-- Expiry Notice -->
            <p style="font-size: 14px; color: #64748b;">
              This code will expire in <strong>15 minutes</strong>.
            </p>

            <hr style="margin: 32px 0; border: none; border-top: 1px solid #e2e8f0;" />

            <!-- Footer -->
            <p style="font-size: 12px; color: #94a3b8;">
              If you didn't request this code, you can safely ignore this email.<br />
              © {{year}} La Torre. All rights reserved.
            </p>
          </div>
        </div>
      `,
      isActive: true,
      version: 1,
      variables: {
        otp: 'string',
        year: 'number'
      }
    },
    {
      name: 'Booking Confirmation',
      type: 'BOOKING_CONFIRMATION',
      subject: 'Booking Confirmed - Welcome to La Torre! (#{{confirmationId}})',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>

          <!-- Confirmation Hero -->
          <div style="background: linear-gradient(135deg, ${emailStyles.successColor} 0%, #059669 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">✅</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Booking Confirmed!</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">
              {{totalRooms}} {{#if (eq totalRooms 1)}}Room{{else}}Rooms{{/if}} Reserved • Welcome to La Torre
            </p>
          </div>

          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
            <!-- Personal Greeting -->
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{customerName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                Thank you for choosing La Torre sulla via Francigena for your stay. We're delighted to confirm your reservation!
              </p>
            </div>

            <!-- Booking Summary -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">📋 Booking Summary</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Confirmation ID:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-family: monospace; background: ${emailStyles.backgroundColor}; padding: 6px 12px; border-radius: 6px;">#{{confirmationId}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Check-in:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{checkInDate}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Check-out:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{checkOutDate}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Total Nights:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{totalNights}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Total Guests:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{totalGuests}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Status:</span>
                    <span style="background: ${emailStyles.successColor}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">{{paymentStatus}}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Room Details -->
            {{#each bookings}}
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <div style="background: white; padding: 24px; border-radius: 12px; border-left: 4px solid ${emailStyles.infoColor};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                  <div style="flex: 1;">
                    <h4 style="color: ${emailStyles.primaryColor}; margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">{{room.name}}</h4>
                    <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 16px 0; font-size: 15px; line-height: 1.6;">{{room.description}}</p>
                    <div style="background: #f0f9ff; padding: 12px; border-radius: 8px; border: 1px solid #bfdbfe;">
                      <div style="color: ${emailStyles.infoColor}; font-size: 14px; line-height: 1.5;">
                        <div style="margin-bottom: 4px;"><strong>Booking ID:</strong> #{{id}}</div>
                        <div style="margin-bottom: 4px;"><strong>Stay Period:</strong> {{checkIn}} - {{checkOut}}</div>
                        <div><strong>Details:</strong> {{nights}} nights • {{totalGuests}} guests • Capacity: {{room.capacity}}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Room Price Breakdown -->
                <div style="margin-top: 20px; background: #f8fafc; padding: 16px; border-radius: 8px;">
                  <h5 style="color: ${emailStyles.primaryColor}; margin: 0 0 12px 0; font-size: 16px;">Price Breakdown</h5>
                  <div style="display: grid; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: ${emailStyles.secondaryColor};">Room Rate per Night</span>
                      <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">€{{basePrice}}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: ${emailStyles.secondaryColor};">Number of Nights</span>
                      <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{nights}}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: ${emailStyles.secondaryColor};">Room Total</span>
                      <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">€{{roomTotal}}</span>
                    </div>
                    {{#if enhancementsTotal}}
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: ${emailStyles.secondaryColor};">Room Enhancements</span>
                      <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">€{{enhancementsTotal}}</span>
                    </div>
                    {{/if}}
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; background: #f0f9ff; border-radius: 6px; margin-top: 8px;">
                      <span style="color: ${emailStyles.infoColor}; font-weight: 600;">Total for This Room</span>
                      <span style="color: ${emailStyles.infoColor}; font-weight: 700;">€{{add roomTotal enhancementsTotal}}</span>
                    </div>
                  </div>
                </div>

                {{#if room.amenities}}
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f9ff;">
                  <strong style="color: ${emailStyles.primaryColor}; font-size: 14px; display: block; margin-bottom: 12px;">Room Amenities:</strong>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    {{#each room.amenities}}
                      <span style="background: ${emailStyles.infoColor}; color: white; padding: 6px 12px; border-radius: 16px; font-size: 12px; font-weight: 600;">{{this}}</span>
                    {{/each}}
                  </div>
                </div>
                {{/if}}

                {{#if enhancements.length}}
                <div style="margin-top: 16px; padding: 16px; background: #f0f9ff; border-radius: 8px;">
                  <strong style="color: ${emailStyles.infoColor}; font-size: 14px; display: block; margin-bottom: 12px;">Room Enhancements:</strong>
                  {{#each enhancements}}
                  <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                      <div>
                        <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{title}}</div>
                        <div style="color: ${emailStyles.secondaryColor}; font-size: 13px;">{{description}}</div>
                        <div style="color: ${emailStyles.secondaryColor}; font-size: 12px; margin-top: 4px;">
                          {{#if (eq pricingDetails.pricingType "PER_GUEST")}}
                          €{{pricingDetails.basePrice}} × {{pricingDetails.guests}} guest(s)
                          {{else if (eq pricingDetails.pricingType "PER_DAY")}}
                          €{{pricingDetails.basePrice}} × {{pricingDetails.nights}} night(s)
                          {{else}}
                          €{{pricingDetails.basePrice}} (per booking)
                          {{/if}}
                        </div>
                      </div>
                      <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">€{{calculatedPrice}}</div>
                    </div>
                  </div>
                  {{/each}}
                </div>
                {{/if}}

                {{#if events.length}}
                <div style="margin-top: 16px; padding: 16px; background: #f0f4ff; border-radius: 8px;">
                  <strong style="color: ${emailStyles.infoColor}; font-size: 14px; display: block; margin-bottom: 12px;">Events & Activities:</strong>
                  {{#each events}}
                  <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                      <div>
                        <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{name}}</div>
                        <div style="color: ${emailStyles.secondaryColor}; font-size: 13px;">{{description}}</div>
                        <div style="color: ${emailStyles.secondaryColor}; font-size: 12px; margin-top: 4px;">
                          {{#if (eq pricingDetails.pricingType "PER_GUEST")}}
                          €{{pricingDetails.basePrice}} × {{pricingDetails.attendees}} attendee(s)
                          {{else if (eq pricingDetails.pricingType "PER_DAY")}}
                          €{{pricingDetails.basePrice}} × {{pricingDetails.nights}} night(s)
                          {{else}}
                          €{{pricingDetails.basePrice}} (per booking)
                          {{/if}}
                        </div>
                      </div>
                      <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">€{{calculatedPrice}}</div>
                    </div>
                  </div>
                  {{/each}}
                </div>
                {{/if}}

                {{#if request}}
                <div style="margin-top: 16px; padding: 16px; background: #fef7cd; border-radius: 8px; border-left: 4px solid ${emailStyles.warningColor};">
                  <strong style="color: #92400e; font-size: 13px; display: block; margin-bottom: 6px;">Special Request:</strong>
                  <p style="color: #a16207; margin: 0; font-size: 14px; font-style: italic;">"{{request}}"</p>
                </div>
                {{/if}}
              </div>
            </div>
            {{/each}}

            <!-- Payment Summary -->
            <div style="background: #dcfce7; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #166534; margin: 0 0 20px 0; font-size: 20px;">💳 Payment Summary</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Payment Method:</span>
                    <span style="color: #166534; font-weight: 600;">
                      {{#if (eq paymentMethod "STRIPE")}}
                        💳 Credit/Debit Card
                      {{else if (eq paymentMethod "CASH")}}
                        💵 Cash Payment
                      {{else if (eq paymentMethod "BANK_TRANSFER")}}
                        🏦 Bank Transfer
                      {{else}}
                        💳 {{paymentMethod}}
                      {{/if}}
                    </span>
                  </div>
                  {{#if enhancementsTotal}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Total Enhancements:</span>
                    <span style="color: #166534; font-weight: 600;">€{{enhancementsTotal}}</span>
                  </div>
                  {{/if}}
                  {{#if roomsTotal}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Total Rooms:</span>
                    <span style="color: #166534; font-weight: 600;">€{{roomsTotal}}</span>
                  </div>
                  {{/if}}
                  {{#if eventsTotal}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Total Events:</span>
                    <span style="color: #166534; font-weight: 600;">€{{eventsTotal}}</span>
                  </div>
                  {{/if}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Subtotal:</span>
                    <span style="color: #166534; font-weight: 600;">€{{subtotal}}</span>
                  </div>
                  {{#if voucherInfo}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0; background: #f0f9ff; border-radius: 6px; padding: 12px;">
                    <span style="color: #166534; font-weight: 600;">Voucher Discount ({{voucherInfo.code}}):</span>
                    <span style="color: #166534; font-weight: 600;">-€{{voucherInfo.discountAmount}}</span>
                  </div>
                  {{/if}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Tax (10%):</span>
                    <span style="color: #166534; font-weight: 600;">€{{taxAmount}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 0; background: #f0fdf4; border-radius: 8px; margin-top: 8px;">
                    <span style="color: #166534; font-weight: 700; font-size: 18px;">Total Amount:</span>
                    <span style="color: #166534; font-weight: 700; font-size: 18px;">€{{amount}}</span>
                  </div>
                </div>
              </div>
            </div>

            {{#if (eq paymentMethod "CASH")}}
            <!-- Cash Payment Notice -->
            <div style="background: #fef3c7; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #92400e; margin: 0 0 20px 0; font-size: 20px;">💵 Cash Payment Notice</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <p style="color: #92400e; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7;">
                  <strong>Payment Method:</strong> Cash payment has been arranged for this booking.
                </p>
                <ul style="color: #92400e; margin: 0; padding-left: 20px; line-height: 2;">
                  <li>Please bring the exact amount in cash upon check-in</li>
                  <li>Payment is due at the time of arrival</li>
                  <li>We accept € currency only</li>
                  <li>Please have your confirmation ID ready</li>
                </ul>
              </div>
            </div>
            {{/if}}

            {{#if (eq paymentMethod "BANK_TRANSFER")}}
            <!-- Bank Transfer Notice -->
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #0369a1; margin: 0 0 20px 0; font-size: 20px;">🏦 Bank Transfer Payment</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <p style="color: #0369a1; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7;">
                  <strong>Payment Method:</strong> Bank transfer payment has been arranged for this booking.
                </p>
                <ul style="color: #0369a1; margin: 0; padding-left: 20px; line-height: 2;">
                  <li>Please complete the bank transfer before your arrival</li>
                  <li>Include your confirmation ID in the transfer reference</li>
                  <li>Payment confirmation will be sent once received</li>
                  <li>Contact us if you need bank account details</li>
                </ul>
              </div>
            </div>
            {{/if}}

            {{#if voucherInfo.products}}
            <!-- Voucher Products -->
            <div style="background: #fef3c7; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #92400e; margin: 0 0 20px 0; font-size: 20px;">🎁 Complimentary Items</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <p style="color: #92400e; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7;">
                  As part of your voucher <strong>{{voucherInfo.code}}</strong>, you'll receive these complimentary items:
                </p>
                <div style="display: grid; gap: 16px;">
                  {{#each voucherInfo.products}}
                  <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: #fef7cd; border-radius: 8px; border: 1px solid #fde68a;">
                    {{#if imageUrl}}
                    <img src="{{imageUrl}}" alt="{{name}}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" />
                    {{/if}}
                    <div style="flex: 1;">
                      <h4 style="color: #92400e; margin: 0 0 4px 0; font-size: 18px; font-weight: 600;">{{name}}</h4>
                      {{#if description}}
                      <p style="color: #a16207; margin: 0; font-size: 14px; line-height: 1.5;">{{description}}</p>
                      {{/if}}
                      <div style="margin-top: 8px;">
                        <span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">FREE</span>
                        {{#if value}}
                        <span style="color: #92400e; font-size: 14px; margin-left: 8px;">Value: {{../currency}} {{value}}</span>
                        {{/if}}
                      </div>
                    </div>
                  </div>
                  {{/each}}
                </div>
              </div>
            </div>
            {{/if}}

            <!-- Important Information -->
            <div style="background: #fef2f2; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #dc2626; margin: 0 0 20px 0; font-size: 20px;">ℹ️ Important Information</h3>
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <ul style="color: #b91c1c; margin: 0; padding-left: 20px; line-height: 2;">
                  <li><strong>Check-in:</strong> 3:00 PM onwards</li>
                  <li><strong>Check-out:</strong> 11:00 AM</li>
                  <li><strong>ID Required:</strong> Please bring valid identification</li>
                  <li><strong>Changes:</strong> Contact us 24 hours in advance for modifications</li>
                  <li><strong>Confirmation:</strong> All {{totalRooms}} rooms are secured under this reservation</li>
                  <li><strong>Parking:</strong> Complimentary parking available on-site</li>
                </ul>
              </div>
            </div>

            <!-- Final Message -->
            <div style="text-align: center; padding: 32px 24px; background: linear-gradient(135deg, ${emailStyles.backgroundColor} 0%, #f1f5f9 100%); border-radius: 16px; margin-bottom: 24px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 16px 0; font-size: 26px; font-weight: 700;">We Can't Wait to Welcome You!</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 24px 0; font-size: 17px; line-height: 1.7;">
                Your journey along the Via Francigena begins with us. If you have any questions or need assistance, 
                please don't hesitate to contact our team.
              </p>
              <div style="color: ${emailStyles.infoColor}; font-size: 18px; font-weight: 600;">
                Safe travels, and see you soon! 🌟
              </div>
            </div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        confirmationId: { type: 'string', description: 'Booking confirmation ID', example: 'ABC123' },
        customerName: { type: 'string', description: 'Customer full name', example: 'John Doe' },
        checkInDate: { type: 'string', description: 'Check-in date', example: 'Monday, January 1, 2024' },
        checkOutDate: { type: 'string', description: 'Check-out date', example: 'Wednesday, January 3, 2024' },
        totalNights: { type: 'number', description: 'Total number of nights', example: 2 },
        totalRooms: { type: 'number', description: 'Total number of rooms', example: 1 },
        totalGuests: { type: 'number', description: 'Total number of guests', example: 2 },
        totalAmount: { type: 'number', description: 'Total payment amount', example: 500 },
        currency: { type: 'string', description: 'Payment currency', example: 'EUR' },
        paymentStatus: { type: 'string', description: 'Payment status', example: 'COMPLETED' },
        bookings: { 
          type: 'array', 
          description: 'Array of booking details',
          example: [{
            id: 'BOOK123',
            room: {
              name: 'Deluxe Room',
              description: 'Spacious room with a view',
              amenities: ['WiFi', 'TV', 'Air Conditioning'],
              price: 200,
              capacity: 2
            },
            checkIn: '2024-01-01',
            checkOut: '2024-01-03',
            totalGuests: 2,
            request: 'Early check-in if possible',
            nights: 2
          }]
        },
        enhancements: {
          type: 'array',
          description: 'Array of enhancement bookings',
          example: [{
            title: 'Airport Transfer',
            description: 'Round-trip airport transfer',
            quantity: 1,
            price: 100,
            notes: 'Flight arrival at 2 PM'
          }]
        },
        enhancementTotal: { type: 'number', description: 'Total cost of enhancements', example: 100 },
        voucherInfo: { type: 'object', description: 'Optional voucher details', optional: true, example: {
          code: 'SAVE20',
          name: '20% Off Discount',
          type: 'DISCOUNT',
          discountPercent: 20,
          discountAmount: 100,
          originalAmount: 500,
          finalAmount: 400,
          products: [{
            name: 'Welcome Gift',
            description: 'Complimentary welcome package',
            imageUrl: 'https://example.com/gift.jpg',
            value: 25
          }]
        }},
        voucherDiscount: { type: 'number', description: 'Voucher discount amount', example: 100 },
        originalAmount: { type: 'number', description: 'Original amount before voucher', example: 500 },
        voucherProducts: { 
          type: 'array', 
          description: 'Array of free products from voucher',
          example: [{
            name: 'Welcome Gift',
            description: 'Complimentary welcome package',
            imageUrl: 'https://example.com/gift.jpg',
            value: 25
          }]
        }
      }
    },
    {
      name: 'Booking Cancellation',
      type: 'BOOKING_CANCELLATION',
      subject: 'Booking Cancelled - La Torre (#{{confirmationId}})',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Cancellation - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>
    
          <!-- Cancellation Hero -->
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">❌</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Booking Cancelled</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">
              Your reservation has been successfully cancelled
            </p>
          </div>
    
          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
            <!-- Personal Greeting -->
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{customerName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                We have successfully processed your cancellation request. We're sorry to see you won't be joining us at La Torre sulla via Francigena, but we understand that plans can change.
              </p>
            </div>
    
            <!-- Cancellation Summary -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">📋 Cancellation Details</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Confirmation ID:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-family: monospace; background: ${emailStyles.backgroundColor}; padding: 6px 12px; border-radius: 6px;">#{{confirmationId}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Original Check-in:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{checkInDate}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Original Check-out:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{checkOutDate}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Total Nights:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{totalNights}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Total Guests:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{totalGuests}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Status:</span>
                    <span style="background: #ef4444; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">CANCELLED</span>
                  </div>
                </div>
              </div>
            </div>
    
            <!-- Cancelled Room Details -->
            {{#each bookings}}
            <div style="background: #fef2f2; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #ef4444;">
              <div style="background: white; padding: 24px; border-radius: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                  <div style="flex: 1;">
                    <h4 style="color: ${emailStyles.primaryColor}; margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">{{room.name}} <span style="color: #ef4444; font-size: 14px; font-weight: 500;">(CANCELLED)</span></h4>
                    <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 16px 0; font-size: 15px; line-height: 1.6;">{{room.description}}</p>
                    <div style="background: #fef2f2; padding: 12px; border-radius: 8px; border: 1px solid #fecaca;">
                      <div style="color: #dc2626; font-size: 14px; line-height: 1.5;">
                        <div style="margin-bottom: 4px;"><strong>Booking ID:</strong> #{{id}}</div>
                        <div style="margin-bottom: 4px;"><strong>Original Stay Period:</strong> {{checkIn}} - {{checkOut}}</div>
                        <div><strong>Details:</strong> {{nights}} nights • {{totalGuests}} guests • Capacity: {{room.capacity}}</div>
                      </div>
                    </div>
                  </div>
                </div>
    
                <!-- Original Room Price Breakdown -->
                <div style="margin-top: 20px; background: #f8fafc; padding: 16px; border-radius: 8px;">
                  <h5 style="color: ${emailStyles.primaryColor}; margin: 0 0 12px 0; font-size: 16px;">Original Booking Amount</h5>
                  <div style="display: grid; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: ${emailStyles.secondaryColor};">Room Rate per Night</span>
                      <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">€{{basePrice}}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: ${emailStyles.secondaryColor};">Number of Nights</span>
                      <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{nights}}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: ${emailStyles.secondaryColor};">Room Total</span>
                      <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">€{{roomTotal}}</span>
                    </div>
                    {{#if enhancementsTotal}}
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: ${emailStyles.secondaryColor};">Room Enhancements</span>
                      <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">€{{enhancementsTotal}}</span>
                    </div>
                    {{/if}}
                    {{#if eventsTotal}}
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: ${emailStyles.secondaryColor};">Events & Activities</span>
                      <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{../currency}} {{eventsTotal}}</span>
                    </div>
                    {{/if}}
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; background: #fef2f2; border-radius: 6px; margin-top: 8px; text-decoration: line-through; opacity: 0.7;">
                      <span style="color: #dc2626; font-weight: 600;">Original Total</span>
                      <span style="color: #dc2626; font-weight: 700;">€{{add roomTotal enhancementsTotal eventsTotal}}</span>
                    </div>
                  </div>
                </div>
    
                {{#if enhancements.length}}
                <div style="margin-top: 16px; padding: 16px; background: #fef2f2; border-radius: 8px;">
                  <strong style="color: #dc2626; font-size: 14px; display: block; margin-bottom: 12px;">Cancelled Enhancements:</strong>
                  {{#each enhancements}}
                  <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 8px; opacity: 0.7;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                      <div>
                        <div style="color: ${emailStyles.primaryColor}; font-weight: 600; text-decoration: line-through;">{{title}}</div>
                        <div style="color: ${emailStyles.secondaryColor}; font-size: 13px; text-decoration: line-through;">{{description}}</div>
                        <div style="color: ${emailStyles.secondaryColor}; font-size: 12px; margin-top: 4px;">
                          {{#if (eq pricingDetails.pricingType "PER_GUEST")}}
                          €{{pricingDetails.basePrice}} × {{pricingDetails.guests}} guest(s)
                          {{else if (eq pricingDetails.pricingType "PER_DAY")}}
                          €{{pricingDetails.basePrice}} × {{pricingDetails.nights}} night(s)
                          {{else}}
                          €{{pricingDetails.basePrice}} (per booking)
                          {{/if}}
                        </div>
                      </div>
                      <div style="color: #dc2626; font-weight: 600; text-decoration: line-through;">€{{calculatedPrice}}</div>
                    </div>
                  </div>
                  {{/each}}
                </div>
                {{/if}}

                {{#if events.length}}
                <div style="margin-top: 16px; padding: 16px; background: #fef2f2; border-radius: 8px;">
                  <strong style="color: #dc2626; font-size: 14px; display: block; margin-bottom: 12px;">Cancelled Events & Activities:</strong>
                  {{#each events}}
                  <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 8px; opacity: 0.7;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                      <div>
                        <div style="color: ${emailStyles.primaryColor}; font-weight: 600; text-decoration: line-through;">{{name}}</div>
                        <div style="color: ${emailStyles.secondaryColor}; font-size: 13px; text-decoration: line-through;">{{description}}</div>
                        <div style="color: ${emailStyles.secondaryColor}; font-size: 12px; margin-top: 4px;">
                          {{#if (eq pricingDetails.pricingType "PER_GUEST")}}
                          €{{pricingDetails.basePrice}} × {{pricingDetails.attendees}} attendee(s)
                          {{else if (eq pricingDetails.pricingType "PER_DAY")}}
                          €{{pricingDetails.basePrice}} × {{pricingDetails.nights}} night(s)
                          {{else}}
                          €{{pricingDetails.basePrice}} (per booking)
                          {{/if}}
                        </div>
                      </div>
                      <div style="color: #dc2626; font-weight: 600; text-decoration: line-through;">€{{calculatedPrice}}</div>
                    </div>
                  </div>
                  {{/each}}
                </div>
                {{/if}}
              </div>
            </div>
            {{/each}}
    
            {{#if refund}}
            <!-- Refund Information -->
            <div style="background: #dcfce7; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #166534; margin: 0 0 20px 0; font-size: 20px;">💰 Refund Information</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Refund ID:</span>
                    <span style="color: #166534; font-weight: 700; font-family: monospace; background: #dcfce7; padding: 6px 12px; border-radius: 6px;">{{refund.refundId}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Refund Amount:</span>
                    <span style="color: #166534; font-weight: 700; font-size: 18px;">{{refund.refundCurrency}} {{refund.refundAmount}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Refund Reason:</span>
                    <span style="color: #166534; font-weight: 600;">{{refund.refundReason}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Payment Method:</span>
                    <span style="color: #166534; font-weight: 600;">{{paymentMethod}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #166534; font-weight: 600;">Status:</span>
                    <span style="background: #166534; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">PROCESSED</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Manual Refund Note -->
            {{#if isManualRefund}}
            <div style="background: #fef3c7; border-radius: 12px; padding: 24px; margin-bottom: 32px; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin: 0 0 16px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #f59e0b;"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>
                Manual Refund Notice
              </h3>
              <div style="background: white; padding: 16px; border-radius: 8px;">
                <p style="color: #a16207; margin: 0; font-size: 15px; line-height: 1.7;">
                  This refund was processed manually for a <strong>{{paymentMethod}}</strong> payment. If you have not yet received your refund, please contact our team for assistance.
                </p>
              </div>
            </div>
            {{/if}}
    
            <!-- Refund Processing Note -->
            {{#if (or (eq paymentMethod "STRIPE") (eq paymentMethod "BANK_TRANSFER"))}}
            <div style="background: #fef3c7; border-radius: 12px; padding: 24px; margin-bottom: 32px; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin: 0 0 16px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #f59e0b;"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>
                Refund Processing Information
              </h3>
              <div style="background: white; padding: 16px; border-radius: 8px;">
                <p style="color: #a16207; margin: 0; font-size: 15px; line-height: 1.7;">
                  This email is to confirm that your refund has been issued by <strong>La Torre sulla via Francigena</strong>. 
                  It can take approximately <strong>10 days</strong> to appear on your statement. If it takes longer, 
                  please contact your bank for assistance.
                </p>
              </div>
            </div>
            {{/if}}
            {{else}}
            <!-- No Refund Information -->
            <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 32px; border-left: 4px solid #64748b;">
              <h3 style="color: #475569; margin: 0 0 16px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #64748b;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                Payment Information
              </h3>
              <div style="background: white; padding: 16px; border-radius: 8px;">
                <p style="color: #64748b; margin: 0; font-size: 15px; line-height: 1.7;">
                  Your booking has been cancelled successfully. No refund is applicable for this cancellation as per our cancellation policy or the cancellation was processed before any payment was made.
                </p>
              </div>
            </div>
            {{/if}}
    
            <!-- Future Booking Invitation -->
            <div style="text-align: center; padding: 32px 24px; background: linear-gradient(135deg, ${emailStyles.backgroundColor} 0%, #f1f5f9 100%); border-radius: 16px; margin-bottom: 24px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 16px 0; font-size: 26px; font-weight: 700;">We Hope to Welcome You Soon!</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 24px 0; font-size: 17px; line-height: 1.7;">
                While we're disappointed that you won't be joining us this time, we'd love to have you stay with us in the future. 
                La Torre sulla via Francigena will always be here to welcome you along your journey.
              </p>
              <div style="margin-top: 24px;">
                <a href="https://booking-engine-seven.vercel.app" style="display: inline-block; background: ${emailStyles.primaryColor}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Book Your Next Stay
                </a>
              </div>
            </div>
    
            <!-- Contact Information -->
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.infoColor}; margin: 0 0 20px 0; font-size: 20px;">📞 Need Assistance?</h3>
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7;">
                  If you have any questions about this cancellation or need assistance with future bookings, our team is here to help:
                </p>
                <ul style="color: ${emailStyles.infoColor}; margin: 0; padding-left: 20px; line-height: 2;">
                  <li><strong>Email:</strong> info@latorresullaviafrancigena.com</li>
                  <li><strong>Phone:</strong> +39 0577 123456</li>
                  <li><strong>Hours:</strong> 9:00 AM - 6:00 PM (CET)</li>
                </ul>
              </div>
            </div>
    
            <!-- Final Message -->
            <div style="text-align: center; color: ${emailStyles.secondaryColor}; font-size: 16px; line-height: 1.7;">
              <p style="margin: 0;">
                Thank you for considering La Torre sulla via Francigena. We look forward to serving you in the future.
              </p>
              <div style="margin-top: 16px; color: ${emailStyles.infoColor}; font-weight: 600;">
                Safe travels! 🌟
              </div>
            </div>
          </div>
    
          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        confirmationId: { type: 'string', description: 'Booking confirmation ID', example: 'ABC123' },
        customerName: { type: 'string', description: 'Customer full name', example: 'John Doe' },
        checkInDate: { type: 'string', description: 'Original check-in date', example: 'Monday, January 1, 2024' },
        checkOutDate: { type: 'string', description: 'Original check-out date', example: 'Wednesday, January 3, 2024' },
        totalNights: { type: 'number', description: 'Total number of nights', example: 2 },
        totalGuests: { type: 'number', description: 'Total number of guests', example: 2 },
        currency: { type: 'string', description: 'Payment currency', example: 'EUR' },
        bookings: { 
          type: 'array', 
          description: 'Array of cancelled booking details',
          example: [{
            id: 'BOOK123',
            room: {
              name: 'Deluxe Room',
              description: 'Spacious room with a view',
              price: 200,
              capacity: 2
            },
            checkIn: '2024-01-01',
            checkOut: '2024-01-03',
            totalGuests: 2,
            nights: 2,
            roomTotal: 400,
            enhancementsTotal: 100,
            enhancements: []
          }]
        },
        refund: {
          type: 'object',
          description: 'Optional refund details - only show if refund was processed',
          optional: true,
          example: {
            refundId: 're_1234567890',
            refundAmount: 500,
            refundCurrency: 'EUR',
            refundReason: 'Customer requested cancellation'
          }
        }
      }
    },
    {
      name: 'Admin Notification',
      type: 'ADMIN_NOTIFICATION',
      subject: '🔔 URGENT: {{totalRooms}} Room Booking Alert - {{customerName}} (#{{confirmationId}})',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Booking Alert - Admin</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @media only screen and (max-width: 600px) {
            .mobile-padding { padding: 16px !important; }
            .mobile-text { font-size: 14px !important; }
            .mobile-title { font-size: 24px !important; }
            .mobile-grid { display: block !important; }
            .mobile-grid > div { margin-bottom: 16px !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9; line-height: 1.6;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; text-align: center; padding: 32px; border-radius: 0 0 16px 16px;">
            <div style="font-size: 44px; margin-bottom: 16px; line-height: 1;">🔔</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700; font-family: ${emailStyles.fontFamily};" class="mobile-title">New Booking Alert!</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95; font-family: ${emailStyles.fontFamily};">
              {{totalRooms}} {{#if (eq totalRooms 1)}}Room{{else}}Rooms{{/if}} • Requires Attention
            </p>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px 32px;" class="mobile-padding">
            <!-- Customer Details -->
            <div style="background: #fef2f2; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #fecaca;">
              <h3 style="color: #dc2626; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; font-family: ${emailStyles.fontFamily};">👤 Customer Information</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #fecaca;">
                    <span style="font-weight: 600; color: #dc2626; font-family: ${emailStyles.fontFamily};">Name:</span>
                    <span style="color: #b91c1c; font-weight: 600; font-family: ${emailStyles.fontFamily};">{{customerName}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #fecaca;">
                    <span style="font-weight: 600; color: #dc2626; font-family: ${emailStyles.fontFamily};">Email:</span>
                    <span style="color: #b91c1c; font-weight: 600; font-family: ${emailStyles.fontFamily};">{{customerEmail}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #fecaca;">
                    <span style="font-weight: 600; color: #dc2626; font-family: ${emailStyles.fontFamily};">Phone:</span>
                    <span style="color: #b91c1c; font-weight: 600; font-family: ${emailStyles.fontFamily};">{{customerPhone}}</span>
                  </div>
                  {{#if customerDetails.nationality}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #fecaca;">
                    <span style="font-weight: 600; color: #dc2626; font-family: ${emailStyles.fontFamily};">Nationality:</span>
                    <span style="color: #b91c1c; font-weight: 600; font-family: ${emailStyles.fontFamily};">{{customerDetails.nationality}}</span>
                  </div>
                  {{/if}}
                  {{#if customerDetails.specialRequests}}
                  <div style="padding: 12px 0;">
                    <span style="font-weight: 600; color: #dc2626; display: block; margin-bottom: 8px; font-family: ${emailStyles.fontFamily};">Special Requests:</span>
                    <div style="background: #fef2f2; padding: 12px; border-radius: 8px; color: #b91c1c; font-style: italic; font-family: ${emailStyles.fontFamily};">
                      "{{customerDetails.specialRequests}}"
                    </div>
                  </div>
                  {{/if}}
                </div>
              </div>
            </div>

            <!-- Booking Details -->
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #bfdbfe;">
              <h3 style="color: ${emailStyles.infoColor}; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; font-family: ${emailStyles.fontFamily};">📋 Booking Details</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #bfdbfe;">
                    <span style="font-weight: 600; color: ${emailStyles.infoColor}; font-family: ${emailStyles.fontFamily};">Confirmation ID:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-family: 'Monaco', 'Menlo', monospace; background: #f0f9ff; padding: 6px 12px; border-radius: 6px; border: 1px solid #bfdbfe;">#{{confirmationId}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #bfdbfe;">
                    <span style="font-weight: 600; color: ${emailStyles.infoColor}; font-family: ${emailStyles.fontFamily};">Check-in:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600; font-family: ${emailStyles.fontFamily};">{{checkInDate}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #bfdbfe;">
                    <span style="font-weight: 600; color: ${emailStyles.infoColor}; font-family: ${emailStyles.fontFamily};">Check-out:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600; font-family: ${emailStyles.fontFamily};">{{checkOutDate}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0;">
                    <span style="font-weight: 600; color: ${emailStyles.infoColor}; font-family: ${emailStyles.fontFamily};">Total Guests:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600; font-family: ${emailStyles.fontFamily};">{{totalGuests}}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Room Details -->
            <div style="border-top: 1px solid ${emailStyles.borderColor}; padding-top: 24px;">
              <h3 style="margin: 0 0 16px 0; color: ${emailStyles.primaryColor}; font-size: 16px;">Room Details</h3>
              {{#each bookings}}
              <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                  <div style="flex: 1;">
                    <h4 style="margin: 0 0 8px 0; color: ${emailStyles.primaryColor}; font-size: 18px;">{{room.name}}</h4>
                    <p style="margin: 0; color: ${emailStyles.secondaryColor}; font-size: 14px;">{{room.description}}</p>
                    <div style="margin-top: 12px; color: ${emailStyles.secondaryColor}; font-size: 14px;">
                      {{nights}} night(s) • {{totalGuests}} guest(s)
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 700; font-size: 20px;">€{{room.price}}</div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 13px;">per night</div>
                  </div>
                </div>

                {{#if room.amenities.length}}
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${emailStyles.borderColor};">
                  <div style="color: ${emailStyles.secondaryColor}; font-size: 13px; margin-bottom: 8px;">Room Amenities</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    {{#each room.amenities}}
                    <span style="background: ${emailStyles.backgroundColor}; color: ${emailStyles.primaryColor}; font-size: 12px; padding: 4px 12px; border-radius: 12px;">{{this}}</span>
                    {{/each}}
                  </div>
                </div>
                {{/if}}

                {{#if events.length}}
                <div style="margin-top: 16px; padding: 16px; background: #f0f4ff; border-radius: 8px;">
                  <div style="color: ${emailStyles.infoColor}; font-size: 13px; margin-bottom: 8px;">Events & Activities</div>
                  {{#each events}}
                  <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                      <div>
                        <div style="color: ${emailStyles.primaryColor}; font-weight: 600; font-size: 14px;">{{name}}</div>
                        <div style="color: ${emailStyles.secondaryColor}; font-size: 12px;">{{description}}</div>
                        <div style="color: ${emailStyles.secondaryColor}; font-size: 11px; margin-top: 4px;">
                          {{plannedAttendees}} attendee(s) • €{{pricingDetails.basePrice}} {{pricingDetails.pricingType}}
                        </div>
                      </div>
                      <div style="color: ${emailStyles.primaryColor}; font-weight: 600; font-size: 14px;">€{{calculatedPrice}}</div>
                    </div>
                  </div>
                  {{/each}}
                </div>
                {{/if}}

                {{#if request}}
                <div style="margin-top: 16px; padding: 16px; background: #fef7cd; border-radius: 8px; border-left: 4px solid ${emailStyles.warningColor};">
                  <strong style="color: #92400e; font-size: 13px; display: block; margin-bottom: 6px;">Special Request:</strong>
                  <p style="color: #a16207; margin: 0; font-size: 14px; font-style: italic;">"{{request}}"</p>
                </div>
                {{/if}}
              </div>
              {{/each}}
            </div>

            <!-- Payment Information -->
            <div style="background: #dcfce7; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #86efac;">
              <h3 style="color: #166534; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; font-family: ${emailStyles.fontFamily};">💳 Payment Information</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #bbf7d0;">
                    <span style="font-weight: 600; color: #166534; font-family: ${emailStyles.fontFamily};">Amount:</span>
                    <span style="color: #166534; font-weight: 600; font-family: ${emailStyles.fontFamily};">€{{payment.amount}}</span>
                  </div>
                  {{#if voucherInfo}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #bbf7d0; background: #f0f9ff; border-radius: 6px; padding: 12px;">
                    <span style="font-weight: 600; color: #166534; font-family: ${emailStyles.fontFamily};">Voucher Applied:</span>
                    <span style="color: #166534; font-weight: 600; font-family: ${emailStyles.fontFamily};">{{voucherInfo.code}} (-€{{voucherInfo.discountAmount}})</span>
                  </div>
                  {{/if}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #bbf7d0;">
                    <span style="font-weight: 600; color: #166534; font-family: ${emailStyles.fontFamily};">Status:</span>
                    <span style="background: #166534; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; font-family: ${emailStyles.fontFamily};">{{payment.status}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #bbf7d0;">
                    <span style="font-weight: 600; color: #166534; font-family: ${emailStyles.fontFamily};">Stripe Session ID:</span>
                    <span style="color: #166534; font-family: 'Monaco', 'Menlo', monospace; font-size: 14px;">{{payment.stripeSessionId}}</span>
                  </div>
                </div>
              </div>
            </div>

            {{#if voucherInfo.products}}
            <!-- Voucher Products for Admin -->
            <div style="background: #fef3c7; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #fde68a;">
              <h3 style="color: #92400e; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; font-family: ${emailStyles.fontFamily};">🎁 Complimentary Items to Prepare</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <p style="color: #92400e; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7;">
                  Customer used voucher <strong>{{voucherInfo.code}}</strong> - please prepare these complimentary items:
                </p>
                <div style="display: grid; gap: 16px;">
                  {{#each voucherInfo.products}}
                  <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: #fef7cd; border-radius: 8px; border: 1px solid #fde68a;">
                    {{#if imageUrl}}
                    <img src="{{imageUrl}}" alt="{{name}}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" />
                    {{/if}}
                    <div style="flex: 1;">
                      <h4 style="color: #92400e; margin: 0 0 4px 0; font-size: 18px; font-weight: 600;">{{name}}</h4>
                      {{#if description}}
                      <p style="color: #a16207; margin: 0; font-size: 14px; line-height: 1.5;">{{description}}</p>
                      {{/if}}
                      <div style="margin-top: 8px;">
                        <span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">COMPLIMENTARY</span>
                        {{#if value}}
                        <span style="color: #92400e; font-size: 14px; margin-left: 8px;">Value: €{{value}}</span>
                        {{/if}}
                      </div>
                    </div>
                  </div>
                  {{/each}}
                </div>
              </div>
            </div>
            {{/if}}

            <!-- Action Required -->
            <div style="background: #fef2f2; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #fecaca;">
              <h3 style="color: #dc2626; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; font-family: ${emailStyles.fontFamily};">⚡ Action Required</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <ul style="color: #b91c1c; margin: 0; padding-left: 20px; line-height: 2; font-family: ${emailStyles.fontFamily};">
                  <li>Review booking details and special requests</li>
                  <li>Verify room availability and assignments</li>
                  <li>Check payment status and transaction details</li>
                  <li>Prepare welcome package and room amenities</li>
                  <li>Update housekeeping schedule</li>
                  <li>Coordinate any special arrangements</li>
                </ul>
              </div>
            </div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        confirmationId: { type: 'string', description: 'Booking confirmation ID', example: 'ABC123' },
        customerName: { type: 'string', description: 'Customer full name', example: 'John Doe' },
        totalRooms: { type: 'number', description: 'Total number of rooms', example: 1 },
        checkInDate: { type: 'string', description: 'Check-in date', example: 'Monday, January 1, 2024' },
        checkOutDate: { type: 'string', description: 'Check-out date', example: 'Wednesday, January 3, 2024' },
        customerEmail: { type: 'string', description: 'Customer email', example: 'john@example.com' },
        customerPhone: { type: 'string', description: 'Customer phone', example: '+1234567890' },
        totalGuests: { type: 'number', description: 'Total number of guests', example: 2 },
        customerDetails: {
          type: 'object',
          description: 'Additional customer details',
          example: {
            nationality: 'Italian',
            specialRequests: 'Early check-in requested'
          }
        },
        bookings: {
          type: 'array',
          description: 'Array of booking details',
          example: [{
            id: 'BOOK123',
            room: {
              name: 'Deluxe Room',
              description: 'Spacious room with a view',
              capacity: 2
            },
            checkIn: '2024-01-01',
            checkOut: '2024-01-03',
            totalGuests: 2,
            request: 'Early check-in if possible',
            nights: 2
          }]
        },
        payment: {
          type: 'object',
          description: 'Payment details',
          example: {
            amount: 500,
            currency: 'EUR',
            status: 'COMPLETED',
            stripeSessionId: 'cs_test_123'
          }
        },
        voucherInfo: { type: 'object', description: 'Optional voucher details', optional: true, example: {
          code: 'SAVE20',
          name: '20% Off Discount',
          type: 'DISCOUNT',
          discountPercent: 20,
          discountAmount: 100,
          originalAmount: 500,
          finalAmount: 400,
          products: [{
            name: 'Welcome Gift',
            description: 'Complimentary welcome package',
            imageUrl: 'https://example.com/gift.jpg',
            value: 25
          }]
        }}
      }
    },
    {
      name: 'Payment Link',
      type: 'PAYMENT_LINK',
      subject: 'Payment Link for Your La Torre Booking',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Complete Your Booking - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>

          <!-- Payment Hero -->
          <div style="background: linear-gradient(135deg, ${emailStyles.warningColor} 0%, #f97316 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">💳</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Complete Your Booking</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">
              One step away from confirming your stay at La Torre
            </p>
          </div>

          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
            <!-- Personal Greeting -->
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{customerName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                Thank you for choosing La Torre sulla via Francigena. To secure your reservation, please complete your payment using the link below or via bank transfer.
              </p>
            </div>

            <!-- Payment Link Card -->
            <div style="background: #fff7ed; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #9a3412; margin: 0 0 20px 0; font-size: 20px;">🔒 Secure Payment</h3>
              <div style="background: white; border-radius: 8px; padding: 24px; text-align: center;">
                <p style="color: #9a3412; margin: 0 0 20px 0; font-size: 15px;">
                  Click the button below to complete your payment securely:
                </p>
                <a href="{{paymentLink}}" style="display: inline-block; background: ${emailStyles.warningColor}; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin-bottom: 20px;">
                  Pay Now
                </a>
                <p style="color: #9a3412; margin: 0; font-size: 14px;">
                  This payment link will expire on {{expiresAt}}
                </p>
              </div>
            </div>

            <!-- Bank Transfer Option -->
            {{#if bankName}}
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #0369a1; margin: 0 0 20px 0; font-size: 20px;">🏦 Bank Transfer Option</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <p style="color: #0369a1; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7;">
                  You may also pay by bank transfer using the following details:
                </p>
                <ul style="color: #0369a1; margin: 0; padding-left: 20px; line-height: 2;">
                  <li><strong>Bank Name:</strong> {{bankName}}</li>
                  <li><strong>Account Name:</strong> {{accountName}}</li>
                  <li><strong>Account Number:</strong> {{accountNumber}}</li>
                  {{#if iban}}<li><strong>IBAN:</strong> {{iban}}</li>{{/if}}
                  {{#if swiftCode}}<li><strong>SWIFT/BIC:</strong> {{swiftCode}}</li>{{/if}}
                  {{#if routingNumber}}<li><strong>Routing Number:</strong> {{routingNumber}}</li>{{/if}}
                </ul>
                <p style="color: #0369a1; margin: 0; font-size: 15px;">
                  Please include your reservation ID in the transfer reference.
                </p>
              </div>
            </div>
            {{/if}}

            <!-- Security Notice -->
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.infoColor}; margin: 0 0 20px 0; font-size: 20px;">🛡️ Secure Transaction</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <ul style="color: ${emailStyles.infoColor}; margin: 0; padding-left: 20px; line-height: 2;">
                  <li>All payments are processed securely through Stripe</li>
                  <li>Your payment information is encrypted end-to-end</li>
                  <li>We never store your card details</li>
                  <li>Look for the padlock icon in your browser</li>
                </ul>
              </div>
            </div>

            <!-- Need Help -->
            <div style="text-align: center; padding: 32px 24px; background: linear-gradient(135deg, ${emailStyles.backgroundColor} 0%, #f1f5f9 100%); border-radius: 16px; margin-bottom: 24px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 16px 0; font-size: 26px; font-weight: 700;">Need Assistance?</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 24px 0; font-size: 17px; line-height: 1.7;">
                If you have any questions or encounter any issues with the payment process,
                please don't hesitate to contact our support team.
              </p>
              <div style="color: ${emailStyles.infoColor}; font-size: 18px; font-weight: 600;">
                We're here to help! 🤝
              </div>
            </div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        customerName: { type: 'string', description: 'Customer name', example: 'John Doe' },
        paymentLink: { type: 'string', description: 'Payment link URL', example: 'https://example.com/pay' },
        expiresAt: { type: 'string', description: 'Payment link expiry date', example: 'January 1, 2024 6:00 PM' },
        bankName: { type: 'string', description: 'Bank name', example: 'Bank of Italy', optional: true },
        accountName: { type: 'string', description: 'Account holder name', example: 'La Torre Sulla Via Francigena', optional: true },
        accountNumber: { type: 'string', description: 'Bank account number', example: '1234567890', optional: true },
        iban: { type: 'string', description: 'IBAN', example: 'IT60X0542811101000000123456', optional: true },
        swiftCode: { type: 'string', description: 'SWIFT/BIC code', example: 'BNLIITRR', optional: true },
        routingNumber: { type: 'string', description: 'Routing number', example: '026009593', optional: true }
      }
    },
    {
      name: 'Receipt',
      type: 'RECEIPT',
      subject: 'Receipt for Your La Torre Booking (#{{receiptNumber}})',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Receipt - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 800px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo and Header -->
          <div style="text-align: center; padding: 32px; border-bottom: 1px solid ${emailStyles.borderColor};">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
            <h1 style="margin: 0; color: ${emailStyles.primaryColor}; font-size: 28px; font-weight: 700;">Payment Receipt</h1>
            <p style="margin: 8px 0 0 0; color: ${emailStyles.secondaryColor}; font-size: 16px;">Receipt #{{receiptNumber}}</p>
          </div>

          <!-- Main Content -->
          <div style="padding: 32px;">
            <!-- Transaction Overview -->
            <div style="margin-bottom: 40px;">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 24px;">
                <div>
                  <h2 style="margin: 0 0 4px 0; color: ${emailStyles.primaryColor}; font-size: 20px;">Transaction Details</h2>
                  <p style="margin: 0; color: ${emailStyles.secondaryColor}; font-size: 14px;">Transaction ID: {{transactionId}}</p>
                </div>
                <div style="text-align: right;">
                  <div style="color: ${emailStyles.primaryColor}; font-size: 24px; font-weight: 700;">€{{amount}}</div>
                  <div style="color: ${emailStyles.successColor}; font-size: 14px; font-weight: 600;">✓ PAID</div>
                </div>
              </div>

              <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px;">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                  <div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 13px; margin-bottom: 4px;">Payment Date</div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{paidAt}}</div>
                  </div>
                  <div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 13px; margin-bottom: 4px;">Payment Method</div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{cardBrand}} •••• {{cardLast4}}</div>
                  </div>
                  <div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 13px; margin-bottom: 4px;">Status</div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{status}}</div>
                  </div>
                  <div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 13px; margin-bottom: 4px;">Currency</div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{currency}}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Customer Information -->
            <div style="margin-bottom: 40px;">
              <h2 style="margin: 0 0 16px 0; color: ${emailStyles.primaryColor}; font-size: 20px;">Customer Information</h2>
              <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px;">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                  <div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 13px; margin-bottom: 4px;">Name</div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{customerName}}</div>
                  </div>
                  <div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 13px; margin-bottom: 4px;">Email</div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{customerEmail}}</div>
                  </div>
                  <div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 13px; margin-bottom: 4px;">Phone</div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{customerPhone}}</div>
                  </div>
                  <div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 13px; margin-bottom: 4px;">Nationality</div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{customerNationality}}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Booking Summary -->
            <div style="margin-bottom: 40px;">
              <h2 style="margin: 0 0 16px 0; color: ${emailStyles.primaryColor}; font-size: 20px;">Booking Summary</h2>
              <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px;">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 24px;">
                  {{#if showCommonDates}}
                  <div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 13px; margin-bottom: 4px;">Check-in</div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{checkInDate}}</div>
                  </div>
                  <div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 13px; margin-bottom: 4px;">Check-out</div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{checkOutDate}}</div>
                  </div>
                  {{/if}}
                  <div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 13px; margin-bottom: 4px;">Total Rooms</div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{totalRooms}} room(s)</div>
                  </div>
                  <div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 13px; margin-bottom: 4px;">Total Guests</div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{totalGuests}} guest(s)</div>
                  </div>
                </div>

                <!-- Room Details -->
                <div style="border-top: 1px solid ${emailStyles.borderColor}; padding-top: 24px;">
                  <h3 style="margin: 0 0 16px 0; color: ${emailStyles.primaryColor}; font-size: 16px;">Room Details</h3>
                  {{#each bookings}}
                  <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                      <div style="flex: 1;">
                        <h4 style="margin: 0 0 8px 0; color: ${emailStyles.primaryColor}; font-size: 18px;">{{room.name}}</h4>
                        <p style="margin: 0; color: ${emailStyles.secondaryColor}; font-size: 14px;">{{room.description}}</p>
                        <div style="margin-top: 12px; background: #f0f9ff; padding: 12px; border-radius: 8px;">
                          <div style="color: ${emailStyles.infoColor}; font-size: 14px; line-height: 1.6;">
                            <div style="margin-bottom: 4px;"><strong>Booking ID:</strong> #{{id}}</div>
                            <div style="margin-bottom: 4px;"><strong>Stay Period:</strong> {{checkIn}} - {{checkOut}}</div>
                            <div><strong>Details:</strong> {{nights}} night(s) • {{totalGuests}} guest(s)</div>
                          </div>
                        </div>
                      </div>
                      <div style="text-align: right; margin-left: 24px;">
                        <div style="font-weight: 700; font-size: 24px; color: ${emailStyles.primaryColor};">€{{basePrice}}</div>
                        <div style="font-size: 14px; color: ${emailStyles.secondaryColor};">per night</div>
                      </div>
                    </div>

                    <!-- Room Price Breakdown -->
                    <div style="margin-top: 20px; background: #f8fafc; padding: 16px; border-radius: 8px;">
                      <h5 style="color: ${emailStyles.primaryColor}; margin: 0 0 12px 0; font-size: 16px;">Price Breakdown</h5>
                      <div style="display: grid; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="color: ${emailStyles.secondaryColor};">Room Rate</span>
                          <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">€{{basePrice}} × {{nights}} night(s)</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="color: ${emailStyles.secondaryColor};">Room Total</span>
                          <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">€{{roomTotal}}</span>
                        </div>
                        {{#if enhancementsTotal}}
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="color: ${emailStyles.secondaryColor};">Room Enhancements</span>
                          <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">€{{enhancementsTotal}}</span>
                        </div>
                        {{/if}}
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; background: #f0f9ff; border-radius: 6px; margin-top: 8px;">
                          <span style="color: ${emailStyles.infoColor}; font-weight: 600;">Total for This Room</span>
                          <span style="color: ${emailStyles.infoColor}; font-weight: 700;">€{{add roomTotal enhancementsTotal}}</span>
                        </div>
                      </div>
                    </div>

                    {{#if room.amenities}}
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f9ff;">
                      <strong style="color: ${emailStyles.primaryColor}; font-size: 14px; display: block; margin-bottom: 12px;">Room Amenities:</strong>
                      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        {{#each room.amenities}}
                          <span style="background: ${emailStyles.infoColor}; color: white; padding: 6px 12px; border-radius: 16px; font-size: 12px; font-weight: 600;">{{this}}</span>
                        {{/each}}
                      </div>
                    </div>
                    {{/if}}

                    {{#if rateOption}}
                    <div style="margin-top: 16px; padding: 12px; background: #f0f9ff; border-radius: 8px;">
                      <div style="color: ${emailStyles.infoColor}; font-weight: 600; margin-bottom: 4px;">{{rateOption.name}}</div>
                      <div style="color: ${emailStyles.secondaryColor}; font-size: 13px;">{{rateOption.description}}</div>
                    </div>
                    {{/if}}

                    {{#if enhancements.length}}
                    <div style="margin-top: 16px; padding: 16px; background: #f0f9ff; border-radius: 8px;">
                      <strong style="color: ${emailStyles.infoColor}; font-size: 14px; display: block; margin-bottom: 12px;">Room Enhancements:</strong>
                      {{#each enhancements}}
                      <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                          <div>
                            <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{title}}</div>
                            <div style="color: ${emailStyles.secondaryColor}; font-size: 13px;">{{description}}</div>
                            <div style="color: ${emailStyles.secondaryColor}; font-size: 12px; margin-top: 4px;">
                              {{#if (eq pricingDetails.pricingType "PER_GUEST")}}
                              €{{pricingDetails.basePrice}} × {{pricingDetails.guests}} guest(s)
                              {{else if (eq pricingDetails.pricingType "PER_DAY")}}
                              €{{pricingDetails.basePrice}} × {{pricingDetails.nights}} night(s)
                              {{else}}
                              €{{pricingDetails.basePrice}} (per booking)
                              {{/if}}
                            </div>
                          </div>
                          <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">€{{calculatedPrice}}</div>
                        </div>
                      </div>
                      {{/each}}
                    </div>
                    {{/if}}

                    {{#if events.length}}
                    <div style="margin-top: 16px; padding: 16px; background: #f0f4ff; border-radius: 8px;">
                      <strong style="color: ${emailStyles.infoColor}; font-size: 14px; display: block; margin-bottom: 12px;">Events & Activities:</strong>
                      {{#each events}}
                      <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                          <div>
                            <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{name}}</div>
                            <div style="color: ${emailStyles.secondaryColor}; font-size: 13px;">{{description}}</div>
                            <div style="color: ${emailStyles.secondaryColor}; font-size: 12px; margin-top: 4px;">
                              {{#if (eq pricingDetails.pricingType "PER_GUEST")}}
                              €{{pricingDetails.basePrice}} × {{pricingDetails.attendees}} attendee(s)
                              {{else if (eq pricingDetails.pricingType "PER_DAY")}}
                              €{{pricingDetails.basePrice}} × {{pricingDetails.nights}} night(s)
                              {{else}}
                              €{{pricingDetails.basePrice}} (per booking)
                              {{/if}}
                            </div>
                          </div>
                          <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">€{{calculatedPrice}}</div>
                        </div>
                      </div>
                      {{/each}}
                    </div>
                    {{/if}}
                  </div>
                  {{/each}}
                </div>
              </div>
            </div>

            <!-- Payment Summary -->
            <div style="background: #dcfce7; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #166534; margin: 0 0 20px 0; font-size: 20px;">💳 Payment Summary</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Payment Method:</span>
                    <span style="color: #166534; font-weight: 600;">
                      {{#if (eq paymentMethod "STRIPE")}}
                        💳 Credit/Debit Card
                      {{else if (eq paymentMethod "CASH")}}
                        💵 Cash Payment
                      {{else if (eq paymentMethod "BANK_TRANSFER")}}
                        🏦 Bank Transfer
                      {{else}}
                        💳 {{paymentMethod}}
                      {{/if}}
                    </span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Subtotal:</span>
                    <span style="color: #166534; font-weight: 600;">€{{subtotal}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Tax (10%):</span>
                    <span style="color: #166534; font-weight: 600;">€{{taxAmount}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 0; background: #f0fdf4; border-radius: 8px; margin-top: 8px;">
                    <span style="color: #166534; font-weight: 700; font-size: 18px;">Total Amount:</span>
                    <span style="color: #166534; font-weight: 700; font-size: 18px;">€{{amount}}</span>
                  </div>
                </div>
              </div>
            </div>

            {{#if (eq paymentMethod "CASH")}}
            <!-- Cash Payment Notice -->
            <div style="background: #fef3c7; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #92400e; margin: 0 0 20px 0; font-size: 20px;">💵 Cash Payment Notice</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <p style="color: #92400e; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7;">
                  <strong>Payment Method:</strong> Cash payment has been arranged for this booking.
                </p>
                <ul style="color: #92400e; margin: 0; padding-left: 20px; line-height: 2;">
                  <li>Please bring the exact amount in cash upon check-in</li>
                  <li>Payment is due at the time of arrival</li>
                  <li>We accept € currency only</li>
                  <li>Please have your confirmation ID ready</li>
                </ul>
              </div>
            </div>
            {{/if}}

            {{#if (eq paymentMethod "BANK_TRANSFER")}}
            <!-- Bank Transfer Notice -->
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #0369a1; margin: 0 0 20px 0; font-size: 20px;">🏦 Bank Transfer Payment</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <p style="color: #0369a1; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7;">
                  <strong>Payment Method:</strong> Bank transfer payment has been arranged for this booking.
                </p>
                <ul style="color: #0369a1; margin: 0; padding-left: 20px; line-height: 2;">
                  <li>Please complete the bank transfer before your arrival</li>
                  <li>Include your confirmation ID in the transfer reference</li>
                  <li>Payment confirmation will be sent once received</li>
                  <li>Contact us if you need bank account details</li>
                </ul>
              </div>
            </div>
            {{/if}}

            {{#if voucherInfo.products}}
            <!-- Voucher Products -->
            <div style="background: #fef3c7; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #92400e; margin: 0 0 20px 0; font-size: 20px;">🎁 Complimentary Items</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <p style="color: #92400e; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7;">
                  As part of your voucher <strong>{{voucherInfo.code}}</strong>, you'll receive these complimentary items:
                </p>
                <div style="display: grid; gap: 16px;">
                  {{#each voucherInfo.products}}
                  <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: #fef7cd; border-radius: 8px; border: 1px solid #fde68a;">
                    {{#if imageUrl}}
                    <img src="{{imageUrl}}" alt="{{name}}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" />
                    {{/if}}
                    <div style="flex: 1;">
                      <h4 style="color: #92400e; margin: 0 0 4px 0; font-size: 18px; font-weight: 600;">{{name}}</h4>
                      {{#if description}}
                      <p style="color: #a16207; margin: 0; font-size: 14px; line-height: 1.5;">{{description}}</p>
                      {{/if}}
                      <div style="margin-top: 8px;">
                        <span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">FREE</span>
                        {{#if value}}
                        <span style="color: #92400e; font-size: 14px; margin-left: 8px;">Value: {{../currency}} {{value}}</span>
                        {{/if}}
                      </div>
                    </div>
                  </div>
                  {{/each}}
                </div>
              </div>
            </div>
            {{/if}}

            {{#if pdfReceipt}}
            <!-- PDF Receipt Section -->
            <div style="margin-top: -16px; margin-bottom: 32px;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #64748b;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  <a href="{{pdfReceipt.url}}" style="color: #2563eb; text-decoration: none; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                    {{pdfReceipt.text}}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #2563eb;"><path d="M7 17l9.2-9.2M17 17V7H7"></path></svg>
                  </a>
                </div>
              </div>
            </div>
            {{/if}}

            <!-- Important Information -->
            <div style="background: #fef2f2; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #dc2626; margin: 0 0 20px 0; font-size: 20px;">ℹ️ Important Information</h3>
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <ul style="color: #b91c1c; margin: 0; padding-left: 20px; line-height: 2;">
                  <li><strong>Check-in:</strong> 3:00 PM onwards</li>
                  <li><strong>Check-out:</strong> 11:00 AM</li>
                  <li><strong>ID Required:</strong> Please bring valid identification</li>
                  <li><strong>Changes:</strong> Contact us 24 hours in advance for modifications</li>
                  <li><strong>Confirmation:</strong> All {{totalRooms}} rooms are secured under this reservation</li>
                  <li><strong>Parking:</strong> Complimentary parking available on-site</li>
                </ul>
              </div>
            </div>

            <!-- Final Message -->
            <div style="text-align: center; padding: 32px 24px; background: linear-gradient(135deg, ${emailStyles.backgroundColor} 0%, #f1f5f9 100%); border-radius: 16px; margin-bottom: 24px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 16px 0; font-size: 26px; font-weight: 700;">We Can't Wait to Welcome You!</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 24px 0; font-size: 17px; line-height: 1.7;">
                Your journey along the Via Francigena begins with us. If you have any questions or need assistance, 
                please don't hesitate to contact our team.
              </p>
              <div style="color: ${emailStyles.infoColor}; font-size: 18px; font-weight: 600;">
                Safe travels, and see you soon! 🌟
              </div>
            </div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        receiptNumber: { type: 'string', description: 'Receipt number', example: 'RCPT-123' },
        transactionId: { type: 'string', description: 'Transaction ID', example: 'txn_123' },
        created: { type: 'string', description: 'Payment date', example: 'January 1, 2024' },
        paidAt: { type: 'string', description: 'Payment completion date', example: 'January 1, 2024, 3:00 PM' },
        customerName: { type: 'string', description: 'Customer full name', example: 'John Doe' },
        customerEmail: { type: 'string', description: 'Customer email', example: 'john@example.com' },
        customerPhone: { type: 'string', description: 'Customer phone', example: '+1234567890' },
        customerNationality: { type: 'string', description: 'Customer nationality', example: 'Italian' },
        paymentMethod: { type: 'string', description: 'Payment method', example: 'card' },
        cardBrand: { type: 'string', description: 'Card brand', example: 'Visa' },
        cardLast4: { type: 'string', description: 'Last 4 digits of card', example: '4242' },
        amount: { type: 'string', description: 'Total amount', example: '500.00' },
        subtotal: { type: 'string', description: 'Subtotal amount', example: '450.00' },
        taxAmount: { type: 'string', description: 'Tax amount', example: '50.00' },
        currency: { type: 'string', description: 'Currency code', example: 'EUR' },
        status: { type: 'string', description: 'Payment status', example: 'COMPLETED' },
        totalNights: { type: 'number', description: 'Total nights', example: 2 },
        totalRooms: { type: 'number', description: 'Total rooms', example: 1 },
        totalGuests: { type: 'number', description: 'Total guests', example: 2 },
        checkInDate: { type: 'string', description: 'Check-in date', example: 'Monday, January 1, 2024' },
        checkOutDate: { type: 'string', description: 'Check-out date', example: 'Wednesday, January 3, 2024' },
        bookings: {
          type: 'array',
          description: 'Array of booking details',
          example: [{
            roomName: 'Deluxe Room',
            roomDescription: 'Spacious room with a view',
            basePrice: 200,
            totalPrice: 400,
            nights: 2,
            guests: 2,
            amenities: ['WiFi', 'TV', 'Air Conditioning'],
            rateOption: {
              name: 'Flexible Rate',
              description: 'Free cancellation up to 24 hours before check-in'
            }
          }]
        },
        totalEnhancements: { type: 'number', description: 'Total enhancements cost', example: 100 },
        enhancementDetails: {
          type: 'array',
          description: 'Array of enhancement details',
          example: [{
            title: 'Airport Transfer',
            description: 'Round-trip airport transfer',
            price: 100
          }]
        },
        specialRequests: { type: 'string', description: 'Special requests', example: 'Early check-in if possible' },
        voucherInfo: { type: 'object', description: 'Optional voucher details', optional: true, example: {
          code: 'SAVE20',
          name: '20% Off Discount',
          type: 'DISCOUNT',
          discountPercent: 20,
          discountAmount: 100,
          originalAmount: 500,
          finalAmount: 400,
          products: [{
            name: 'Welcome Gift',
            description: 'Complimentary welcome package',
            imageUrl: 'https://example.com/gift.jpg',
            value: 25
          }]
        }},
        voucherDiscount: { type: 'number', description: 'Voucher discount amount', example: 100 },
        originalAmount: { type: 'number', description: 'Original amount before voucher', example: 500 },
        voucherProducts: { 
          type: 'array', 
          description: 'Array of free products from voucher',
          example: [{
            name: 'Welcome Gift',
            description: 'Complimentary welcome package',
            imageUrl: 'https://example.com/gift.jpg',
            value: 25
          }]
        }
      }
    },
    {
      name: 'Group Booking Confirmation',
      type: 'GROUP_CONFIRMATION',
      subject: 'Group Booking Confirmed - Welcome to La Torre! ({{groupName}})',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Group Booking Confirmation - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>
          
          <!-- Group Confirmation Hero -->
          <div style="background: linear-gradient(135deg, ${emailStyles.successColor} 0%, #059669 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">👥</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Group Booking Confirmed!</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">
              {{totalRooms}} {{#if (gt totalRooms 1)}}Rooms{{else}}Room{{/if}} • {{totalGuests}} Guests • Welcome to La Torre
            </p>
            {{#if bookingType}}
            <div style="margin-top: 16px;">
              <span style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                {{bookingType}} Booking
              </span>
            </div>
            {{/if}}
          </div>
          
          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
            <!-- Personal Greeting -->
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{mainGuestName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                Thank you for choosing La Torre sulla via Francigena for your group stay. We're delighted to confirm your group reservation <strong>"{{groupName}}"</strong>!
              </p>
            </div>
            
            <!-- Group Summary -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">📋 Group Summary</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Group Name:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700;">{{groupName}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Check-in:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{checkInDate}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Check-out:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{checkOutDate}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Total Nights:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{totalNights}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Total Rooms:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{totalRooms}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Total Guests:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{totalGuests}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Primary Guest:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{mainGuestName}} 👑</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Payment Intents Summary -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">💳 Bookings in Group</h3>
              {{#each paymentIntents}}
              <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; border-left: 4px solid ${emailStyles.infoColor};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                  <div style="flex: 1;">
                    <h4 style="color: ${emailStyles.primaryColor}; margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">
                      {{customerName}}
                      {{#if isMainGuest}}
                      <span style="background: #fbbf24; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-left: 8px;">PRIMARY GUEST</span>
                      {{/if}}
                    </h4>
                    <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 8px 0; font-size: 14px;">{{customerEmail}}</p>
                    <div style="background: #f0f9ff; padding: 12px; border-radius: 8px;">
                      <div style="color: ${emailStyles.infoColor}; font-size: 14px; line-height: 1.5;">
                        <div><strong>Confirmation ID:</strong> #{{confirmationId}}</div>
                        <div><strong>Rooms:</strong> {{roomCount}} • <strong>Total:</strong> {{../currency}} {{totalAmount}}</div>
                        <div><strong>Status:</strong> 
                          <span style="background: ${emailStyles.successColor}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px;">{{status}}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {{/each}}
            </div>

            <!-- Group Total -->
            <div style="background: #dcfce7; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #166534; margin: 0 0 20px 0; font-size: 20px;">💰 Group Payment Summary</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 2px solid #bbf7d0;">
                  <span style="color: #166534; font-weight: 700; font-size: 18px;">Total Group Amount:</span>
                  <span style="color: #166534; font-weight: 700; font-size: 24px;">{{currency}} {{groupTotalAmount}}</span>
                </div>
                <div style="margin-top: 16px; color: #166534; font-size: 14px; text-align: center;">
                  <p style="margin: 0;">Individual bookings have been processed separately for each guest</p>
                </div>
              </div>
            </div>

            <!-- Important Information -->
            <div style="background: #fef2f2; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #dc2626; margin: 0 0 20px 0; font-size: 20px;">ℹ️ Group Check-in Information</h3>
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <ul style="color: #b91c1c; margin: 0; padding-left: 20px; line-height: 2;">
                  <li><strong>Group Check-in:</strong> 3:00 PM onwards</li>
                  <li><strong>Group Check-out:</strong> 11:00 AM</li>
                  <li><strong>Primary Guest:</strong> {{mainGuestName}} will coordinate check-in</li>
                  <li><strong>ID Required:</strong> Each guest must bring valid identification</li>
                  <li><strong>Group Changes:</strong> Contact us 24 hours in advance for modifications</li>
                  <li><strong>Parking:</strong> Complimentary parking available on-site</li>
                </ul>
              </div>
            </div>

            <!-- Final Message -->
            <div style="text-align: center; padding: 32px 24px; background: linear-gradient(135deg, ${emailStyles.backgroundColor} 0%, #f1f5f9 100%); border-radius: 16px; margin-bottom: 24px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 16px 0; font-size: 26px; font-weight: 700;">We Can't Wait to Welcome Your Group!</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 24px 0; font-size: 17px; line-height: 1.7;">
                Your group's journey along the Via Francigena begins with us. As the group leader, please coordinate with your fellow guests and feel free to contact us with any questions.
              </p>
              <div style="color: ${emailStyles.infoColor}; font-size: 18px; font-weight: 600;">
                Safe travels, and see you soon! 🌟
              </div>
            </div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        groupName: { type: 'string', description: 'Name of the booking group', example: 'Johnson Family Reunion' },
        bookingType: { type: 'string', description: 'Type of booking', example: 'WEDDING', optional: true },
        mainGuestName: { type: 'string', description: 'Main guest (group leader) name', example: 'John Johnson' },
        checkInDate: { type: 'string', description: 'Group check-in date', example: 'Monday, January 1, 2024' },
        checkOutDate: { type: 'string', description: 'Group check-out date', example: 'Wednesday, January 3, 2024' },
        totalNights: { type: 'number', description: 'Total nights for group stay', example: 2 },
        totalRooms: { type: 'number', description: 'Total rooms in group', example: 3 },
        totalGuests: { type: 'number', description: 'Total guests in group', example: 8 },
        currency: { type: 'string', description: 'Currency symbol', example: '€' },
        groupTotalAmount: { type: 'string', description: 'Total amount for entire group', example: '1500.00' },
        paymentIntents: {
          type: 'array',
          description: 'Array of payment intents in the group',
          example: [{
            confirmationId: 'CONF-123',
            customerName: 'John Johnson',
            customerEmail: 'john@example.com',
            roomCount: 2,
            totalAmount: '800.00',
            status: 'CONFIRMED',
            isMainGuest: true
          }, {
            confirmationId: 'CONF-124', 
            customerName: 'Jane Smith',
            customerEmail: 'jane@example.com',
            roomCount: 1,
            totalAmount: '700.00',
            status: 'CONFIRMED',
            isMainGuest: false
          }]
        }
      }
    },
    {
      name: 'Wedding Proposal PDF',
      type: 'WEDDING_PROPOSAL_PDF',
      subject: 'Wedding Proposal - La Torre',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Wedding Proposal - {{name}}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            color: #333;
            line-height: 1.6;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
          }
          .header img {
            width: 120px;
            margin-bottom: 20px;
          }
          .header h1 {
            font-size: 28px;
            color: #1a202c;
            margin-bottom: 5px;
          }
          .header p {
            color: #4a5568;
            font-size: 16px;
            margin: 5px 0;
          }
          .proposal-status {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            text-transform: capitalize;
            margin-top: 10px;
          }
          .proposal-status.draft {
            background-color: #e2e8f0;
            color: #4a5568;
          }
          .proposal-status.sent {
            background-color: #bee3f8;
            color: #2c5282;
          }
          .proposal-status.accepted {
            background-color: #c6f6d5;
            color: #276749;
          }
          .proposal-status.confirmed {
            background-color: #b2f5ea;
            color: #234e52;
          }
          .proposal-status.completed {
            background-color: #e9d8fd;
            color: #553c9a;
          }
          .proposal-status.cancelled {
            background-color: #fed7d7;
            color: #9b2c2c;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 20px;
            color: #2d3748;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
          }
          .customer-info {
            background-color: #f7fafc;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 30px;
          }
          .customer-info p {
            margin: 5px 0;
          }
          .itinerary-day {
            margin-bottom: 25px;
            border: 1px solid #e2e8f0;
            border-radius: 5px;
            overflow: hidden;
          }
          .day-header {
            background-color: #f7fafc;
            padding: 15px;
            font-weight: 600;
            color: #2d3748;
            border-bottom: 1px solid #e2e8f0;
          }
          .day-items {
            padding: 0;
          }
          .item {
            padding: 15px;
            border-bottom: 1px solid #e2e8f0;
          }
          .item:last-child {
            border-bottom: none;
          }
          .item-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          .item-name {
            font-weight: 600;
            color: #2d3748;
          }
          .item-price {
            font-weight: 600;
            color: #2d3748;
          }
          .item-details {
            color: #4a5568;
            font-size: 14px;
          }
          .item-status {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 12px;
            margin-left: 10px;
          }
          .item-status.confirmed {
            background-color: #c6f6d5;
            color: #276749;
          }
          .item-status.optional {
            background-color: #e2e8f0;
            color: #4a5568;
          }
          .summary {
            background-color: #f7fafc;
            padding: 20px;
            border-radius: 5px;
            margin-top: 30px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .summary-row:last-child {
            border-bottom: none;
            font-weight: 700;
            color: #2d3748;
            padding-top: 15px;
          }
          .terms {
            margin-top: 30px;
            padding: 20px;
            background-color: #f7fafc;
            border-radius: 5px;
            font-size: 14px;
            color: #4a5568;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            color: #718096;
            font-size: 14px;
            padding-top: 20px;
            border-top: 1px solid #eee;
          }
          
          /* Payment Plan Styles */
          .payment-plan {
            margin-top: 30px;
            padding: 20px;
            background-color: #f7fafc;
            border-radius: 5px;
          }
          
          .payment-plan h3 {
            margin-top: 0;
            color: #2d3748;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 10px;
          }
          
          .payment-stage {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .payment-stage:last-child {
            border-bottom: none;
          }
          
          .payment-stage-description {
            font-weight: 500;
          }
          
          .payment-stage-amount {
            font-weight: bold;
          }
          
          .payment-stage-date {
            color: #718096;
            font-size: 0.9em;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" />
            <h1>Wedding Proposal</h1>
            <p>{{name}}</p>
            <p>Created: {{createdAt}}</p>
            <div class="proposal-status {{status}}">{{status}}</div>
          </div>
          
          <div class="customer-info">
            <h2 class="section-title">Customer Information</h2>
            <p><strong>Name:</strong> {{customer.guestFirstName}} {{customer.guestLastName}}</p>
            <p><strong>Email:</strong> {{customer.guestEmail}}</p>
            <p><strong>Wedding Date:</strong> {{weddingDate}}</p>
            <p><strong>Main Guest Count:</strong> {{mainGuestCount}}</p>
          </div>
          
          <div class="section">
            <h2 class="section-title">Itinerary</h2>
            
            {{#each itineraryDays}}
            <div class="itinerary-day">
              <div class="day-header">
                Day {{dayNumber}} - {{formatDate date}}
              </div>
              <div class="day-items">
                {{#each items}}
                <div class="item">
                  <div class="item-header">
                    <span class="item-name">{{product.name}} <span class="item-status {{status}}">{{status}}</span></span>
                    <span class="item-price">€{{price}}</span>
                  </div>
                  <div class="item-details">
                    <p>{{product.description}}</p>
                    <p><strong>Guests:</strong> {{guestCount}}</p>
                    {{#if notes}}
                    <p><strong>Notes:</strong> {{notes}}</p>
                    {{/if}}
                  </div>
                </div>
                {{/each}}
              </div>
            </div>
            {{/each}}
          </div>
          
          <div class="summary">
            <h2 class="section-title">Price Summary</h2>
            
            {{#each itineraryDays}}
            <div class="summary-row">
              <span>Day {{dayNumber}}</span>
              <span>€{{calculateDayTotal this}}</span>
            </div>
            {{/each}}
            
            <div class="summary-row">
              <span><strong>Total</strong></span>
              <span><strong>€{{calculateTotalPrice}}</strong></span>
            </div>
          </div>
          
          {{#if paymentPlan}}
          <div class="payment-plan">
            <h3>Payment Schedule</h3>
            <p>The following payment schedule has been arranged for your wedding:</p>
            
            {{#each paymentPlan.stages}}
            <div class="payment-stage">
              <div>
                <div class="payment-stage-description">{{description}}</div>
                <div class="payment-stage-date">Due: {{formatDate dueDate}}</div>
              </div>
              <div class="payment-stage-amount">€{{amount}}</div>
            </div>
            {{/each}}
            
            <div class="payment-stage" style="margin-top: 10px; border-top: 2px solid #e2e8f0; padding-top: 10px;">
              <div class="payment-stage-description">Total</div>
              <div class="payment-stage-amount">€{{paymentPlan.totalAmount}}</div>
            </div>
          </div>
          {{/if}}
          
          {{#if termsAndConditions}}
          <div class="terms">
            <h2 class="section-title">Terms & Conditions</h2>
            <p>{{termsAndConditions}}</p>
          </div>
          {{/if}}
          
          <div class="footer">
            <p>La Torre sulla via Francigena</p>
            <p>Contact: info@latorresullaviafrancigena.com | +39 123 456 7890</p>
            <p>&copy; {{currentYear}} La Torre. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        id: { type: 'string', description: 'Proposal ID', example: '123e4567-e89b-12d3-a456-426614174000' },
        name: { type: 'string', description: 'Proposal name', example: 'Smith & Jones Wedding' },
        status: { type: 'string', description: 'Proposal status', example: 'DRAFT' },
        weddingDate: { type: 'string', description: 'Wedding date', example: 'June 15, 2024' },
        mainGuestCount: { type: 'number', description: 'Main guest count', example: 80 },
        createdAt: { type: 'string', description: 'Creation date', example: 'January 1, 2024' },
        customer: { type: 'object', description: 'Customer information', example: '{ "guestFirstName": "John", "guestLastName": "Doe", "guestEmail": "john@example.com" }' },
        itineraryDays: { type: 'array', description: 'Itinerary days', example: '[{ "dayNumber": 1, "date": "2024-06-15", "items": [...] }]' },
        termsAndConditions: { type: 'string', description: 'Terms and conditions', example: 'Standard terms and conditions apply...' },
        paymentPlan: { type: 'object', description: 'Payment plan information', example: '{ "totalAmount": 5000, "stages": [{ "description": "Deposit", "amount": 1000, "dueDate": "2023-12-15" }] }' },
        calculateTotalPrice: { type: 'function', description: 'Function to calculate total price', example: '5000.00' }
      }
    },
    {
      name: 'Wedding Final Guest Count',
      type: 'WEDDING_FINAL_GUEST_COUNT',
      subject: 'Final Guest Count Confirmation Required for Your Wedding',
      variables: {
        customerName: { type: 'string', required: true, description: 'Name of the customer' },
        weddingName: { type: 'string', required: true, description: 'Name of the wedding' },
        weddingDate: { type: 'string', required: true, description: 'Date of the wedding' },
        currentMaxGuests: { type: 'number', required: true, description: 'Current maximum guest count' },
        updateLink: { type: 'string', required: true, description: 'Link to update guest count' },
        daysRemaining: { type: 'number', required: true, description: 'Days remaining until wedding' },
        isUrgent: { type: 'boolean', required: true, description: 'Whether the request is urgent' },
        currentYear: { type: 'number', required: true, description: 'Current year for copyright' }
      },
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Final Guest Count Confirmation</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>

              <!-- Hero Section -->
              <div style="background: linear-gradient(135deg, ${emailStyles.infoColor} 0%, #3b82f6 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
                  <div style="font-size: 44px; margin-bottom: 16px;">🗓️</div>
                  <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">
                      Final Guest Count Confirmation
                  </h2>
                  <p style="margin: 0; font-size: 18px; opacity: 0.95;">
                      Please confirm your final guest count for {{weddingName}}
                  </p>
          </div>

          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
                  <div style="margin-bottom: 32px;">
                      <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{customerName}},</h3>
                      <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                          Your wedding is approaching in {{daysRemaining}} days, and we need to finalize the guest count for your event.
                          Currently, we have {{currentMaxGuests}} guests registered for your wedding on {{weddingDate}}.
                      </p>
                      <p style="color: ${emailStyles.secondaryColor}; margin-top: 16px; font-size: 16px; line-height: 1.7;">
                          Please confirm if this is your final guest count or update it if needed. This information is crucial for our planning and preparation.
                      </p>
            </div>

                  <!-- CTA -->
            <div style="text-align: center; margin: 32px 0;">
                      <a href="{{updateLink}}" style="display: inline-block; background-color: ${emailStyles.accentColor}; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">
                          Update Guest Count
              </a>
            </div>

                  <!-- Outro -->
                  <p style="color: ${emailStyles.secondaryColor}; font-size: 16px; line-height: 1.7;">
                      If you have any questions or need assistance, please don't hesitate to contact us.
                  </p>
                  <p style="color: ${emailStyles.secondaryColor}; font-size: 16px; line-height: 1.7; margin-top: 24px;">
                      Best regards,<br>The Wedding Team
                  </p>
            </div>

          ${generateEmailFooter()}
                    </div>
      </body>
      </html>`,
      isActive: true
    },
    {
      name: 'Wedding Final Guest Count Follow-up',
      type: 'WEDDING_FINAL_GUEST_COUNT_FOLLOWUP',
      subject: 'Urgent: Final Guest Count Confirmation Still Required for Your Wedding',
      variables: {
        customerName: { type: 'string', required: true, description: 'Name of the customer' },
        isUrgent: { type: 'boolean', required: true, description: 'Whether the follow-up is urgent (less than 2 weeks before wedding)' },
        portalLink: { type: 'string', required: true, description: 'Link to the wedding portal' },
        currentYear: { type: 'number', required: true, description: 'Current year for copyright' }
      },
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Final Guest Count Follow-up - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
                  </div>

          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
            <h1 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin-bottom: 24px;">Final Guest Count Follow-up</h1>
            
            <p style="color: ${emailStyles.secondaryColor}; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              Dear {{customerName}},
            </p>
            
            <p style="color: ${emailStyles.secondaryColor}; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              <span style="color: #ef4444; font-weight: 600;">{{#if isUrgent}}URGENT: {{/if}}</span>
              We are following up on our previous email regarding the final guest count confirmation for your wedding.
            </p>

            <!-- Call to Action -->
            <div style="text-align: center; margin: 32px 0;">
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 20px 0; font-size: 16px;">
                Please log in to your wedding portal and confirm your final guest count as soon as possible:
              </p>
              <a href="{{portalLink}}" 
                 style="display: inline-block; background: ${emailStyles.accentColor}; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">
                Access Wedding Portal
              </a>
            </div>

            <p style="color: ${emailStyles.secondaryColor}; font-size: 16px; line-height: 1.6;">
              If you have any questions or need assistance, please don't hesitate to contact us.
            </p>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      
    },
    {
      name: 'New Service Request',
      type: 'NEW_SERVICE_REQUEST',
      subject: 'New Custom Service Request Received',
      html: `
        <h2>New Custom Service Request</h2>
        <p>Hello {{adminName}},</p>
        <p>A new custom service request has been submitted by {{customerName}}.</p>
        <p><strong>Title:</strong> {{requestTitle}}</p>
        <p><strong>Description:</strong> {{requestDescription}}</p>
        <p>Please review this request and provide a quote at your earliest convenience.</p>
        <p><a href="{{adminDashboardUrl}}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">View Request</a></p>
        ${generateEmailFooter()}
      `,
      isActive: true,
      version: 1,
      variables: {
        adminName: { type: 'string', required: true, description: 'Admin name' },
        customerName: { type: 'string', required: true, description: 'Customer name' },
        requestTitle: { type: 'string', required: true, description: 'Service request title' },
        requestDescription: { type: 'string', required: true, description: 'Service request description' },
        adminDashboardUrl: { type: 'string', required: true, description: 'URL to admin dashboard' }
      }
    },
    {
      name: 'New Service Request Message',
      type: 'NEW_SERVICE_REQUEST_MESSAGE',
      subject: 'New Message on Custom Service Request',
      html: `
        <h2>New Message from Customer</h2>
        <p>Hello {{adminName}},</p>
        <p>{{customerName}} has sent a new message regarding their custom service request: <strong>{{requestTitle}}</strong></p>
        <p><strong>Message:</strong> "{{messageText}}"</p>
        <p>Please review and respond at your earliest convenience.</p>
        <p><a href="{{adminDashboardUrl}}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">View Conversation</a></p>
        ${generateEmailFooter()}
      `,
      isActive: true,
      version: 1,
      variables: {
        adminName: { type: 'string', required: true, description: 'Admin name' },
        customerName: { type: 'string', required: true, description: 'Customer name' },
        requestTitle: { type: 'string', required: true, description: 'Service request title' },
        messageText: { type: 'string', required: true, description: 'Message text' },
        adminDashboardUrl: { type: 'string', required: true, description: 'URL to admin dashboard' }
      }
    },
    {
      name: 'Service Request Admin Reply',
      type: 'SERVICE_REQUEST_ADMIN_REPLY',
      subject: 'New Response to Your Service Request',
      html: `
        <h2>New Message from Wedding Coordinator</h2>
        <p>Hello {{customerName}},</p>
        <p>You have received a new message regarding your custom service request: <strong>{{requestTitle}}</strong></p>
        <p><strong>Message:</strong> "{{messageText}}"</p>
        <p>Please log in to your wedding portal to view the full conversation and respond.</p>
        <p><a href="{{portalUrl}}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">View in Wedding Portal</a></p>
        ${generateEmailFooter()}
      `,
      isActive: true,
      version: 1,
      variables: {
        customerName: { type: 'string', required: true, description: 'Customer name' },
        requestTitle: { type: 'string', required: true, description: 'Service request title' },
        messageText: { type: 'string', required: true, description: 'Message text' },
        portalUrl: { type: 'string', required: true, description: 'URL to wedding portal' }
      }
    },
    {
      name: 'Service Request Quote',
      type: 'SERVICE_REQUEST_QUOTE',
      subject: 'Quote Available for Your Service Request',
      html: `
        <h2>Quote for Your Custom Service</h2>
        <p>Hello {{customerName}},</p>
        <p>We're pleased to inform you that a quote is now available for your custom service request: <strong>{{requestTitle}}</strong></p>
        <p><strong>Price:</strong> €{{price}}</p>
        <p>Please log in to your wedding portal to review the details, accept or reject the quote, or ask any questions you may have.</p>
        <p><a href="{{portalUrl}}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">Review Quote</a></p>
        ${generateEmailFooter()}
      `,
      isActive: true,
      version: 1,
      variables: {
        customerName: { type: 'string', required: true, description: 'Customer name' },
        requestTitle: { type: 'string', required: true, description: 'Service request title' },
        price: { type: 'string', required: true, description: 'Quote price' },
        portalUrl: { type: 'string', required: true, description: 'URL to wedding portal' }
      }
    },
    {
      name: 'Service Request Accepted',
      type: 'SERVICE_REQUEST_ACCEPTED',
      subject: 'Custom Service Request Accepted',
      html: `
        <h2>Quote Accepted</h2>
        <p>Hello {{adminName}},</p>
        <p>The customer has accepted your quote for the custom service request: <strong>{{requestTitle}}</strong></p>
        <p><strong>Accepted Price:</strong> €{{price}}</p>
        <p>The service has been automatically added to their itinerary and payment plan.</p>
        <p><a href="{{adminDashboardUrl}}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">View Details</a></p>
        ${generateEmailFooter()}
      `,
      isActive: true,
      version: 1,
      variables: {
        adminName: { type: 'string', required: true, description: 'Admin name' },
        requestTitle: { type: 'string', required: true, description: 'Service request title' },
        price: { type: 'string', required: true, description: 'Accepted price' },
        adminDashboardUrl: { type: 'string', required: true, description: 'URL to admin dashboard' }
      }
    },
    {
      name: 'Service Request Rejected',
      type: 'SERVICE_REQUEST_REJECTED',
      subject: 'Custom Service Request Rejected',
      html: `
        <h2>Quote Rejected</h2>
        <p>Hello {{adminName}},</p>
        <p>The customer has rejected your quote for the custom service request: <strong>{{requestTitle}}</strong></p>
        <p>You may want to follow up with them to discuss alternatives or provide a revised quote.</p>
        <p><a href="{{adminDashboardUrl}}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">View Details</a></p>
        ${generateEmailFooter()}
      `,
      isActive: true,
      version: 1,
      variables: {
        adminName: { type: 'string', required: true, description: 'Admin name' },
        requestTitle: { type: 'string', required: true, description: 'Service request title' },
        adminDashboardUrl: { type: 'string', required: true, description: 'URL to admin dashboard' }
      }
    },
    {
      name: 'Itinerary Change Notification',
      type: 'ITINERARY_CHANGE_NOTIFICATION',
      subject: 'Updates to your Wedding Itinerary for {{weddingName}}',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Itinerary Change Notification</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>

          <!-- Hero Section -->
          <div style="background: linear-gradient(135deg, ${emailStyles.infoColor} 0%, #3b82f6 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">🔄</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Itinerary Updated</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">
              Changes have been made to your wedding plan for {{weddingName}}.
            </p>
          </div>

          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{customerName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                This email is to confirm that an update has been made to your wedding itinerary by {{changedBy}} for your wedding on {{weddingDate}}.
              </p>
            </div>

            <!-- Changes Summary -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">📋 Summary of Changes</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                {{#if itemChanges.length}}
                <h4 style="color: ${emailStyles.primaryColor}; margin-top: 0; margin-bottom: 10px;">Item Changes:</h4>
                <ul style="margin: 0; padding-left: 20px; color: ${emailStyles.secondaryColor};">
                  {{#each itemChanges}}
                  <li style="margin-bottom: 8px;">{{this}}</li>
                  {{/each}}
              </ul>
                {{/if}}

                {{#if dayChanges.length}}
                <h4 style="color: ${emailStyles.primaryColor}; margin-top: 20px; margin-bottom: 10px;">Day Changes:</h4>
                <ul style="margin: 0; padding-left: 20px; color: ${emailStyles.secondaryColor};">
                  {{#each dayChanges}}
                  <li style="margin-bottom: 8px;">{{this}}</li>
                  {{/each}}
              </ul>
                {{/if}}
                
                {{#unless itemChanges.length}}
                  {{#unless dayChanges.length}}
                    <p style="color: ${emailStyles.secondaryColor}; margin: 0;">No specific changes were detailed, but the itinerary has been updated.</p>
                  {{/unless}}
                {{/unless}}
              </div>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin: 32px 0;">
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 20px 0; font-size: 16px;">
                Please review your updated itinerary in the wedding portal:
              </p>
              <a href="{{portalLink}}" 
                 style="display: inline-block; background: ${emailStyles.accentColor}; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">
                View Updated Itinerary
              </a>
            </div>

            <p style="color: ${emailStyles.secondaryColor}; font-size: 16px; line-height: 1.6;">
              If you have any questions or did not expect this change, please contact us immediately.
            </p>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        customerName: { type: 'string', description: 'Customer name' },
        weddingName: { type: 'string', description: 'Name of the wedding proposal' },
        weddingDate: { type: 'string', description: 'Date of the wedding' },
        changedBy: { type: 'string', description: 'Who made the change (e.g., "you" or "our staff")' },
        itemChanges: { type: 'array', description: 'List of changes to itinerary items' },
        dayChanges: { type: 'array', description: 'List of changes to itinerary days' },
        portalLink: { type: 'string', description: 'Link to the customer wedding portal' },
        currentYear: { type: 'number', description: 'Current year for the footer' }
      }
    },
    {
      name: 'Wedding Proposal',
      type: 'WEDDING_PROPOSAL',
      subject: 'Your Wedding Proposal for {{name}} is {{status}}',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Wedding Proposal Details</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>

          <!-- Hero Section -->
          <div style="background: linear-gradient(135deg, ${emailStyles.infoColor} 0%, #3b82f6 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">💍</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Wedding Proposal</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">
              Your proposal status is now {{status}}
            </p>
          </div>

          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{customer.guestFirstName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                We are excited to share the details of your wedding proposal for {{name}} on {{weddingDate}}.
              </p>
            </div>

            <!-- Proposal Details -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">📋 Proposal Overview</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <p><strong>Wedding Date:</strong> {{weddingDate}}</p>
                <p><strong>Guest Count:</strong> {{mainGuestCount}}</p>
                
                {{#if paymentPlan}}
                <h4 style="color: ${emailStyles.primaryColor}; margin-top: 20px; margin-bottom: 10px;">Payment Plan</h4>
                <p><strong>Total Amount:</strong> {{paymentPlan.totalAmount}} {{paymentPlan.currency}}</p>
                <ul style="margin: 0; padding-left: 20px; color: ${emailStyles.secondaryColor};">
                  {{#each paymentPlan.stages}}
                  <li style="margin-bottom: 8px;">
                    {{description}}: {{amount}} (Due: {{dueDate}}, Status: {{status}})
                </li>
                  {{/each}}
                </ul>
                {{/if}}
              </div>
            </div>

            <!-- Itinerary Summary -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">🗓️ Itinerary Summary</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                {{#each itineraryDays}}
                <div style="margin-bottom: 15px;">
                  <h4 style="color: ${emailStyles.primaryColor}; margin: 0 0 10px 0;">Day {{dayNumber}} - {{date}}</h4>
                  <ul style="margin: 0; padding-left: 20px; color: ${emailStyles.secondaryColor};">
                    {{#each items}}
                    <li style="margin-bottom: 8px;">
                      {{product.name}} ({{status}}) - {{price}} ({{guestCount}} guests)
                      {{#if customMenu}}
                      <br><small>Custom Menu: {{customMenu}}</small>
                      {{/if}}
                </li>
                    {{/each}}
              </ul>
                </div>
                {{/each}}
              </div>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin: 32px 0;">
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 20px 0; font-size: 16px;">
                Review and manage your wedding details in the customer portal:
              </p>
              <a href="{{customerPortalUrl}}" 
                 style="display: inline-block; background: ${emailStyles.accentColor}; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">
                Access Customer Portal
              </a>
            </div>

            <p style="color: ${emailStyles.secondaryColor}; font-size: 16px; line-height: 1.6;">
              If you have any questions or need further assistance, please don't hesitate to contact us.
            </p>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        id: { type: 'string', description: 'Proposal ID' },
        name: { type: 'string', description: 'Proposal name' },
        status: { type: 'string', description: 'Proposal status' },
        weddingDate: { type: 'string', description: 'Date of the wedding' },
        mainGuestCount: { type: 'number', description: 'Number of main guests' },
        customer: { type: 'object', description: 'Customer details' },
        itineraryDays: { type: 'array', description: 'List of itinerary days' },
        paymentPlan: { type: 'object', description: 'Payment plan details' },
        termsAndConditions: { type: 'string', description: 'Terms and conditions' },
        calculateTotalPrice: { type: 'string', description: 'Total price of the proposal' },
        currentYear: { type: 'number', description: 'Current year for the footer' },
        customerPortalUrl: { type: 'string', description: 'URL to customer portal' }
      }
    },
    {
      name: 'Upcoming Payment Reminder',
      type: 'PAYMENT_REMINDER_UPCOMING',
      subject: 'Upcoming Payment for {{proposalName}}',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Upcoming Payment Reminder</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>

          <!-- Hero Section -->
          <div style="background: linear-gradient(135deg, ${emailStyles.infoColor} 0%, #3b82f6 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">💸</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Payment Reminder</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">
              A payment is due soon for your wedding proposal
            </p>
          </div>

          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{customerName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                This is a friendly reminder about an upcoming payment for your wedding proposal: {{proposalName}}.
              </p>
            </div>

            <!-- Payment Details -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">💳 Payment Information</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <p><strong>Description:</strong> {{paymentDescription}}</p>
                <p><strong>Amount:</strong> {{amount}}</p>
                <p><strong>Due Date:</strong> {{dueDate}}</p>
              </div>
                </div>
                
            <!-- Call to Action -->
            <div style="text-align: center; margin: 32px 0;">
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 20px 0; font-size: 16px;">
                Please proceed with your payment:
              </p>
              <a href="{{paymentLink}}" 
                 style="display: inline-block; background: ${emailStyles.accentColor}; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">
                Make Payment
              </a>
            </div>

            <p style="color: ${emailStyles.secondaryColor}; font-size: 16px; line-height: 1.6;">
              If you have any questions or need assistance, please contact our support team.
            </p>
                </div>
                
          ${generateEmailFooter()}
            </div>
      </body>
      </html>`,
        isActive: true,
        version: 1,
        variables: {
        customerName: { type: 'string', description: 'Customer name' },
        proposalName: { type: 'string', description: 'Name of the wedding proposal' },
        paymentDescription: { type: 'string', description: 'Description of the payment stage' },
        amount: { type: 'string', description: 'Payment amount' },
        dueDate: { type: 'string', description: 'Due date of the payment' },
        paymentLink: { type: 'string', description: 'Link to make the payment' }
      }
    },
    {
      name: 'Overdue Payment Reminder',
      type: 'PAYMENT_REMINDER_OVERDUE',
      subject: 'Overdue Payment for {{proposalName}}',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Overdue Payment Reminder</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>

          <!-- Hero Section -->
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ff4757 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">⚠️</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Overdue Payment</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">
              Your payment is past due
            </p>
          </div>

          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{customerName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                This is an important reminder that your payment for the wedding proposal: {{proposalName}} is overdue.
              </p>
            </div>

            <!-- Payment Details -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">💳 Overdue Payment Information</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <p><strong>Description:</strong> {{paymentDescription}}</p>
                <p><strong>Amount:</strong> {{amount}}</p>
                <p><strong>Original Due Date:</strong> {{dueDate}}</p>
                <p><strong>Days Overdue:</strong> {{daysOverdue}}</p>
              </div>
                </div>
                
            <!-- Call to Action -->
            <div style="text-align: center; margin: 32px 0;">
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 20px 0; font-size: 16px;">
                Please settle your overdue payment as soon as possible:
              </p>
              <a href="{{paymentLink}}" 
                 style="display: inline-block; background: #ff4757; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">
                Pay Overdue Amount
                    </a>
                </div>
                
            <p style="color: ${emailStyles.secondaryColor}; font-size: 16px; line-height: 1.6;">
              Failure to make payment may result in additional fees or impact your wedding proposal status. Contact our support team if you need assistance.
            </p>
          </div>

          ${generateEmailFooter()}
            </div>
      </body>
      </html>`,
        isActive: true,
        version: 1,
        variables: {
        customerName: { type: 'string', description: 'Customer name' },
        proposalName: { type: 'string', description: 'Name of the wedding proposal' },
        paymentDescription: { type: 'string', description: 'Description of the payment stage' },
        amount: { type: 'string', description: 'Payment amount' },
        dueDate: { type: 'string', description: 'Original due date of the payment' },
        daysOverdue: { type: 'number', description: 'Number of days the payment is overdue' },
        paymentLink: { type: 'string', description: 'Link to make the payment' }
      }
    },
    {
      name: 'Bank Transfer Instructions',
      type: 'BANK_TRANSFER_INSTRUCTIONS',
      subject: 'Complete Your Hotel Booking Payment - La Torre sulla via Francigena',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Complete Your Hotel Booking - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>

          <!-- Hero Section -->
          <div style="background: linear-gradient(135deg, ${emailStyles.accentColor} 0%, #059669 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">🏨</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Complete Your Hotel Booking</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">
              Secure your stay with bank transfer payment
            </p>
          </div>

          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
            <!-- Personal Greeting -->
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{customerName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                Thank you for choosing La Torre sulla via Francigena for your upcoming stay. To confirm your reservation, please complete your payment using the bank transfer details below.
              </p>
            </div>

            <!-- Booking Summary -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">📋 Your Reservation Summary</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Total Amount:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-size: 18px;">€{{totalAmount}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Payment Due:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{expiresAt}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Reservation ID:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-family: monospace; background: ${emailStyles.backgroundColor}; padding: 6px 12px; border-radius: 6px;">{{paymentIntentId}}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bank Details -->
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.infoColor}; margin: 0 0 20px 0; font-size: 20px;">🏦 Payment Instructions</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Bank Name:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{bankName}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Account Name:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{accountName}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Account Number:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-family: monospace; background: ${emailStyles.backgroundColor}; padding: 6px 12px; border-radius: 6px;">{{accountNumber}}</span>
                  </div>
                  {{#if iban}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">IBAN:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-family: monospace; background: ${emailStyles.backgroundColor}; padding: 6px 12px; border-radius: 6px;">{{iban}}</span>
                  </div>
                  {{/if}}
                  {{#if swiftCode}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">SWIFT/BIC:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-family: monospace; background: ${emailStyles.backgroundColor}; padding: 6px 12px; border-radius: 6px;">{{swiftCode}}</span>
                  </div>
                  {{/if}}
                  {{#if routingNumber}}
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Routing Number:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-family: monospace; background: ${emailStyles.backgroundColor}; padding: 6px 12px; border-radius: 6px;">{{routingNumber}}</span>
                  </div>
                  {{/if}}
                </div>
              </div>
            </div>

            <!-- Important Instructions -->
            <div style="background: #fef3c7; border-radius: 12px; padding: 24px; margin-bottom: 32px; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin: 0 0 16px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #f59e0b;"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>
                Important Payment Details
              </h3>
              <div style="background: white; padding: 16px; border-radius: 8px;">
                <ul style="color: #a16207; margin: 0; padding-left: 20px; line-height: 1.8; font-size: 15px;">
                  <li>Include your <strong>reservation ID ({{paymentIntentId}})</strong> in the transfer description</li>
                  <li>Transfer the exact amount of <strong>€{{totalAmount}}</strong></li>
                  <li>Complete payment within <strong>72 hours</strong> to secure your room</li>
                  <li>Save your transfer receipt for confirmation</li>
                </ul>
              </div>
            </div>

            <!-- Booking Details -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">🏨 Your Room Details</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                {{#each bookingDetails}}
                <div style="border-bottom: 1px solid ${emailStyles.borderColor}; padding-bottom: 16px; margin-bottom: 16px;">
                  <h4 style="color: ${emailStyles.primaryColor}; margin: 0 0 12px 0; font-size: 18px;">{{roomDetails.name}}</h4>
                  <div style="display: grid; gap: 8px; color: ${emailStyles.secondaryColor}; font-size: 15px;">
                    <div><strong>Check-in:</strong> {{checkIn}}</div>
                    <div><strong>Check-out:</strong> {{checkOut}}</div>
                    <div><strong>Guests:</strong> {{adults}} adults</div>
                    <div><strong>Room Rate:</strong> €{{totalPrice}}</div>
                  </div>
                </div>
                {{/each}}
              </div>
            </div>

            <!-- Contact Information -->
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.infoColor}; margin: 0 0 20px 0; font-size: 20px;">📞 Hotel Contact Information</h3>
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7;">
                  Our hotel team is here to assist you with any questions about your booking or payment:
                </p>
                <ul style="color: ${emailStyles.infoColor}; margin: 0; padding-left: 20px; line-height: 2;">
                  <li><strong>Email:</strong> info@latorresullaviafrancigena.com</li>
                  <li><strong>Phone:</strong> +39 0577 123456</li>
                  <li><strong>Reception Hours:</strong> 9:00 AM - 6:00 PM (CET)</li>
                </ul>
              </div>
            </div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        customerName: { type: 'string', description: 'Customer name' },
        totalAmount: { type: 'string', description: 'Total booking amount' },
        expiresAt: { type: 'string', description: 'Payment expiry date' },
        paymentIntentId: { type: 'string', description: 'Payment intent ID for reference' },
        bankName: { type: 'string', description: 'Name of the bank' },
        accountName: { type: 'string', description: 'Account holder name' },
        accountNumber: { type: 'string', description: 'Bank account number' },
        iban: { type: 'string', description: 'IBAN (International Bank Account Number)' },
        swiftCode: { type: 'string', description: 'SWIFT/BIC code' },
        routingNumber: { type: 'string', description: 'Routing number (for US banks)' },
        bookingDetails: { type: 'array', description: 'Array of booking details' }
      }
    },
    {
      name: 'Booking Payment Reminder',
      type: 'BOOKING_PAYMENT_REMINDER',
      subject: 'Payment Reminder: Complete Your Booking (#{{confirmationId}})',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Reminder - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>

          <div style="background: linear-gradient(135deg, ${emailStyles.warningColor} 0%, #f59e0b 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">⏰</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Payment Reminder</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">Complete your booking payment • Due {{dueDate}}</p>
          </div>

          <div style="padding: 0 32px 32px;">
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{customerName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                This is a friendly reminder about your remaining payment for your upcoming stay at La Torre sulla via Francigena.
              </p>
            </div>

            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">💳 Payment Details</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Booking ID:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-family: monospace; background: ${emailStyles.backgroundColor}; padding: 6px 12px; border-radius: 6px;">#{{confirmationId}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Amount Due:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-size: 20px;">€{{remainingAmount}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Due Date:</span>
                    <span style="color: ${emailStyles.warningColor}; font-weight: 600;">{{dueDate}}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style="text-align: center; margin-bottom: 32px;">
              <a href="{{paymentUrl}}" style="display: inline-block; background: ${emailStyles.accentColor}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">
                Complete Payment Now
              </a>
              <p style="margin: 16px 0 0 0; font-size: 14px; color: ${emailStyles.secondaryColor};">Secure payment powered by Stripe</p>
            </div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        customerName: { type: 'string', description: 'Customer name' },
        confirmationId: { type: 'string', description: 'Booking confirmation ID' },
        remainingAmount: { type: 'number', description: 'Amount due' },
        dueDate: { type: 'string', description: 'Payment due date' },
        paymentUrl: { type: 'string', description: 'Payment URL' }
      }
    },
    {
      name: 'Booking Payment Overdue',
      type: 'BOOKING_PAYMENT_OVERDUE', 
      subject: 'URGENT: Overdue Payment for Your Booking (#{{confirmationId}})',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Overdue Payment - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>

          <div style="background: linear-gradient(135deg, ${emailStyles.errorColor} 0%, #dc2626 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">🚨</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Payment Overdue</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">Immediate action required • Booking at risk</p>
          </div>

          <div style="padding: 0 32px 32px;">
            <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 24px; margin-right: 12px;">⚠️</span>
                <h3 style="margin: 0; color: #dc2626; font-size: 18px;">URGENT: Payment Required</h3>
              </div>
              <p style="margin: 0; color: #dc2626; font-size: 16px; line-height: 1.6;">
                Dear {{customerName}}, your payment for booking #{{confirmationId}} is now overdue. 
                Please complete your payment immediately to avoid cancellation.
              </p>
            </div>

            <div style="text-align: center; margin-bottom: 32px;">
              <a href="{{paymentUrl}}" style="display: inline-block; background: ${emailStyles.errorColor}; color: white; padding: 20px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 20px; box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);">
                PAY NOW TO SAVE BOOKING
              </a>
              <p style="margin: 16px 0 0 0; font-size: 14px; color: ${emailStyles.errorColor}; font-weight: 600;">⚡ Secure payment • Immediate confirmation</p>
            </div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        customerName: { type: 'string', description: 'Customer name' },
        confirmationId: { type: 'string', description: 'Booking confirmation ID' },
        remainingAmount: { type: 'number', description: 'Overdue amount' },
        daysOverdue: { type: 'number', description: 'Days overdue' },
        paymentUrl: { type: 'string', description: 'Payment URL' }
      }
    },
    {
      name: 'Second Payment Created',
      type: 'SECOND_PAYMENT_CREATED',
      subject: 'Final Payment Ready: Complete Your Booking (#{{confirmationId}})',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Final Payment - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>

          <div style="background: linear-gradient(135deg, ${emailStyles.infoColor} 0%, #2563eb 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">💳</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Final Payment Ready</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">Complete your booking • Almost there!</p>
          </div>

          <div style="padding: 0 32px 32px;">
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{customerName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                Your final payment is now ready! Complete this payment to fully secure your reservation at La Torre sulla via Francigena.
              </p>
            </div>

            <div style="text-align: center; margin-bottom: 32px;">
              <a href="{{paymentUrl}}" style="display: inline-block; background: ${emailStyles.infoColor}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                Complete Final Payment
              </a>
              <p style="margin: 16px 0 0 0; font-size: 14px; color: ${emailStyles.secondaryColor};">🔒 Secure payment powered by Stripe</p>
            </div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        customerName: { type: 'string', description: 'Customer name' },
        confirmationId: { type: 'string', description: 'Booking confirmation ID' },
        paidAmount: { type: 'number', description: 'Amount already paid' },
        remainingAmount: { type: 'number', description: 'Final payment amount' },
        totalAmount: { type: 'number', description: 'Total booking amount' },
        paymentUrl: { type: 'string', description: 'Payment URL' }
      }
    },
    {
      name: 'Custom Partial Refund Confirmation',
      type: 'CUSTOM_PARTIAL_REFUND_CONFIRMATION',
      subject: 'Partial Refund Processed - La Torre (€{{refundAmount}})',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Partial Refund Confirmation - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>
    
          <!-- Partial Refund Hero -->
          <div style="background: linear-gradient(135deg, ${emailStyles.successColor} 0%, #10b981 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">💰</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Partial Refund Processed</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">
              A partial refund has been successfully processed for your booking.
            </p>
          </div>
    
          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
            <!-- Personal Greeting -->
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{customerName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                We have processed a partial refund for your booking at La Torre sulla via Francigena. Please review the details below.
              </p>
            </div>
    
            <!-- Refund Summary -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">📋 Refund Details</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Booking ID:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-family: monospace; background: ${emailStyles.backgroundColor}; padding: 6px 12px; border-radius: 6px;">{{bookingId}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Room:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{roomName}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Refund Amount:</span>
                    <span style="color: ${emailStyles.successColor}; font-weight: 700; font-size: 18px;">{{refundCurrency}} {{refundAmount}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Refund Date:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{refundDate}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Reason:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{refundReason}}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Booking Amount Breakdown -->
            <div style="background: #f0fdf4; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.successColor}; margin: 0 0 20px 0; font-size: 20px;">💳 Amount Breakdown</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Original Amount:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{refundCurrency}} {{originalAmount}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Refunded Amount:</span>
                    <span style="color: ${emailStyles.successColor}; font-weight: 700;">{{refundCurrency}} {{refundAmount}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; background: ${emailStyles.backgroundColor}; padding: 12px; border-radius: 8px;">
                    <span style="font-weight: 700; color: ${emailStyles.primaryColor};">Remaining Amount:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-size: 18px;">{{refundCurrency}} {{remainingAmount}}</span>
                  </div>
                </div>
              </div>
            </div>
    
            <!-- Refund Processing Note -->
            {{#if (or (eq paymentMethod "STRIPE") (eq paymentMethod "BANK_TRANSFER"))}}
            <div style="background: #fef3c7; border-radius: 12px; padding: 24px; margin-bottom: 32px; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin: 0 0 16px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #f59e0b;"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>
                Refund Processing Information
              </h3>
              <div style="background: white; padding: 16px; border-radius: 8px;">
                <p style="color: #a16207; margin: 0; font-size: 15px; line-height: 1.7;">
                  {{#if (eq paymentMethod "STRIPE")}}
                    This partial refund has been processed through your original payment method. 
                    It may take <strong>5-10 business days</strong> to appear on your statement, depending on your bank.
                  {{else}}
                    This partial refund will be processed manually for your bank transfer payment. 
                    Our team will contact you within <strong>1-2 business days</strong> to arrange the refund transfer.
                  {{/if}}
                </p>
              </div>
            </div>
            {{else}}
            <div style="background: #e0f2fe; border-radius: 12px; padding: 24px; margin-bottom: 32px; border-left: 4px solid ${emailStyles.infoColor};">
              <h3 style="color: #0277bd; margin: 0 0 16px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: ${emailStyles.infoColor};"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>
                Cash Refund Processed
              </h3>
              <div style="background: white; padding: 16px; border-radius: 8px;">
                <p style="color: #0277bd; margin: 0; font-size: 15px; line-height: 1.7;">
                  Your cash refund of <strong>{{refundCurrency}} {{refundAmount}}</strong> has been processed. 
                  Please collect your refund from our front desk during your next visit or contact us to arrange pickup.
                </p>
              </div>
            </div>
            {{/if}}
    
            <!-- Contact Information -->
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.infoColor}; margin: 0 0 20px 0; font-size: 20px;">📞 Need Assistance?</h3>
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7;">
                  If you have any questions about this partial refund or need further assistance, our team is here to help:
                </p>
                <ul style="color: ${emailStyles.infoColor}; margin: 0; padding-left: 20px; line-height: 2;">
                  <li><strong>Email:</strong> info@latorresullaviafrancigena.com</li>
                  <li><strong>Phone:</strong> +39 0577 123456</li>
                  <li><strong>Hours:</strong> 9:00 AM - 6:00 PM (CET)</li>
                </ul>
              </div>
            </div>
          </div>
    
          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        customerName: { type: 'string', description: 'Customer full name', example: 'John Doe' },
        refundAmount: { type: 'number', description: 'The partial amount refunded', example: 150.00 },
        refundCurrency: { type: 'string', description: 'The currency of the refund', example: 'EUR' },
        bookingId: { type: 'string', description: 'The booking ID', example: 'BOOK123' },
        roomName: { type: 'string', description: 'Name of the room', example: 'Deluxe Room' },
        refundReason: { type: 'string', description: 'The reason for the partial refund', example: 'Early checkout' },
        refundDate: { type: 'string', description: 'Date when refund was processed', example: 'January 15, 2024' },
        remainingAmount: { type: 'number', description: 'Amount remaining after refund', example: 350.00 },
        originalAmount: { type: 'number', description: 'Original booking amount', example: 500.00 },
        paymentMethod: { type: 'string', description: 'Original payment method', example: 'STRIPE' }
      }
    },
    {
      id: 'CASH_REMINDER',
      name: 'Cash Collection Reminder',
      type: 'CASH_REMINDER',
      subject: 'Cash Collection Reminder - {{date}}',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cash Collection Reminder</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${emailStyles.backgroundColor}; font-family: ${emailStyles.fontFamily};">
        <div style="max-width: 600px; margin: 0 auto; background-color: white;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, ${emailStyles.accentColor} 0%, #047857 100%); padding: 40px 24px; text-align: center;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 60px; margin-bottom: 20px;" />
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Cash Collection Reminder</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 16px;">{{date}}</p>
          </div>

          <div style="padding: 40px 24px;">
            <!-- Greeting -->
            <div style="margin-bottom: 32px;">
              <h2 style="color: ${emailStyles.primaryColor}; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Hello {{managerName}},</h2>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.6;">
                This is a reminder that the following waiters have pending cash summaries that require collection and verification.
              </p>
            </div>

            <!-- Pending Cash List -->
            <div style="background: #fef3c7; border-radius: 12px; padding: 24px; margin-bottom: 32px; border-left: 4px solid ${emailStyles.warningColor};">
              <h3 style="color: #92400e; margin: 0 0 20px 0; font-size: 20px; display: flex; align-items: center; gap: 8px;">
                💰 Pending Cash Collections
              </h3>
              <div style="background: white; padding: 20px; border-radius: 8px;">
                {{#each waiters}}
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                  <div>
                    <strong style="color: ${emailStyles.primaryColor};">{{name}}</strong>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 14px;">Outstanding Balance</div>
                  </div>
                  <div style="text-align: right;">
                    <span style="color: ${emailStyles.warningColor}; font-weight: 600; font-size: 18px;">€{{amount}}</span>
                  </div>
                </div>
                {{/each}}
              </div>
            </div>

            <!-- Action Required -->
            <div style="background: #e0f2fe; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.infoColor}; margin: 0 0 16px 0; font-size: 18px;">📋 Action Required</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 15px; line-height: 1.7;">
                Please follow up with these waiters to collect their cash deposits and verify the amounts in the Revenue Management system.
              </p>
            </div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        managerName: { type: 'string', description: 'Manager name', example: 'John Manager' },
        date: { type: 'string', description: 'Current date', example: 'January 15, 2024' },
        waiters: { type: 'array', description: 'Array of waiters with pending cash', example: [{ name: 'John Waiter', amount: '45.50' }] }
      }
    },
    {
      id: 'CASH_DISCREPANCY_ALERT',
      name: 'Cash Discrepancy Alert',
      type: 'CASH_DISCREPANCY_ALERT',
      subject: 'Cash Discrepancy Alert - {{date}}',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cash Discrepancy Alert</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${emailStyles.backgroundColor}; font-family: ${emailStyles.fontFamily};">
        <div style="max-width: 600px; margin: 0 auto; background-color: white;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, ${emailStyles.errorColor} 0%, #dc2626 100%); padding: 40px 24px; text-align: center;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 60px; margin-bottom: 20px;" />
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Cash Discrepancy Alert</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 16px;">{{date}}</p>
          </div>

          <div style="padding: 40px 24px;">
            <!-- Alert Message -->
            <div style="background: #fef2f2; border-radius: 12px; padding: 24px; margin-bottom: 32px; border-left: 4px solid ${emailStyles.errorColor};">
              <h3 style="color: #dc2626; margin: 0 0 16px 0; font-size: 20px; display: flex; align-items: center; gap: 8px;">
                ⚠️ Urgent: Cash Discrepancies Detected
              </h3>
              <p style="color: #b91c1c; margin: 0; font-size: 16px; line-height: 1.6;">
                Significant discrepancies have been found in today's cash deposits. Immediate attention required.
              </p>
            </div>

            <!-- Discrepancy List -->
            <div style="background: white; border: 2px solid #fecaca; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 18px;">Discrepancies Found:</h3>
              {{#each discrepancies}}
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; margin-bottom: 12px; background: #fef2f2; border-radius: 8px;">
                <div>
                  <strong style="color: ${emailStyles.primaryColor};">{{waiterName}}</strong>
                  <div style="color: ${emailStyles.secondaryColor}; font-size: 14px;">Cash Deposit Discrepancy</div>
                </div>
                <div style="text-align: right;">
                  <span style="color: ${emailStyles.errorColor}; font-weight: 600; font-size: 18px;">€{{amount}}</span>
                  <div style="color: ${emailStyles.secondaryColor}; font-size: 12px;">difference</div>
                </div>
              </div>
              {{/each}}
            </div>

            <!-- Next Steps -->
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.infoColor}; margin: 0 0 16px 0; font-size: 18px;">📋 Next Steps</h3>
              <ul style="color: ${emailStyles.secondaryColor}; margin: 0; padding-left: 20px; line-height: 2;">
                <li>Review each discrepancy in the Revenue Management system</li>
                <li>Investigate with the respective waiters</li>
                <li>Document findings and take appropriate action</li>
                <li>Update the cash deposit status once resolved</li>
              </ul>
            </div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        managerName: { type: 'string', description: 'Manager name', example: 'John Manager' },
        date: { type: 'string', description: 'Current date', example: 'January 15, 2024' },
        discrepancies: { type: 'array', description: 'Array of discrepancies', example: [{ waiterName: 'John Waiter', amount: '25.50' }] }
      }
    },
    {
      id: 'DAILY_CASH_SUMMARY',
      name: 'Daily Cash Summary Report',
      type: 'DAILY_CASH_SUMMARY',
      subject: 'Daily Cash Summary - {{date}}',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Daily Cash Summary</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${emailStyles.backgroundColor}; font-family: ${emailStyles.fontFamily};">
        <div style="max-width: 600px; margin: 0 auto; background-color: white;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, ${emailStyles.accentColor} 0%, #047857 100%); padding: 40px 24px; text-align: center;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 60px; margin-bottom: 20px;" />
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Daily Cash Summary</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 16px;">{{date}}</p>
          </div>

          <div style="padding: 40px 24px;">
            <!-- Summary Stats -->
            <div style="margin-bottom: 32px;">
              <h2 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 22px;">Hello {{managerName}},</h2>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                Here's your daily cash summary for {{date}}:
              </p>
            </div>

            <!-- Cash Summary Cards -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px;">
              <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; text-align: center;">
                <h4 style="color: ${emailStyles.successColor}; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Total Deposited</h4>
                <p style="color: ${emailStyles.primaryColor}; margin: 0; font-size: 24px; font-weight: 700;">€{{totalDeposited}}</p>
              </div>
              <div style="background: #eff6ff; padding: 20px; border-radius: 12px; text-align: center;">
                <h4 style="color: ${emailStyles.infoColor}; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Total Received</h4>
                <p style="color: ${emailStyles.primaryColor}; margin: 0; font-size: 24px; font-weight: 700;">€{{totalReceived}}</p>
              </div>
            </div>

            <!-- Discrepancy Info -->
            {{#if hasDiscrepancy}}
            <div style="background: #fef3c7; border-radius: 12px; padding: 24px; margin-bottom: 32px; border-left: 4px solid ${emailStyles.warningColor};">
              <h3 style="color: #92400e; margin: 0 0 16px 0; font-size: 18px;">⚠️ Discrepancy: €{{discrepancy}}</h3>
              <p style="color: #78350f; margin: 0; font-size: 15px; line-height: 1.6;">
                There is a discrepancy of €{{discrepancy}} between deposited and received amounts. Please review and investigate.
              </p>
            </div>
            {{else}}
            <div style="background: #f0fdf4; border-radius: 12px; padding: 24px; margin-bottom: 32px; border-left: 4px solid ${emailStyles.successColor};">
              <h3 style="color: #15803d; margin: 0 0 16px 0; font-size: 18px;">✅ Perfect Match</h3>
              <p style="color: #166534; margin: 0; font-size: 15px; line-height: 1.6;">
                All cash deposits match received amounts. No discrepancies found.
              </p>
            </div>
            {{/if}}

            <!-- Waiter Summary -->
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 18px;">Waiter Summary ({{waiterCount}} waiters)</h3>
              <div style="max-height: 200px; overflow-y: auto;">
                {{#each waiters}}
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                  <strong style="color: ${emailStyles.primaryColor};">{{name}}</strong>
                  <span style="color: ${emailStyles.secondaryColor};">€{{amount}}</span>
                </div>
                {{/each}}
              </div>
            </div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        managerName: { type: 'string', description: 'Manager name', example: 'John Manager' },
        date: { type: 'string', description: 'Summary date', example: 'January 15, 2024' },
        totalDeposited: { type: 'number', description: 'Total cash deposited', example: 245.50 },
        totalReceived: { type: 'number', description: 'Total cash received', example: 245.50 },
        discrepancy: { type: 'number', description: 'Discrepancy amount', example: 0 },
        hasDiscrepancy: { type: 'boolean', description: 'Whether there is a discrepancy', example: false },
        waiterCount: { type: 'number', description: 'Number of waiters', example: 3 },
        waiters: { type: 'array', description: 'Array of waiters and amounts', example: [{ name: 'John Waiter', amount: '45.50' }] }
      }
    },
    {
      name: 'License Plate Daily Export',
      type: 'LICENSE_PLATE_EXPORT',
      subject: 'Daily License Plate Export - {{date}}',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>License Plate Export - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>
    
          <!-- Header -->
          <div style="background: linear-gradient(135deg, ${emailStyles.infoColor} 0%, #3b82f6 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">🚗</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Daily License Plate Export</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">
              {{date}}
            </p>
          </div>
    
          <!-- Main Content -->
          <div style="padding: 32px;">
            <div style="background: ${emailStyles.backgroundColor}; padding: 32px; border-radius: 12px; border: 1px solid ${emailStyles.borderColor}; margin-bottom: 32px;">
              <h3 style="margin: 0 0 24px 0; color: ${emailStyles.primaryColor}; font-size: 24px; font-weight: 600;">Export Summary</h3>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px;">
                <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid ${emailStyles.borderColor};">
                  <div style="color: ${emailStyles.secondaryColor}; font-size: 14px; font-weight: 500; margin-bottom: 8px;">TOTAL ENTRIES</div>
                  <div style="color:${emailStyles.primaryColor}; font-size: 32px; font-weight: 700;">{{totalEntries}}</div>
                </div>
                <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid ${emailStyles.borderColor};">
                  <div style="color: ${emailStyles.secondaryColor}; font-size: 14px; font-weight: 500; margin-bottom: 8px;">ACTIVE PLATES</div>
                  <div style="color: ${emailStyles.successColor}; font-size: 32px; font-weight: 700;">{{activeEntries}}</div>
                </div>
              </div>

              <p style="margin: 0; color: ${emailStyles.secondaryColor}; font-size: 16px; line-height: 1.6;">
                Please find the complete license plate export attached to this email as a CSV file. 
                This export includes all active license plate entries from the ANPR system.
              </p>
            </div>

            <div style="background: #fef3cd; padding: 24px; border-radius: 8px; border: 1px solid #fde047; margin-bottom: 32px;">
              <div style="display: flex; align-items: center; margin-bottom: 16px;">
                <span style="font-size: 24px; margin-right: 12px;">⚠️</span>
                <h4 style="margin: 0; color: #92400e; font-size: 18px; font-weight: 600;">Important Notes</h4>
              </div>
              <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 15px; line-height: 1.6;">
                <li>This export is generated automatically at the configured time</li>
                <li>The CSV file contains all currently active license plate entries</li>
                <li>Expired plates are automatically removed from the system</li>
                <li>Please review the export for any necessary updates</li>
              </ul>
            </div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        date: { type: 'string', description: 'Export date', example: 'January 15, 2024' },
        totalEntries: { type: 'number', description: 'Total number of entries', example: 45 },
        activeEntries: { type: 'number', description: 'Number of active entries', example: 42 }
      }
    },
    {
      name: 'Payment Intent Invoice',
      type: 'PAYMENT_INTENT_INVOICE',
      subject: 'Invoice #{{invoiceNumber}} - La Torre sulla via Francigena',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: white;">
        <div style="max-width: 800px; margin: 0 auto; background: white; padding: 40px;">
          <!-- Header Section -->
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; border-bottom: 2px solid ${emailStyles.borderColor}; padding-bottom: 20px;">
            <div>
              <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 80px; margin-bottom: 16px;" />
              <h1 style="margin: 0; color: ${emailStyles.primaryColor}; font-size: 32px; font-weight: 700;">INVOICE</h1>
            </div>
            <div style="text-align: right;">
              <div style="margin-bottom: 8px;">
                <span style="color: ${emailStyles.secondaryColor}; font-weight: 600;">Invoice Number:</span>
                <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-size: 18px;">#{{invoiceNumber}}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <span style="color: ${emailStyles.secondaryColor}; font-weight: 600;">Date:</span>
                <span style="color: ${emailStyles.primaryColor};">{{invoiceDate}}</span>
              </div>
              <div>
                <span style="color: ${emailStyles.secondaryColor}; font-weight: 600;">Payment Status:</span>
                <span style="background: ${emailStyles.successColor}; color: white; padding: 4px 12px; border-radius: 16px; font-size: 14px; font-weight: 600;">{{paymentStatus}}</span>
              </div>
            </div>
          </div>

          <!-- Company and Customer Info -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
            <!-- From Section -->
            <div>
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 16px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase;">From:</h3>
              <div style="background: ${emailStyles.backgroundColor}; padding: 20px; border-radius: 8px;">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: ${emailStyles.primaryColor};">La Torre sulla via Francigena</p>
                <p style="margin: 0 0 4px 0; color: ${emailStyles.secondaryColor};">Via Francigena, Historic Center</p>
                <p style="margin: 0 0 4px 0; color: ${emailStyles.secondaryColor};">53037 San Gimignano SI, Italy</p>
                <p style="margin: 0 0 4px 0; color: ${emailStyles.secondaryColor};">VAT: IT12345678901</p>
                <p style="margin: 0 0 4px 0; color: ${emailStyles.secondaryColor};">Email: info@latorresullaviafrancigena.com</p>
                <p style="margin: 0; color: ${emailStyles.secondaryColor};">Phone: +39 0577 123456</p>
              </div>
            </div>
            
            <!-- To Section -->
            <div>
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 16px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase;">Bill To:</h3>
              <div style="background: ${emailStyles.backgroundColor}; padding: 20px; border-radius: 8px;">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: ${emailStyles.primaryColor};">{{customerName}}</p>
                <p style="margin: 0 0 4px 0; color: ${emailStyles.secondaryColor};">{{customerEmail}}</p>
                {{#if customerPhone}}
                <p style="margin: 0 0 4px 0; color: ${emailStyles.secondaryColor};">{{customerPhone}}</p>
                {{/if}}
                {{#if customerAddress}}
                <p style="margin: 0 0 4px 0; color: ${emailStyles.secondaryColor};">{{customerAddress}}</p>
                {{/if}}
                {{#if customerVat}}
                <p style="margin: 0; color: ${emailStyles.secondaryColor};">VAT: {{customerVat}}</p>
                {{/if}}
              </div>
            </div>
          </div>


          <!-- Items Table -->
          <div style="margin-bottom: 40px;">
            <h3 style="color: ${emailStyles.primaryColor}; font-size: 16px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase;">Items:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: ${emailStyles.backgroundColor};">
                  <th style="text-align: left; padding: 12px; color: ${emailStyles.primaryColor}; font-weight: 600; border-bottom: 2px solid ${emailStyles.borderColor};">Description</th>
                  <th style="text-align: center; padding: 12px; color: ${emailStyles.primaryColor}; font-weight: 600; border-bottom: 2px solid ${emailStyles.borderColor};">Qty</th>
                  <th style="text-align: right; padding: 12px; color: ${emailStyles.primaryColor}; font-weight: 600; border-bottom: 2px solid ${emailStyles.borderColor};">Unit Price</th>
                  <th style="text-align: right; padding: 12px; color: ${emailStyles.primaryColor}; font-weight: 600; border-bottom: 2px solid ${emailStyles.borderColor};">Tax</th>
                  <th style="text-align: right; padding: 12px; color: ${emailStyles.primaryColor}; font-weight: 600; border-bottom: 2px solid ${emailStyles.borderColor};">Total</th>
                </tr>
              </thead>
              <tbody>
                {{#each items}}
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid ${emailStyles.borderColor}; color: ${emailStyles.primaryColor};">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      {{#if this.imageUrl}}
                      <img src="{{this.imageUrl}}" alt="{{this.description}}" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;" />
                      {{/if}}
                      <span>{{this.description}}</span>
                    </div>
                  </td>
                  <td style="padding: 12px; border-bottom: 1px solid ${emailStyles.borderColor}; text-align: center; color: ${emailStyles.primaryColor};">{{this.quantity}}</td>
                  <td style="padding: 12px; border-bottom: 1px solid ${emailStyles.borderColor}; text-align: right; color: ${emailStyles.primaryColor};">€{{this.unitPrice}}</td>
                  <td style="padding: 12px; border-bottom: 1px solid ${emailStyles.borderColor}; text-align: right; color: ${emailStyles.primaryColor};">€{{this.taxAmount}}</td>
                  <td style="padding: 12px; border-bottom: 1px solid ${emailStyles.borderColor}; text-align: right; font-weight: 600; color: ${emailStyles.primaryColor};">€{{this.total}}</td>
                </tr>
                {{/each}}
              </tbody>
            </table>
          </div>

          <!-- Totals Section -->
          <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
            <div style="width: 350px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span style="color: ${emailStyles.secondaryColor};">Subtotal</span>
                <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">€{{subtotal}}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span style="color: ${emailStyles.secondaryColor};">IVA</span>
                <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">€{{taxAmount}}</span>
              </div>
              <div style="color: ${emailStyles.secondaryColor}; font-size: 13px; font-style: italic; padding: 4px 0; text-align: right;">
                Taxes included in price
              </div>
              <div style="display: flex; justify-content: space-between; padding: 12px 16px; background: ${emailStyles.backgroundColor}; border-radius: 8px; margin-top: 8px; border: 2px solid ${emailStyles.primaryColor};">
                <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-size: 18px;">Total</span>
                <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-size: 18px;">€{{totalAmount}}</span>
              </div>
            </div>
          </div>

          <!-- Payment Information -->
          {{#if paymentMethod}}
          <div style="margin-bottom: 40px;">
            <h3 style="color: ${emailStyles.primaryColor}; font-size: 16px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase;">Payment Information:</h3>
            <div style="background: ${emailStyles.backgroundColor}; padding: 20px; border-radius: 8px;">
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                <div>
                  <span style="color: ${emailStyles.secondaryColor}; font-size: 14px;">Payment Method:</span>
                  <p style="margin: 4px 0 0 0; color: ${emailStyles.primaryColor}; font-weight: 600;">{{paymentMethod}}</p>
                </div>
                <div>
                  <span style="color: ${emailStyles.secondaryColor}; font-size: 14px;">Transaction ID:</span>
                  <p style="margin: 4px 0 0 0; color: ${emailStyles.primaryColor}; font-weight: 600;">{{transactionId}}</p>
                </div>
              </div>
            </div>
          </div>
          {{/if}}

          <!-- Notes Section -->
          {{#if notes}}
          <div style="margin-bottom: 40px;">
            <h3 style="color: ${emailStyles.primaryColor}; font-size: 16px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase;">Notes:</h3>
            <div style="background: ${emailStyles.backgroundColor}; padding: 20px; border-radius: 8px;">
              <p style="margin: 0; color: ${emailStyles.secondaryColor}; line-height: 1.6;">{{notes}}</p>
            </div>
          </div>
          {{/if}}

          <!-- Footer -->
          <div style="margin-top: 60px; padding-top: 20px; border-top: 2px solid ${emailStyles.borderColor}; text-align: center;">
            <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 8px 0; font-size: 14px;">Thank you for your business!</p>
            <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 12px;">
              La Torre sulla via Francigena | Via Francigena, Historic Center | 53037 San Gimignano SI, Italy<br>
              VAT: IT12345678901 | Email: info@latorresullaviafrancigena.com | Phone: +39 0577 123456
            </p>
          </div>
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        invoiceNumber: { type: 'string', description: 'Invoice number', example: 'INV-2024-001' },
        invoiceDate: { type: 'string', description: 'Invoice date', example: 'January 15, 2024' },
        paymentStatus: { type: 'string', description: 'Payment status', example: 'PAID' },
        customerName: { type: 'string', description: 'Customer full name', example: 'John Doe' },
        customerEmail: { type: 'string', description: 'Customer email', example: 'john@example.com' },
        customerPhone: { type: 'string', description: 'Customer phone number', example: '+1234567890', optional: true },
        customerAddress: { type: 'string', description: 'Customer address', example: '123 Main St, City', optional: true },
        customerVat: { type: 'string', description: 'Customer VAT number', example: 'IT12345678901', optional: true },
        checkInDate: { type: 'string', description: 'Check-in date', example: 'January 15, 2024', optional: true },
        checkOutDate: { type: 'string', description: 'Check-out date', example: 'January 18, 2024', optional: true },
        totalNights: { type: 'number', description: 'Total nights', example: 3, optional: true },
        items: { type: 'array', description: 'Invoice line items', example: [{ description: 'Room - Deluxe Suite', quantity: 1, unitPrice: 150, tax: 10, total: 165 }] },
        subtotal: { type: 'number', description: 'Subtotal amount', example: 450.00 },
        taxPercentage: { type: 'number', description: 'Tax percentage', example: 10 },
        taxAmount: { type: 'number', description: 'Tax amount', example: 45.00 },
        totalAmount: { type: 'number', description: 'Total amount', example: 495.00 },
        paymentMethod: { type: 'string', description: 'Payment method', example: 'Credit Card', optional: true },
        transactionId: { type: 'string', description: 'Transaction ID', example: 'pi_1234567890', optional: true },
        notes: { type: 'string', description: 'Additional notes', example: 'Thank you for choosing La Torre', optional: true },
        bookingDetails: { type: 'boolean', description: 'Whether to show booking details section', example: true, optional: true }
      }
    },
    {
      name: 'Booking Invoice',
      type: 'BOOKING_INVOICE',
      subject: 'Your Invoice for Booking at La Torre (#{{invoiceNumber}})',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Invoice - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, ${emailStyles.primaryColor} 0%, #059669 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">🧾</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Your Booking Invoice</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">Complete invoice attached as PDF</p>
          </div>

          <div style="padding: 0 32px 32px;">
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{customerName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7;">
                Thank you for your stay with us at La Torre sulla via Francigena. Please find your complete booking invoice attached to this email as a PDF document.
              </p>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                This invoice contains all the details of your booking charges and payment information.
              </p>
            </div>

            <!-- Invoice Summary -->
            <div style="background: ${emailStyles.backgroundColor}; padding: 24px; border-radius: 12px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 20px; margin: 0 0 16px 0;">Invoice Summary</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: ${emailStyles.secondaryColor};">Invoice Number:</span>
                <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{invoiceNumber}}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: ${emailStyles.secondaryColor};">Date:</span>
                <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{invoiceDate}}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                <span style="color: ${emailStyles.secondaryColor};">Status:</span>
                <span style="background: ${emailStyles.successColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">{{paymentStatus}}</span>
              </div>
              <hr style="border: none; border-top: 1px solid ${emailStyles.borderColor}; margin: 16px 0;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${emailStyles.primaryColor}; font-size: 18px; font-weight: 700;">Total Amount:</span>
                <span style="color: ${emailStyles.primaryColor}; font-size: 24px; font-weight: 700;">{{currency}}{{totalAmount}}</span>
              </div>
            </div>

            <!-- Booking Details -->
            {{#if bookings}}
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 20px; margin: 0 0 20px 0;">Booking Summary</h3>
              {{#each bookings}}
              <div style="background: white; border: 1px solid ${emailStyles.borderColor}; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                  <div>
                    <h4 style="color: ${emailStyles.primaryColor}; font-size: 18px; margin: 0 0 4px 0;">{{room.name}}</h4>
                    <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 14px;">{{room.description}}</p>
                  </div>
                  <div style="text-align: right;">
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 700; font-size: 18px;">{{currency}}{{total}}</div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 12px;">{{nights}} nights</div>
                  </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px;">
                  <div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 12px; margin-bottom: 4px;">Check-in</div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{formattedCheckIn}}</div>
                  </div>
                  <div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 12px; margin-bottom: 4px;">Check-out</div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{formattedCheckOut}}</div>
                  </div>
                </div>
                
                <div>
                  <div style="color: ${emailStyles.secondaryColor}; font-size: 12px; margin-bottom: 4px;">Guests</div>
                  <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{totalGuests}} guests</div>
                </div>
              </div>
              {{/each}}
            </div>
            {{/if}}

            <!-- Attachment Notice -->
            <div style="background: ${emailStyles.infoColor}; background-opacity: 0.1; border-left: 4px solid ${emailStyles.infoColor}; padding: 20px; margin-bottom: 32px;">
              <h4 style="color: ${emailStyles.infoColor}; font-size: 16px; margin: 0 0 8px 0; display: flex; align-items: center;">
                📎 Invoice Attachment
              </h4>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 14px; line-height: 1.6;">
                Your detailed invoice ({{invoiceNumber}}.pdf) is attached to this email. Please save it for your records.
              </p>
            </div>

            <!-- Contact Information -->
            <div style="background: ${emailStyles.backgroundColor}; padding: 24px; border-radius: 12px; text-align: center;">
              <h4 style="color: ${emailStyles.primaryColor}; font-size: 16px; margin: 0 0 12px 0;">Need Help?</h4>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 16px 0; font-size: 14px; line-height: 1.6;">
                If you have any questions about your booking or need assistance, we're here to help.
              </p>
              <div style="margin-bottom: 8px;">
                <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">Email:</span>
                <span style="color: ${emailStyles.secondaryColor};"> info@latorresullaviafrancigena.com</span>
              </div>
              <div>
                <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">Phone:</span>
                <span style="color: ${emailStyles.secondaryColor};"> +39 0577 123456</span>
              </div>
            </div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        invoiceNumber: { type: 'string', description: 'Invoice number', example: 'INV-2024-001' },
        customerName: { type: 'string', description: 'Customer full name', example: 'John Doe' },
        invoiceDate: { type: 'string', description: 'Invoice date', example: 'January 15, 2024' },
        totalAmount: { type: 'string', description: 'Total amount', example: '495.00' },
        currency: { type: 'string', description: 'Currency symbol', example: '€' },
        paymentStatus: { type: 'string', description: 'Payment status', example: 'SUCCEEDED' },
        bookings: { 
          type: 'array', 
          description: 'Array of booking details for invoice', 
          example: [{ 
            room: { name: 'Deluxe Suite', description: 'Luxury room with garden view' }, 
            formattedCheckIn: 'Saturday, January 15, 2024',
            formattedCheckOut: 'Tuesday, January 18, 2024',
            nights: 3,
            totalGuests: 2,
            total: 165.00
          }] 
        }
      }
    },
    {
      name: 'Online Check-In Invitation',
      type: 'ONLINE_CHECKIN_INVITATION',
      subject: 'Complete Your Online Check-In - {{roomName}}',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Online Check-In Invitation - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>

          <!-- Online Check-In Hero -->
          <div style="background: linear-gradient(135deg, ${emailStyles.infoColor} 0%, #2563eb 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">📱</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Complete Your Online Check-In</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.9; font-weight: 500;">Save time at arrival - check in now!</p>
          </div>

          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
            <!-- Personal Greeting -->
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{customerName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                Your check-in date at La Torre sulla via Francigena is approaching! To make your arrival smooth and hassle-free, we invite you to complete your online check-in process.
              </p>
            </div>

            <!-- Check-In Details -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">🏨 Your Stay Details</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Room:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700;">{{roomName}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Check-in Date:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{checkInDate}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Days Until Arrival:</span>
                    <span style="background: ${emailStyles.infoColor}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">{{daysUntilCheckin}} days</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="{{checkinUrl}}" style="display: inline-block; background: ${emailStyles.infoColor}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3); transition: all 0.3s ease;">
                🚀 Start Online Check-In
              </a>
            </div>

            <!-- Benefits Section -->
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.infoColor}; margin: 0 0 20px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 24px;">⚡</span> Benefits of Online Check-In
              </h3>
              <div style="display: grid; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="background: ${emailStyles.infoColor}; color: white; border-radius: 50%; padding: 6px; font-size: 12px; font-weight: bold; min-width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">✓</span>
                  <span style="color: ${emailStyles.primaryColor}; font-weight: 500;">Skip reception desk queues</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="background: ${emailStyles.infoColor}; color: white; border-radius: 50%; padding: 6px; font-size: 12px; font-weight: bold; min-width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">✓</span>
                  <span style="color: ${emailStyles.primaryColor}; font-weight: 500;">Secure digital process</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="background: ${emailStyles.infoColor}; color: white; border-radius: 50%; padding: 6px; font-size: 12px; font-weight: bold; min-width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">✓</span>
                  <span style="color: ${emailStyles.primaryColor}; font-weight: 500;">Update your information in advance</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="background: ${emailStyles.infoColor}; color: white; border-radius: 50%; padding: 6px; font-size: 12px; font-weight: bold; min-width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">✓</span>
                  <span style="color: ${emailStyles.primaryColor}; font-weight: 500;">Contactless and convenient</span>
                </div>
              </div>
            </div>

            <!-- Process Steps -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 18px;">📋 What to Expect</h3>
              <div style="display: grid; gap: 16px;">
                <div style="display: flex; align-items: start; gap: 12px;">
                  <span style="background: ${emailStyles.infoColor}; color: white; border-radius: 50%; padding: 8px; font-size: 12px; font-weight: bold; min-width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">1</span>
                  <div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600; margin-bottom: 4px;">Personal Information</div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 14px;">Confirm and update your personal details</div>
                  </div>
                </div>
                <div style="display: flex; align-items: start; gap: 12px;">
                  <span style="background: ${emailStyles.infoColor}; color: white; border-radius: 50%; padding: 8px; font-size: 12px; font-weight: bold; min-width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">2</span>
                  <div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600; margin-bottom: 4px;">Document Verification</div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 14px;">Upload passport/ID and license plate information</div>
                  </div>
                </div>
                <div style="display: flex; align-items: start; gap: 12px;">
                  <span style="background: ${emailStyles.infoColor}; color: white; border-radius: 50%; padding: 8px; font-size: 12px; font-weight: bold; min-width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">3</span>
                  <div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600; margin-bottom: 4px;">Terms & Signature</div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 14px;">Review terms and provide digital signature</div>
                  </div>
                </div>
                <div style="display: flex; align-items: start; gap: 12px;">
                  <span style="background: ${emailStyles.successColor}; color: white; border-radius: 50%; padding: 8px; font-size: 12px; font-weight: bold; min-width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">✓</span>
                  <div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600; margin-bottom: 4px;">Ready to Go!</div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 14px;">Arrive and enjoy your stay without delays</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Security Notice -->
            <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 32px; border-left: 4px solid #f59e0b;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <span style="font-size: 24px;">🔒</span>
                <h3 style="color: #92400e; margin: 0; font-size: 16px; font-weight: 600;">Secure Access</h3>
              </div>
              <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
                This link is unique and secure for your booking only. Please do not share this link with others. 
                It will expire after your check-in date for your security.
              </p>
            </div>

            <!-- Contact Information -->
            <div style="background: white; border: 1px solid ${emailStyles.borderColor}; border-radius: 12px; padding: 24px; text-align: center;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 16px 0; font-size: 18px;">Need Help?</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 16px 0; font-size: 14px; line-height: 1.6;">
                If you have any questions about the online check-in process, our team is here to help.
              </p>
              <div style="display: flex; justify-content: center; gap: 24px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 16px;">📞</span>
                  <span style="color: ${emailStyles.primaryColor}; font-weight: 500;">+39 123 456 7890</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 16px;">📧</span>
                  <span style="color: ${emailStyles.primaryColor}; font-weight: 500;">info@latorresullaviafrancigena.com</span>
                </div>
              </div>
            </div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        customerName: { type: 'string', required: true, description: 'Guest full name', example: 'John Doe' },
        roomName: { type: 'string', required: true, description: 'Name of the reserved room', example: 'Deluxe Suite' },
        checkInDate: { type: 'string', required: true, description: 'Formatted check-in date', example: 'Monday, January 15, 2024' },
        checkinUrl: { type: 'string', required: true, description: 'Secure URL for online check-in with token', example: 'https://latorre.farm/online-checkin/abc123token456' },
        daysUntilCheckin: { type: 'number', required: true, description: 'Number of days until check-in', example: 10 }
      }
    },
    {
      name: 'Guest Check-In Invitation',
      type: 'GUEST_CHECKIN_INVITATION',
      subject: 'You\'re Invited to Complete Online Check-In - {{roomName}}',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Guest Check-In Invitation - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>

          <!-- Guest Invitation Hero -->
          <div style="background: linear-gradient(135deg, ${emailStyles.successColor} 0%, #059669 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">🎉</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">You're Invited!</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.9; font-weight: 500;">Complete your online check-in for the upcoming stay</p>
          </div>

          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
            <!-- Personal Greeting -->
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{guestName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7;">
                <strong>{{inviterName}}</strong> has invited you to complete your online check-in for the upcoming stay at La Torre sulla via Francigena.
              </p>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                To ensure a smooth arrival experience, please complete your check-in process using the link below.
              </p>
            </div>

            <!-- Booking Details -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">🏨 Stay Details</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Room:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700;">{{roomName}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Check-in Date:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{checkInDate}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Check-out Date:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{checkOutDate}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Invited by:</span>
                    <span style="background: ${emailStyles.successColor}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">{{inviterName}}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="{{checkinUrl}}" style="display: inline-block; background: ${emailStyles.successColor}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3); transition: all 0.3s ease;">
                🚀 Complete My Check-In
              </a>
            </div>

            <!-- Important Information -->
            <div style="background: #fef3cd; border: 1px solid #f59e0b; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #d97706; margin: 0 0 16px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 24px;">ℹ️</span> Important Information
              </h3>
              <div style="color: #92400e; font-size: 15px; line-height: 1.6;">
                <p style="margin: 0 0 12px 0;">
                  <strong>Personal Information Required:</strong> You'll need to provide your personal details, including passport/ID information for registration purposes.
                </p>
                <p style="margin: 0 0 12px 0;">
                  <strong>Document Upload:</strong> Please have your passport or ID ready to upload during the check-in process.
                </p>
                <p style="margin: 0;">
                  <strong>Secure Process:</strong> All information is encrypted and handled securely according to Italian privacy regulations.
                </p>
              </div>
            </div>

            <!-- What You'll Need -->
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.infoColor}; margin: 0 0 20px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 24px;">📋</span> What You'll Need
              </h3>
              <div style="display: grid; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="background: ${emailStyles.infoColor}; color: white; border-radius: 50%; padding: 6px; font-size: 12px; font-weight: bold; min-width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">📄</span>
                  <span style="color: ${emailStyles.primaryColor}; font-weight: 500;">Valid passport or national ID</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="background: ${emailStyles.infoColor}; color: white; border-radius: 50%; padding: 6px; font-size: 12px; font-weight: bold; min-width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">📱</span>
                  <span style="color: ${emailStyles.primaryColor}; font-weight: 500;">Mobile phone for document photos</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="background: ${emailStyles.infoColor}; color: white; border-radius: 50%; padding: 6px; font-size: 12px; font-weight: bold; min-width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">📧</span>
                  <span style="color: ${emailStyles.primaryColor}; font-weight: 500;">Valid email address</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="background: ${emailStyles.infoColor}; color: white; border-radius: 50%; padding: 6px; font-size: 12px; font-weight: bold; min-width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">📞</span>
                  <span style="color: ${emailStyles.primaryColor}; font-weight: 500;">Contact phone number</span>
                </div>
              </div>
            </div>

            <!-- Process Timeline -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 18px;">⏱️ Check-in Process</h3>
              <div style="display: grid; gap: 16px;">
                <div style="display: flex; align-items: start; gap: 12px;">
                  <span style="background: ${emailStyles.successColor}; color: white; border-radius: 50%; padding: 8px; font-size: 12px; font-weight: bold; min-width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">1</span>
                  <div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600; margin-bottom: 4px;">Personal Details</div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 14px;">Enter your personal information and contact details</div>
                  </div>
                </div>
                <div style="display: flex; align-items: start; gap: 12px;">
                  <span style="background: ${emailStyles.successColor}; color: white; border-radius: 50%; padding: 8px; font-size: 12px; font-weight: bold; min-width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">2</span>
                  <div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600; margin-bottom: 4px;">Document Upload</div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 14px;">Upload photos of your passport or ID document</div>
                  </div>
                </div>
                <div style="display: flex; align-items: start; gap: 12px;">
                  <span style="background: ${emailStyles.successColor}; color: white; border-radius: 50%; padding: 8px; font-size: 12px; font-weight: bold; min-width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">3</span>
                  <div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600; margin-bottom: 4px;">Terms & Confirmation</div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 14px;">Review and accept terms and conditions</div>
                  </div>
                </div>
                <div style="display: flex; align-items: start; gap: 12px;">
                  <span style="background: ${emailStyles.successColor}; color: white; border-radius: 50%; padding: 8px; font-size: 12px; font-weight: bold; min-width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">✓</span>
                  <div>
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 600; margin-bottom: 4px;">All Set!</div>
                    <div style="color: ${emailStyles.secondaryColor}; font-size: 14px;">You'll be ready for a smooth arrival experience</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Contact Information -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; text-align: center;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 16px 0; font-size: 18px;">Need Help?</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 16px 0; font-size: 14px;">
                If you have any questions about the check-in process, please contact us:
              </p>
              <div style="display: flex; justify-content: center; gap: 24px; flex-wrap: wrap; font-size: 14px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 16px;">📞</span>
                  <span style="color: ${emailStyles.primaryColor}; font-weight: 500;">+39 0583 394107</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 16px;">📧</span>
                  <span style="color: ${emailStyles.primaryColor}; font-weight: 500;">info@latorresullaviafrancigena.com</span>
                </div>
              </div>
            </div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        guestName: { type: 'string', required: true, description: 'Name of the invited guest', example: 'Jane Smith' },
        inviterName: { type: 'string', required: true, description: 'Name of the person who invited this guest', example: 'John Doe' },
        roomName: { type: 'string', required: true, description: 'Name of the reserved room', example: 'Deluxe Suite' },
        checkInDate: { type: 'string', required: true, description: 'Formatted check-in date', example: 'Monday, January 15, 2024' },
        checkOutDate: { type: 'string', required: true, description: 'Formatted check-out date', example: 'Wednesday, January 17, 2024' },
        checkinUrl: { type: 'string', required: true, description: 'Secure URL for guest online check-in with token', example: 'https://latorre.farm/online-checkin/xyz789token123' }
      }
    },
    {
      name: 'Thank You for Staying',
      type: 'THANK_YOU',
      subject: 'Thank you for staying at La Torre! 🙏',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>
    
          <!-- Thank You Hero -->
          <div style="background: linear-gradient(135deg, ${emailStyles.accentColor} 0%, #059669 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">🙏</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Thank You!</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">
              We hope you enjoyed your stay at La Torre
            </p>
          </div>
    
          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
            <!-- Personal Greeting -->
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{customerName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                Thank you for choosing La Torre sulla via Francigena for your stay. It was our pleasure to host you, and we hope you had a wonderful experience.
              </p>
            </div>
    
            <!-- Stay Summary -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">🏠 Your Stay Summary</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Room:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-size: 18px;">{{roomName}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Check-In:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{checkIn}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Check-Out:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{checkOut}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Duration:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{nights}} night{{#if (gt nights 1)}}s{{/if}}</span>
                  </div>
                </div>
              </div>
            </div>
    
            <!-- Appreciation Message -->
            <div style="background: #fef7ed; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.warningColor}; margin: 0 0 20px 0; font-size: 20px;">💖 We Appreciate You</h3>
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7;">
                  Your stay with us helps support our mission to provide exceptional hospitality along the historic Via Francigena. We're grateful for your choice to stay with us.
                </p>
                <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                  We would love to welcome you back again in the future. Until then, safe travels and warm regards from all of us at La Torre!
                </p>
              </div>
            </div>
            
            <!-- Feedback Request -->
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.infoColor}; margin: 0 0 20px 0; font-size: 20px;">⭐ Share Your Experience</h3>
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7;">
                  Your feedback helps us continue to improve our service. If you have a moment, we'd love to hear about your experience.
                </p>
                <ul style="color: ${emailStyles.infoColor}; margin: 0; padding-left: 20px; line-height: 2;">
                  <li>Leave us a review on TripAdvisor or Google</li>
                  <li>Share your experience on social media</li>
                  <li>Send us your feedback directly</li>
                </ul>
              </div>
            </div>
            
            <!-- Contact Information -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">📞 Stay In Touch</h3>
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 16px 0; font-size: 16px; line-height: 1.7;">
                  We're always here if you need anything or want to plan your next visit:
                </p>
                <ul style="color: ${emailStyles.primaryColor}; margin: 0; padding-left: 20px; line-height: 2;">
                  <li><strong>Email:</strong> info@latorresullaviafrancigena.com</li>
                  <li><strong>Phone:</strong> +39 0577 123456</li>
                  <li><strong>Website:</strong> www.latorresullaviafrancigena.com</li>
                </ul>
              </div>
            </div>
          </div>
    
          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        customerName: { type: 'string', required: true, description: 'Customer full name', example: 'John Doe' },
        roomName: { type: 'string', required: true, description: 'Name of the room', example: 'Deluxe Suite' },
        checkIn: { type: 'string', required: true, description: 'Check-in date', example: '2024-01-15' },
        checkOut: { type: 'string', required: true, description: 'Check-out date', example: '2024-01-17' },
        nights: { type: 'number', required: true, description: 'Number of nights', example: 2 }
      }
    },
    {
      id: 'POLICE_PORTAL_FAILURE',
      name: 'POLICE_PORTAL_FAILURE',
      type: 'POLICE_PORTAL_FAILURE',
      subject: '⚠️ Police Portal Reporting Failure - Immediate Action Required',
      html: `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; font-size: 32px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">
              La Torre Hotel
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin-top: 8px;">
              Police Portal Alert System
            </p>
          </div>
    
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background-color: #FEE2E2; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 40px;">⚠️</span>
              </div>
              <h1 style="color: #DC2626; font-size: 28px; margin: 0 0 10px 0; font-weight: 700;">
                Police Portal Reporting Failed
              </h1>
              <p style="color: #7F1D1D; font-size: 16px; margin: 0;">
                Automatic reporting to Italian Police Portal encountered errors
              </p>
            </div>
    
            <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 20px; margin: 30px 0; border-radius: 8px;">
              <h2 style="color: #991B1B; font-size: 18px; margin: 0 0 15px 0;">
                Summary
              </h2>
              <div style="color: #7F1D1D; line-height: 1.8;">
                <p style="margin: 5px 0;"><strong>Date:</strong> {{reportDate}}</p>
                <p style="margin: 5px 0;"><strong>Total Bookings:</strong> {{totalBookings}}</p>
                <p style="margin: 5px 0;"><strong>Successful:</strong> <span style="color: #059669;">{{successfulReports}}</span></p>
                <p style="margin: 5px 0;"><strong>Failed:</strong> <span style="color: #DC2626;">{{failedReports}}</span></p>
              </div>
            </div>
    
            {{#if failedBookings}}
            <div style="background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h3 style="color: #991B1B; font-size: 18px; margin: 0 0 15px 0;">
                Failed Bookings Details
              </h3>
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background-color: #F9FAFB; border-bottom: 2px solid #E5E7EB;">
                      <th style="padding: 12px; text-align: left; color: #374151; font-weight: 600;">Booking ID</th>
                      <th style="padding: 12px; text-align: left; color: #374151; font-weight: 600;">Room</th>
                      <th style="padding: 12px; text-align: left; color: #374151; font-weight: 600;">Guest</th>
                      <th style="padding: 12px; text-align: left; color: #374151; font-weight: 600;">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {{#each failedBookings}}
                    <tr style="border-bottom: 1px solid #E5E7EB;">
                      <td style="padding: 12px; color: #6B7280; font-size: 14px;">{{this.bookingId}}</td>
                      <td style="padding: 12px; color: #6B7280; font-size: 14px;">{{this.roomName}}</td>
                      <td style="padding: 12px; color: #6B7280; font-size: 14px;">{{this.guestName}}</td>
                      <td style="padding: 12px; color: #DC2626; font-size: 14px;">{{this.error}}</td>
                    </tr>
                    {{/each}}
                  </tbody>
                </table>
              </div>
            </div>
            {{/if}}
    
            <div style="background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h3 style="color: #EA580C; font-size: 16px; margin: 0 0 10px 0;">
                ⚡ Required Actions
              </h3>
              <ol style="color: #9A3412; margin: 10px 0; padding-left: 20px; line-height: 1.8;">
                <li>Review the failed bookings in the admin panel</li>
                <li>Ensure all guest data is complete (passport/ID, nationality, etc.)</li>
                <li>Manually retry the police portal submission</li>
                <li>Contact support if the issue persists</li>
              </ol>
            </div>
    
            <div style="text-align: center; margin: 40px 0;">
              <a href="https://bookings.latorre.farm/admin?sidebar=bookings" 
                 style="display: inline-block; background-color: #DC2626; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Review Failed Bookings
              </a>
            </div>
    
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
              <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 0;">
                This is an automated alert from the La Torre booking system. Police portal reporting is mandatory for all checked-in guests within 24 hours of arrival.
              </p>
            </div>
          </div>
    
          <!-- Footer -->
          <div style="background-color: #1f2937; padding: 30px; text-align: center;">
            <p style="color: #9ca3af; font-size: 14px; margin: 0;">
              © 2024 La Torre Hotel. All rights reserved.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 10px;">
              Via della Torre, 12345 Siena, Italy | +39 0577 123456
            </p>
          </div>
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        reportDate: { type: 'string', required: true, description: 'Date of the report', example: '2024-01-15' },
        totalBookings: { type: 'number', required: true, description: 'Total bookings processed', example: 5 },
        successfulReports: { type: 'number', required: true, description: 'Number of successful reports', example: 3 },
        failedReports: { type: 'number', required: true, description: 'Number of failed reports', example: 2 },
        failedBookings: { 
          type: 'array', 
          required: false, 
          description: 'Array of failed booking details',
          example: [
            {
              bookingId: '1ec6b9cc-28f2-4982-81c2-0f68cdd8923e',
              roomName: 'Deluxe Suite',
              guestName: 'John Doe',
              error: 'Missing passport number'
            }
          ]
        }
      }
    },
    {
      name: 'WEDDING_PORTAL_USER_SIGNUP_PASSWORD',
      type: 'WEDDING_PORTAL_USER_SIGNUP_PASSWORD',  
      subject: '🎉 WELCOME TO LA TORRE - YOUR ACCOUNT CREDENTIALS',
      isActive: true,
      html: `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
          <!-- HEADER -->
          <div style="background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; font-size: 32px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">
              LA TORRE HOTEL
            </h1>
          </div>
    
          <!-- BODY -->
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background-color: #E0E7FF; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 40px;">🎉</span>
              </div>
              <h1 style="color: #4F46E5; font-size: 24px; margin: 0 0 10px 0; font-weight: 700;">
                YOUR ACCOUNT IS READY!
              </h1>
            <p style="color: #4B5563; font-size: 16px; margin: 0; line-height: 1.6;">
              We've successfully created an account for you. Please use the credentials below for future logins.
            </p>
            <p style="color: #4B5563; font-size: 14px; margin-top: 8px; line-height: 1.6;">
              You may update your password at any time after logging in for enhanced security.
            </p>

            </div>
    
            <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <p style="font-size: 16px; margin-bottom: 10px;"><strong>EMAIL:</strong> {{email}}</p>
              <p style="font-size: 16px; margin-bottom: 0;"><strong>PASSWORD:</strong> <span style="color: #4F46E5; font-weight: 600;">{{password}}</span></p>
            </div>
    
            <p style="color: #6B7280; font-size: 12px; line-height: 1.6; text-align: center; margin-top: 20px;">
              THIS IS AN AUTOMATED EMAIL. PLEASE DO NOT REPLY.
            </p>
          </div>
    
          <!-- FOOTER -->
           ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      version: 1,
      variables: {
        email: { type: 'string', required: true, description: 'User email', example: 'user@example.com' },
        password: { type: 'string', required: true, description: 'Generated password', example: 'Abc123!@#' },
      }
    }
,    
    {
      name: 'Enhancement Invitation',
      type: 'ENHANCEMENT_INVITATION',
      subject: 'Enhance Your Stay at La Torre - Special Offers Inside',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Enhancement Invitation - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>

          <!-- Enhancement Hero -->
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">✨</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Enhance Your Experience</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">
              Special offers available for your upcoming stay
            </p>
          </div>

          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
            <!-- Personal Greeting -->
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{customerName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7;">
                {{#if isMainGuest}}
                Your stay at La Torre sulla via Francigena is just around the corner! We have some exclusive enhancements available to make your experience even more memorable.
                {{else}}
                You're part of an upcoming stay at La Torre sulla via Francigena! The main guest has invited you to add special enhancements to your experience.
                {{/if}}
              </p>
            </div>

            <!-- Booking Details -->
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">📅 Your Stay Details</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Booking Reference:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-family: monospace; background: ${emailStyles.backgroundColor}; padding: 6px 12px; border-radius: 6px;">{{bookingReference}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Room:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{roomName}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid ${emailStyles.borderColor};">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Check-in:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{checkInDate}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: ${emailStyles.secondaryColor};">Check-out:</span>
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{checkOutDate}}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Available Enhancements Preview -->
            <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 20px;">🎁 Available Enhancements</h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 20px 0; font-size: 15px; line-height: 1.7;">
                  We have carefully selected special services and amenities to enhance your stay:
                </p>
                {{{enhancementsPreview}}}
              </div>
            </div>

            {{#if isMainGuest}}
            <!-- Main Guest Portal Access -->
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 24px; margin-bottom: 32px; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin: 0 0 16px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #f59e0b;"><path d="M12 2v10l3-3"></path><circle cx="12" cy="12" r="10"></circle></svg>
                Manage Your Group's Enhancements
              </h3>
              <div style="background: white; padding: 16px; border-radius: 8px;">
                <p style="color: #92400e; margin: 0 0 16px 0; font-size: 15px; line-height: 1.7;">
                  As the main guest, you can manage enhancements for your entire group. View available options and add them for yourself and your guests.
                </p>
                <div style="text-align: center; margin-top: 24px;">
                  <a href="{{portalUrl}}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);">
                    Manage Enhancements
                  </a>
                </div>
                <p style="color: #a16207; margin: 16px 0 0 0; font-size: 13px; text-align: center;">
                  This secure link is unique to you and expires on {{expirationDate}}
                </p>
              </div>
            </div>
            {{else}}
            <!-- Regular Guest Enhancement Options -->
            <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #075985; margin: 0 0 20px 0; font-size: 20px;">🎯 Quick Selection</h3>
              <div style="background: white; border-radius: 8px; padding: 24px;">
                <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 24px 0; font-size: 15px; line-height: 1.7;">
                  Would you like to add any enhancements to your stay? Choose an option below:
                </p>
                
                <!-- Enhancement Selection Buttons -->
                <div style="text-align: center;">
                  <a href="{{acceptUrl}}" style="display: inline-block; background: ${emailStyles.successColor}; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 0 8px 16px 8px;">
                    ✅ Yes, Add Enhancements
                  </a>
                  <a href="{{declineUrl}}" style="display: inline-block; background: #e5e7eb; color: #6b7280; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 0 8px 16px 8px;">
                    No Thanks
                  </a>
                </div>
                
                <p style="color: #9ca3af; margin: 16px 0 0 0; font-size: 13px; text-align: center; font-style: italic;">
                  Note: This is a one-time decision. Once confirmed, changes can only be made by contacting our staff.
                </p>
              </div>
            </div>
            {{/if}}

            <!-- Important Notes -->
            <div style="background: #fff7ed; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #9a3412; margin: 0 0 16px 0; font-size: 18px;">📌 Important Information</h3>
              <ul style="color: #9a3412; margin: 0; padding-left: 20px; line-height: 1.8; font-size: 14px;">
                <li>Enhancements are subject to availability</li>
                <li>Prices shown include all applicable taxes</li>
                <li>{{#if isMainGuest}}You can manage enhancements for all guests in your group{{else}}Once you make your selection, it cannot be changed online{{/if}}</li>
                <li>Payment will be processed with your stay charges</li>
                <li>For assistance, contact our reception team</li>
              </ul>
            </div>

            <!-- Contact Support -->
            <div style="text-align: center; padding: 24px; background: ${emailStyles.backgroundColor}; border-radius: 12px;">
              <h4 style="color: ${emailStyles.primaryColor}; margin: 0 0 12px 0; font-size: 18px;">Need Help?</h4>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 16px 0; font-size: 14px;">
                Our team is here to assist you with any questions
              </p>
              <div style="font-size: 14px; color: ${emailStyles.secondaryColor};">
                📧 info@latorresullaviafrancigena.com<br>
                📞 +39 123 456 7890
              </div>
            </div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        customerName: { type: 'string', description: 'Customer full name', example: 'John Doe' },
        isMainGuest: { type: 'boolean', description: 'Whether this is the main guest', example: true },
        bookingReference: { type: 'string', description: 'Booking reference ID', example: 'BK-123456' },
        roomName: { type: 'string', description: 'Room name', example: 'Deluxe Suite' },
        checkInDate: { type: 'string', description: 'Check-in date', example: 'March 15, 2024' },
        checkOutDate: { type: 'string', description: 'Check-out date', example: 'March 20, 2024' },
        enhancementsPreview: { type: 'string', description: 'HTML preview of available enhancements', example: '<ul><li>Spa Package</li></ul>' },
        portalUrl: { type: 'string', description: 'Main guest portal URL with token', example: 'https://domain.com/enhancements/token123' },
        acceptUrl: { type: 'string', description: 'URL to accept enhancements (regular guests)', example: 'https://domain.com/accept/token456' },
        declineUrl: { type: 'string', description: 'URL to decline enhancements (regular guests)', example: 'https://domain.com/decline/token789' },
        expirationDate: { type: 'string', description: 'Token expiration date', example: 'March 14, 2024' },
        // Event-specific variables (optional - used when template is for events)
        eventName: { type: 'string', description: 'Event name (for event invitations)', example: 'Wine Tasting Evening' },
        eventDescription: { type: 'string', description: 'Event description', example: 'Join us for an exclusive wine tasting' },
        eventDate: { type: 'string', description: 'Event date', example: 'Saturday, March 15, 2024' },
        eventTime: { type: 'string', description: 'Event time', example: '7:00 PM - 10:00 PM' },
        eventLocation: { type: 'string', description: 'Event location', example: 'Garden Terrace' },
        eventPrice: { type: 'number', description: 'Event price per person', example: 45 },
        isEventInvitation: { type: 'boolean', description: 'Whether this is an event invitation', example: true }
      }
    },
    {
      name: 'Guest Added Confirmation',
      type: 'GUEST_ADDED_CONFIRMATION',
      subject: "You've been added to {{eventName}} at La Torre",
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Event Invitation - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>

          <!-- Event Hero -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px;">
            <div style="font-size: 44px; margin-bottom: 16px;">🎉</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">You're Invited!</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">
              You've been added to an exclusive event
            </p>
          </div>

          <!-- Main Content -->
          <div style="padding: 0 32px 32px;">
            <!-- Personal Greeting -->
            <div style="margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0;">Dear {{guestName}},</h3>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 20px 0; font-size: 15px; line-height: 1.7;">
                Great news! <strong>{{mainGuestName}}</strong> has added you as a guest to an upcoming event at La Torre sulla via Francigena.
              </p>
            </div>

            <!-- Event Details Card -->
            <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 16px; padding: 28px; margin-bottom: 32px;">
              <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">📅 Event Details</h3>
              
              <div style="background: white; border-radius: 12px; padding: 24px;">
                <h4 style="color: ${emailStyles.primaryColor}; margin: 0 0 16px 0; font-size: 20px;">{{eventName}}</h4>
                
                <div style="margin-bottom: 16px;">
                  <div style="display: inline-block; margin-right: 32px;">
                    <span style="color: ${emailStyles.secondaryColor}; font-size: 13px; display: block; margin-bottom: 4px;">Date</span>
                    <span style="color: ${emailStyles.primaryColor}; font-size: 15px; font-weight: 600;">📅 {{eventDate}}</span>
                  </div>
                  <div style="display: inline-block;">
                    <span style="color: ${emailStyles.secondaryColor}; font-size: 13px; display: block; margin-bottom: 4px;">Time</span>
                    <span style="color: ${emailStyles.primaryColor}; font-size: 15px; font-weight: 600;">🕐 {{eventTime}}</span>
                  </div>
                </div>
                
                <div>
                  <span style="color: ${emailStyles.secondaryColor}; font-size: 13px; display: block; margin-bottom: 4px;">Location</span>
                  <span style="color: ${emailStyles.primaryColor}; font-size: 15px; font-weight: 600;">📍 {{location}}</span>
                </div>
              </div>
            </div>

            <!-- Confirmation Notice -->
            <div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
              <div style="display: flex; align-items: center;">
                <div style="font-size: 24px; margin-right: 12px;">✅</div>
                <div>
                  <h4 style="color: #16a34a; margin: 0 0 4px 0; font-size: 16px;">Your Attendance is Confirmed</h4>
                  <p style="color: #15803d; margin: 0; font-size: 14px;">
                    {{mainGuestName}} has confirmed your attendance for this event. No further action is required.
                  </p>
                </div>
              </div>
            </div>

            <!-- Important Information -->
            <div style="background: #fef3c7; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
              <h3 style="color: #92400e; margin: 0 0 16px 0; font-size: 18px;">📋 What You Need to Know</h3>
              <ul style="color: #92400e; margin: 0; padding-left: 20px; line-height: 1.8; font-size: 14px;">
                <li>Your spot has been reserved by {{mainGuestName}}</li>
                <li>Event details and any updates will be communicated via email</li>
                <li>If you cannot attend, please contact the hotel reception immediately</li>
                <li>Any special dietary requirements should be communicated in advance</li>
              </ul>
            </div>

            <!-- Contact Information -->
            <div style="text-align: center; padding: 24px; background: ${emailStyles.backgroundColor}; border-radius: 12px;">
              <h4 style="color: ${emailStyles.primaryColor}; margin: 0 0 12px 0; font-size: 18px;">Need to Make Changes?</h4>
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 16px 0; font-size: 14px;">
                To modify or cancel your attendance, please contact us directly:
              </p>
              <div style="font-size: 14px; color: ${emailStyles.secondaryColor};">
                📧 {{hotelEmail}}<br>
                📞 {{hotelPhone}}
              </div>
              <p style="color: #9ca3af; margin: 16px 0 0 0; font-size: 12px; font-style: italic;">
                Note: Changes cannot be made online once you've been added by the main guest.
              </p>
            </div>
          </div>

          ${generateEmailFooter()}
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        guestName: { type: 'string', description: 'Guest full name', example: 'Jane Smith' },
        eventName: { type: 'string', description: 'Event name', example: 'Wine Tasting Evening' },
        eventDate: { type: 'string', description: 'Event date', example: 'Saturday, March 15, 2024' },
        eventTime: { type: 'string', description: 'Event time', example: '7:00 PM' },
        location: { type: 'string', description: 'Event location', example: 'La Torre sulla via Francigena' },
        mainGuestName: { type: 'string', description: 'Name of main guest who added this person', example: 'John Doe' },
        hotelPhone: { type: 'string', description: 'Hotel contact phone', example: '+39 123 456 7890' },
        hotelEmail: { type: 'string', description: 'Hotel contact email', example: 'info@latorresullaviafrancigena.com' }
      }
    }
  ]

  for (const template of templates) {
    await prisma.emailTemplate.upsert({
      where: {
        id: template.type, // Use type as the ID since it's unique
      },
      update: template,
      //@ts-ignore
      create: template
    });
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
