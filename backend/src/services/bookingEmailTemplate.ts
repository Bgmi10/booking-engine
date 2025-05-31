import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

interface BookingDetails {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestNationality?: string;
  totalGuests: number;
  checkIn: Date;
  checkOut: Date;
  status: string;
  request?: string;
  room: {
    id: string;
    name: string;
    description: string;
    amenities: string[];
    price: number;
    capacity: number;
    images?: { url: string }[];
  };
  enhancementBookings?: {
    id: string;
    quantity: number;
    notes?: string;
    enhancement: {
      title: string;
      description: string;
      price: number;
      pricingType: string;
    };
  }[];
  payment: {
    amount: number;
    currency: string;
    status: string;
    stripeSessionId: string;
  };
  metadata?: {
    selectedRateOption?: any;
    promotionCode?: string;
    totalPrice: number;
    rooms: number;
    receiveMarketing?: boolean;
  };
}

// Send booking confirmation email to guest
export const sendBookingConfirmation = async (bookingDetails: BookingDetails) => {
  const {
    id,
    guestName,
    guestEmail,
    guestPhone,
    guestNationality,
    totalGuests,
    checkIn,
    checkOut,
    status,
    request,
    room,
    enhancementBookings = [],
    payment,
    metadata
  } = bookingDetails;

  console.log(enhancementBookings);


  const checkInDate = new Date(checkIn).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const checkOutDate = new Date(checkOut).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));

  // Calculate enhancement total
  const enhancementTotal = enhancementBookings.reduce((total, enhancement) => {
    return total + (enhancement.enhancement.price * enhancement.quantity);
  }, 0);

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <div style="width: 60px; height: 60px; background: white; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #667eea;">
            🏨
          </div>
          <h1 style="font-size: 28px; font-weight: bold; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">La Torre</h1>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <!-- Confirmation Badge -->
          <div style="background: #22c55e; color: white; text-align: center; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="margin: 0; font-size: 24px;">✅ Booking Confirmed!</h2>
            <p style="margin: 5px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for choosing La Torre</p>
          </div>

          <!-- Greeting -->
          <p style="font-size: 18px; margin-bottom: 20px; color: #333;">Dear ${guestName},</p>
          <p style="margin-bottom: 25px; color: #666;">We're excited to confirm your reservation! Here are your booking details:</p>

          <!-- Booking Details Card -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">📋 Booking Information</h3>
            <div style="display: grid; gap: 8px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="font-weight: 600; color: #374151;">Booking ID:</span>
                <span style="color: #6b7280;">#${id.substring(0, 8).toUpperCase()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="font-weight: 600; color: #374151;">Status:</span>
                <span style="color: #22c55e; font-weight: 600;">${status}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="font-weight: 600; color: #374151;">Guest Name:</span>
                <span style="color: #6b7280;">${guestName}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="font-weight: 600; color: #374151;">Email:</span>
                <span style="color: #6b7280;">${guestEmail}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="font-weight: 600; color: #374151;">Phone:</span>
                <span style="color: #6b7280;">${guestPhone}</span>
              </div>
              ${guestNationality ? `
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="font-weight: 600; color: #374151;">Nationality:</span>
                <span style="color: #6b7280;">${guestNationality}</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span style="font-weight: 600; color: #374151;">Total Guests:</span>
                <span style="color: #6b7280;">${totalGuests}</span>
              </div>
            </div>
          </div>

          <!-- Stay Details -->
          <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">🗓️ Stay Details</h3>
            <div style="display: grid; gap: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 600; color: #92400e;">Check-in</div>
                  <div style="color: #a16207; font-size: 14px;">${checkInDate}</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 600; color: #92400e;">Check-out</div>
                  <div style="color: #a16207; font-size: 14px;">${checkOutDate}</div>
                </div>
              </div>
              <div style="text-align: center; padding: 10px; background: white; border-radius: 6px;">
                <span style="font-weight: 600; color: #92400e;">${nights} ${nights === 1 ? 'Night' : 'Nights'}</span>
              </div>
            </div>
          </div>

          <!-- Room Details -->
          <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 18px;">🏨 Room Details</h3>
            <div style="margin-bottom: 15px;">
              <h4 style="color: #0c4a6e; margin: 0 0 8px 0; font-size: 16px;">${room.name}</h4>
              <p style="color: #075985; margin: 0 0 10px 0; font-size: 14px;">${room.description}</p>
              <div style="color: #0284c7; font-size: 14px;">
                <strong>Capacity:</strong> ${room.capacity} guests<br>
                <strong>Price per night:</strong> ${payment.currency.toUpperCase()} ${room.price}
              </div>
            </div>
            ${room.amenities && room.amenities.length > 0 ? `
            <div>
              <strong style="color: #0c4a6e;">Amenities:</strong>
              <div style="margin-top: 8px;">
                ${room.amenities.map(amenity => `<span style="background: #e0f2fe; color: #0c4a6e; padding: 4px 8px; border-radius: 4px; margin: 2px; display: inline-block; font-size: 12px;">${amenity}</span>`).join('')}
              </div>
            </div>
            ` : ''}
          </div>

          <!-- Enhancements -->
          ${enhancementBookings.length > 0 ? `
          <div style="background: #f3e8ff; border: 1px solid #a855f7; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #6b21a8; margin: 0 0 15px 0; font-size: 18px;">✨ Selected Enhancements</h3>
            ${enhancementBookings.map(enhancement => `
              <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #a855f7;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <div>
                    <h4 style="color: #6b21a8; margin: 0 0 5px 0; font-size: 14px;">${enhancement.enhancement.title}</h4>
                    <p style="color: #7c3aed; margin: 0 0 5px 0; font-size: 12px;">${enhancement.enhancement.description}</p>
                    <div style="color: #8b5cf6; font-size: 12px;">
                      Quantity: ${enhancement.quantity} | Type: ${enhancement.enhancement.pricingType.replace('_', ' ')}
                      ${enhancement.notes ? `<br>Notes: ${enhancement.notes}` : ''}
                    </div>
                  </div>
                  <div style="text-align: right; color: #6b21a8; font-weight: 600;">
                    ${payment.currency.toUpperCase()} ${(enhancement.enhancement.price * enhancement.quantity).toFixed(2)}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <!-- Special Requests -->
          ${request ? `
          <div style="background: #fef7cd; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 18px;">💬 Special Requests</h3>
            <p style="color: #a16207; margin: 0; font-style: italic;">"${request}"</p>
          </div>
          ` : ''}

          <!-- Payment Summary -->
          <div style="background: #dcfce7; border: 1px solid #22c55e; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">💳 Payment Summary</h3>
            <div style="display: grid; gap: 8px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                <span style="color: #166534;">Room (${nights} ${nights === 1 ? 'night' : 'nights'}):</span>
                <span style="color: #166534;">${payment.currency.toUpperCase()} ${(room.price * nights * (metadata?.rooms || 1)).toFixed(2)}</span>
              </div>
              ${enhancementBookings.length > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                <span style="color: #166534;">Enhancements:</span>
                <span style="color: #166534;">${payment.currency.toUpperCase()} ${enhancementTotal.toFixed(2)}</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding: 12px 0; font-weight: 600; font-size: 18px; color: #166534; border-top: 2px solid #22c55e;">
                <span>Total Paid:</span>
                <span>${payment.currency.toUpperCase()} ${payment.amount.toFixed(2)}</span>
              </div>
              <div style="text-align: center; margin-top: 10px;">
                <span style="background: #22c55e; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                  Payment ${payment.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <!-- Important Information -->
          <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #dc2626; margin: 0 0 15px 0; font-size: 18px;">ℹ️ Important Information</h3>
            <ul style="color: #b91c1c; margin: 0; padding-left: 20px;">
              <li>Check-in time: 3:00 PM</li>
              <li>Check-out time: 11:00 AM</li>
              <li>Please bring a valid ID for check-in</li>
              <li>Contact us at least 24 hours in advance for any changes</li>
            </ul>
          </div>

          <!-- Contact Information -->
          <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">Need Help?</h3>
            <p style="color: #64748b; margin: 0 0 10px 0;">We're here to assist you 24/7</p>
            <div style="color: #3b82f6;">
              📞 +1 (555) 123-4567<br>
              📧 info@latorre.com<br>
              🌐 www.latorre.com
            </div>
          </div>

          <!-- Footer Message -->
          <p style="text-align: center; color: #6b7280; margin: 0;">
            We look forward to welcoming you to La Torre!<br>
            Have a wonderful stay! 🌟
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            © ${new Date().getFullYear()} La Torre. All rights reserved.<br>
            You received this email because you made a booking with us.
          </p>
        </div>
      </div>
    </div>
  `;

  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: "La Torre", email: "subashchandraboseravi45@gmail.com" },
        to: [{ email: guestEmail, name: guestName }],
        subject: `Booking Confirmed - Welcome to La Torre! (${id.substring(0, 8).toUpperCase()})`,
        htmlContent,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`Booking confirmation sent to ${guestEmail}`);
  } catch (error: any) {
    console.error("Error sending booking confirmation email:", error.response?.data || error.message);
    throw new Error("Failed to send booking confirmation email");
  }
};

