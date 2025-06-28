import dotenv from "dotenv";
import prisma from "../prisma";
import { hashPassword } from '../utils/bcrypt';

dotenv.config();

const adminEmail = ["scottpauladams@gmail.com", "subashchandraboseravi45@gmail.com"];

// Shared email styles
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
          <div><span style="font-size: 16px;">🌐</span> www.latorresullaviafrancigena.com</div>
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

  for (const email of adminEmail) {
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
      chargePaymentConfig: JSON.stringify({ qr_code: true, hosted_invoice: true, manual_charge: true, manual_transaction_id: true })
    },
    update: {
      id: "1",
      minStayDays: 2,
      chargePaymentConfig: JSON.stringify({ qr_code: true, hosted_invoice: true, manual_charge: true, manual_transaction_id: true })
    }
  });
  console.log("✅ Settings created");
};

createSettings()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

async function main() {
  // Seed email templates
  const templates = [
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
                      <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{../currency}} {{basePrice}}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: ${emailStyles.secondaryColor};">Number of Nights</span>
                      <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{nights}}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: ${emailStyles.secondaryColor};">Room Total</span>
                      <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{../currency}} {{roomTotal}}</span>
                    </div>
                    {{#if enhancementsTotal}}
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: ${emailStyles.secondaryColor};">Room Enhancements</span>
                      <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{../currency}} {{enhancementsTotal}}</span>
                    </div>
                    {{/if}}
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; background: #f0f9ff; border-radius: 6px; margin-top: 8px;">
                      <span style="color: ${emailStyles.infoColor}; font-weight: 600;">Total for This Room</span>
                      <span style="color: ${emailStyles.infoColor}; font-weight: 700;">{{../currency}} {{add roomTotal enhancementsTotal}}</span>
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
                          {{../../currency}} {{pricingDetails.basePrice}} × {{pricingDetails.guests}} guest(s)
                          {{else if (eq pricingDetails.pricingType "PER_DAY")}}
                          {{../../currency}} {{pricingDetails.basePrice}} × {{pricingDetails.nights}} night(s)
                          {{else}}
                          {{../../currency}} {{pricingDetails.basePrice}} (per booking)
                          {{/if}}
                        </div>
                      </div>
                      <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{../../currency}} {{calculatedPrice}}</div>
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
                    <span style="color: #166534; font-weight: 600;">Room Charges:</span>
                    <span style="color: #166534; font-weight: 600;">{{currency}} {{roomCharges}}</span>
                  </div>
                  {{#if enhancementsTotal}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Total Enhancements:</span>
                    <span style="color: #166534; font-weight: 600;">{{currency}} {{enhancementsTotal}}</span>
                  </div>
                  {{/if}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Subtotal:</span>
                    <span style="color: #166534; font-weight: 600;">{{currency}} {{subtotal}}</span>
                  </div>
                  {{#if voucherInfo}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0; background: #f0f9ff; border-radius: 6px; padding: 12px;">
                    <span style="color: #166534; font-weight: 600;">Voucher Discount ({{voucherInfo.code}}):</span>
                    <span style="color: #166534; font-weight: 600;">-{{currency}} {{voucherInfo.discountAmount}}</span>
                  </div>
                  {{/if}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Tax:</span>
                    <span style="color: #166534; font-weight: 600;">{{currency}} {{taxAmount}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; font-weight: 700; font-size: 24px; color: #166534;">
                    <span>Total Amount:</span>
                    <span>{{currency}} {{amount}}</span>
                  </div>
                </div>
              </div>
            </div>

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
                      <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{../currency}} {{basePrice}}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: ${emailStyles.secondaryColor};">Number of Nights</span>
                      <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{nights}}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: ${emailStyles.secondaryColor};">Room Total</span>
                      <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{../currency}} {{roomTotal}}</span>
                    </div>
                    {{#if enhancementsTotal}}
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: ${emailStyles.secondaryColor};">Room Enhancements</span>
                      <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{../currency}} {{enhancementsTotal}}</span>
                    </div>
                    {{/if}}
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; background: #fef2f2; border-radius: 6px; margin-top: 8px; text-decoration: line-through; opacity: 0.7;">
                      <span style="color: #dc2626; font-weight: 600;">Original Total</span>
                      <span style="color: #dc2626; font-weight: 700;">{{../currency}} {{add roomTotal enhancementsTotal}}</span>
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
                          {{../../currency}} {{pricingDetails.basePrice}} × {{pricingDetails.guests}} guest(s)
                          {{else if (eq pricingDetails.pricingType "PER_DAY")}}
                          {{../../currency}} {{pricingDetails.basePrice}} × {{pricingDetails.nights}} night(s)
                          {{else}}
                          {{../../currency}} {{pricingDetails.basePrice}} (per booking)
                          {{/if}}
                        </div>
                      </div>
                      <div style="color: #dc2626; font-weight: 600; text-decoration: line-through;">{{../../currency}} {{calculatedPrice}}</div>
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
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #166534; font-weight: 600;">Status:</span>
                    <span style="background: #166534; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">PROCESSED</span>
                  </div>
                </div>
              </div>
            </div>
    
            <!-- Refund Processing Note -->
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
                    <div style="color: ${emailStyles.primaryColor}; font-weight: 700; font-size: 20px;">{{../currency}} {{room.price}}</div>
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
                    <span style="color: #166534; font-weight: 600; font-family: ${emailStyles.fontFamily};">{{payment.currency}} {{payment.amount}}</span>
                  </div>
                  {{#if voucherInfo}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #bbf7d0; background: #f0f9ff; border-radius: 6px; padding: 12px;">
                    <span style="font-weight: 600; color: #166534; font-family: ${emailStyles.fontFamily};">Voucher Applied:</span>
                    <span style="color: #166534; font-weight: 600; font-family: ${emailStyles.fontFamily};">{{voucherInfo.code}} (-{{payment.currency}} {{voucherInfo.discountAmount}})</span>
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
                        <span style="color: #92400e; font-size: 14px; margin-left: 8px;">Value: {{../payment.currency}} {{value}}</span>
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
                Thank you for choosing La Torre sulla via Francigena. To secure your reservation, please complete your payment using the link below.
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
                  <div style="color: ${emailStyles.primaryColor}; font-size: 24px; font-weight: 700;">{{currency}} {{amount}}</div>
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
                        <div style="font-weight: 700; font-size: 24px; color: ${emailStyles.primaryColor};">{{../currency}} {{basePrice}}</div>
                        <div style="font-size: 14px; color: ${emailStyles.secondaryColor};">per night</div>
                      </div>
                    </div>

                    <!-- Room Price Breakdown -->
                    <div style="margin-top: 20px; background: #f8fafc; padding: 16px; border-radius: 8px;">
                      <h5 style="color: ${emailStyles.primaryColor}; margin: 0 0 12px 0; font-size: 16px;">Price Breakdown</h5>
                      <div style="display: grid; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="color: ${emailStyles.secondaryColor};">Room Rate</span>
                          <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{../currency}} {{basePrice}} × {{nights}} night(s)</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="color: ${emailStyles.secondaryColor};">Room Total</span>
                          <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{../currency}} {{roomTotal}}</span>
                        </div>
                        {{#if enhancementsTotal}}
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="color: ${emailStyles.secondaryColor};">Room Enhancements</span>
                          <span style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{../currency}} {{enhancementsTotal}}</span>
                        </div>
                        {{/if}}
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; background: #f0f9ff; border-radius: 6px; margin-top: 8px;">
                          <span style="color: ${emailStyles.infoColor}; font-weight: 600;">Total for This Room</span>
                          <span style="color: ${emailStyles.infoColor}; font-weight: 700;">{{../currency}} {{add roomTotal enhancementsTotal}}</span>
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
                              {{../../currency}} {{pricingDetails.basePrice}} × {{pricingDetails.guests}} guest(s)
                              {{else if (eq pricingDetails.pricingType "PER_DAY")}}
                              {{../../currency}} {{pricingDetails.basePrice}} × {{pricingDetails.nights}} night(s)
                              {{else}}
                              {{../../currency}} {{pricingDetails.basePrice}} (per booking)
                              {{/if}}
                            </div>
                          </div>
                          <div style="color: ${emailStyles.primaryColor}; font-weight: 600;">{{../../currency}} {{calculatedPrice}}</div>
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
                    <span style="color: #166534; font-weight: 600;">Room Charges:</span>
                    <span style="color: #166534; font-weight: 600;">{{currency}} {{roomCharges}}</span>
                  </div>
                  {{#if enhancementsTotal}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Total Enhancements:</span>
                    <span style="color: #166534; font-weight: 600;">{{currency}} {{enhancementsTotal}}</span>
                  </div>
                  {{/if}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Subtotal:</span>
                    <span style="color: #166534; font-weight: 600;">{{currency}} {{subtotal}}</span>
                  </div>
                  {{#if voucherInfo}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0; background: #f0f9ff; border-radius: 6px; padding: 12px;">
                    <span style="color: #166534; font-weight: 600;">Voucher Discount ({{voucherInfo.code}}):</span>
                    <span style="color: #166534; font-weight: 600;">-{{currency}} {{voucherInfo.discountAmount}}</span>
                  </div>
                  {{/if}}
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600;">Tax:</span>
                    <span style="color: #166534; font-weight: 600;">{{currency}} {{taxAmount}}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; font-weight: 700; font-size: 24px; color: #166534;">
                    <span>Total Amount:</span>
                    <span>{{currency}} {{amount}}</span>
                  </div>
                </div>
              </div>
            </div>

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
                    <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-size: 18px;">{{currency}} {{amount}}</span>
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
      name: 'Customer Email Verification',
      type: 'CUSTOMER_EMAIL_VERIFICATION',
      subject: 'Verify your email for La Torre',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - La Torre</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: ${emailStyles.fontFamily}; background-color: #f1f5f9;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <div style="text-align: center; padding: 32px;">
            <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px; margin-bottom: 24px;" />
          </div>
          <div style="background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); color: white; text-align: center; padding: 32px; margin-bottom: 32px; border-radius: 0 0 16px 16px;">
            <div style="font-size: 44px; margin-bottom: 16px;">🔐</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">Verify your email</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">
              Click the button below to verify your email and continue your booking.
            </p>
          </div>
          <div style="padding: 0 32px 32px; text-align: center;">
            <a href="{{verifyUrl}}" style="display:inline-block;padding:16px 32px;background:#1d4ed8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:24px 0;font-size:18px;">Verify Email</a>
            <p style="font-size: 14px; color: #64748b; margin-top: 16px;">
              This link will expire in 15 minutes.
            </p>
          </div>
          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e2e8f0;" />
          <div style="text-align: center; color: #94a3b8; font-size: 12px; padding-bottom: 24px;">
            If you didn't request this, you can safely ignore this email.<br />
            © {{year}} La Torre. All rights reserved.
          </div>
        </div>
      </body>
      </html>`,
      isActive: true,
      version: 1,
      variables: {
        verifyUrl: { type: 'string', description: 'Verification link', example: 'https://your-frontend.com/verify?token=...' },
        year: { type: 'number', description: 'Current year', example: 2024 },
        name: { type: 'string', description: 'Customer name', example: 'John Doe', optional: true }
      }
    }
  ];

  for (const template of templates) {
    await prisma.emailTemplate.upsert({
      where: {
        id: template.type, // Use type as the ID since it's unique
      },
      update: template,
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