// Send booking notification to admin
export const sendAdminBookingNotification = async (bookingDetails: BookingDetails) => {
  const {
    id,
    guestName,
    guestEmail,
    guestPhone,
    totalGuests,
    checkIn,
    checkOut,
    room,
    enhancementBookings = [],
    payment,
    metadata
  } = bookingDetails;

  const checkInDate = new Date(checkIn).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const checkOutDate = new Date(checkOut).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); color: white; padding: 30px; text-align: center;">
          <div style="width: 60px; height: 60px; background: white; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #1f2937;">
            🏨
          </div>
          <h1 style="font-size: 28px; font-weight: bold; margin: 0;">La Torre Admin</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">New Booking Alert</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <!-- Alert Badge -->
          <div style="background: #3b82f6; color: white; text-align: center; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="margin: 0; font-size: 24px;">🔔 New Booking Received!</h2>
            <p style="margin: 5px 0 0 0; font-size: 16px; opacity: 0.9;">Booking ID: #${id.substring(0, 8).toUpperCase()}</p>
          </div>

          <!-- Customer Information -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">👤 Customer Information</h3>
            <div style="display: grid; gap: 8px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="font-weight: 600; color: #374151;">Name:</span>
                <span style="color: #6b7280;">${guestName}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="font-weight: 600; color: #374151;">Email:</span>
                <span style="color: #6b7280;">${guestEmail}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="font-weight: 600; color: #374151;">Phone:</span>
                <span style="color: #6b7280;">${guestPhone}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span style="font-weight: 600; color: #374151;">Total Guests:</span>
                <span style="color: #6b7280;">${totalGuests}</span>
              </div>
            </div>
          </div>

          <!-- Booking Details -->
          <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">📅 Booking Details</h3>
            <div style="display: grid; gap: 12px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: 600; color: #92400e;">Check-in:</span>
                <span style="color: #a16207;">${checkInDate}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: 600; color: #92400e;">Check-out:</span>
                <span style="color: #a16207;">${checkOutDate}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: 600; color: #92400e;">Room:</span>
                <span style="color: #a16207;">${room.name}</span>
              </div>
            </div>
          </div>

          <!-- Payment Information -->
          <div style="background: #dcfce7; border: 1px solid #22c55e; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">💰 Payment Information</h3>
            <div style="display: grid; gap: 8px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                <span style="color: #166534;">Amount:</span>
                <span style="color: #166534; font-weight: 600;">${payment.currency.toUpperCase()} ${payment.amount.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #bbf7d0;">
                <span style="color: #166534;">Status:</span>
                <span style="color: #166534; font-weight: 600;">${payment.status.toUpperCase()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span style="color: #166534;">Stripe Session:</span>
                <span style="color: #166534; font-size: 12px;">${payment.stripeSessionId}</span>
              </div>
            </div>
          </div>

          ${enhancementBookings.length > 0 ? `
          <!-- Enhancements -->
          <div style="background: #f3e8ff; border: 1px solid #a855f7; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #6b21a8; margin: 0 0 15px 0; font-size: 18px;">✨ Selected Enhancements</h3>
            ${enhancementBookings.map(enhancement => `
              <div style="background: white; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
                <div style="font-weight: 600; color: #6b21a8; font-size: 14px;">${enhancement.enhancement.title}</div>
                <div style="color: #8b5cf6; font-size: 12px;">Qty: ${enhancement.quantity} | ${payment.currency.toUpperCase()} ${(enhancement.enhancement.price * enhancement.quantity).toFixed(2)}</div>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <!-- Action Required -->
          <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 8px; padding: 20px; text-align: center;">
            <h3 style="color: #dc2626; margin: 0 0 10px 0;">⚠️ Action Required</h3>
            <p style="color: #b91c1c; margin: 0;">
              Please prepare for the guest arrival and ensure room availability.<br>
              Contact the guest if any additional information is needed.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            © ${new Date().getFullYear()} La Torre Admin Dashboard<br>
            Booking received at ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  `;

  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: "La Torre Booking System", email: "subashchandraboseravi45@gmail.com" },
        to: [{ email: process.env.ADMIN_EMAIL }], // Replace with actual admin email
        subject: `🔔 New Booking Alert - ${guestName} (#${id.substring(0, 8).toUpperCase()})`,
        htmlContent,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`Admin notification sent for booking ${id}`);
  } catch (error: any) {
    console.error("Error sending admin notification email:", error.response?.data || error.message);
    throw new Error("Failed to send admin notification email");
  }
};