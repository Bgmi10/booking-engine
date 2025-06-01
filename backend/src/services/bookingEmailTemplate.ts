import axios from "axios"
import dotenv from "dotenv"

dotenv.config()

interface BookingDetails {
  id: string
  guestName: string
  guestEmail: string
  guestPhone: string
  guestNationality?: string
  totalGuests: number
  checkIn: Date
  checkOut: Date
  status: string
  request?: string
  room: {
    id: string
    name: string
    description: string
    amenities: string[]
    price: number
    capacity: number
    images?: { url: string }[]
  }
  enhancementBookings?: {
    id: string
    quantity: number
    notes?: string
    enhancement: {
      title: string
      description: string
      price: number
      pricingType: string
    }
  }[]
  payment: {
    amount: number
    currency: string
    status: string
    stripeSessionId: string
  }
  metadata?: {
    selectedRateOption?: any
    promotionCode?: string
    totalPrice: number
    rooms: number
    receiveMarketing?: boolean
  }
}

interface CustomerDetails {
  name: string
  email: string
  phone: string
  nationality?: string
  specialRequests?: string
  receiveMarketing?: boolean
}

// Enhanced professional email styles
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
}

// Generate professional email header
const generateEmailHeader = () => {
  return `
    <div style="background: linear-gradient(135deg, ${emailStyles.primaryColor} 0%, #374151 100%); padding: 32px 24px; text-align: center;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; background: white; border-radius: 16px; margin-bottom: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
          <div style="font-size: 32px; font-weight: 700; color: ${emailStyles.primaryColor}; font-family: ${emailStyles.fontFamily};">LT</div>
        </div>
        <h1 style="margin: 0 0 8px 0; font-size: 32px; color: white; font-weight: 700; font-family: ${emailStyles.fontFamily}; letter-spacing: -0.5px;">La Torre sulla via Francigena</h1>
        <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 16px; font-family: ${emailStyles.fontFamily}; font-weight: 400;">Your Historic Retreat Along the Francigena Way</p>
      </div>
    </div>
  `
}

// Generate professional email footer
const generateEmailFooter = () => {
  return `
    <div style="background: ${emailStyles.backgroundColor}; padding: 40px 24px; border-top: 1px solid ${emailStyles.borderColor};">
      <div style="max-width: 600px; margin: 0 auto; text-align: center;">
        <div style="margin-bottom: 32px;">
          <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 16px 0; font-size: 20px; font-weight: 600; font-family: ${emailStyles.fontFamily};">Contact Information</h3>
          <div style="color: ${emailStyles.secondaryColor}; font-size: 15px; line-height: 1.8; font-family: ${emailStyles.fontFamily};">
            <div style="margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span style="font-size: 16px;">📍</span>
              <span>Via Francigena, Historic Center</span>
            </div>
            <div style="margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span style="font-size: 16px;">📞</span>
              <span>+39 123 456 7890</span>
            </div>
            <div style="margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span style="font-size: 16px;">📧</span>
              <span>info@latorresullaviafrancigena.com</span>
            </div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span style="font-size: 16px;">🌐</span>
              <span>www.latorresullaviafrancigena.com</span>
            </div>
          </div>
        </div>
        
        <div style="border-top: 1px solid ${emailStyles.borderColor}; padding-top: 24px;">
        <div style="text-align: center; padding: 24px;">
           <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 40px"; margin-bottom: 24px;" />
        </div>
          <p style="margin: 0 0 16px 0; font-size: 13px; color: ${emailStyles.secondaryColor}; line-height: 1.6; font-family: ${emailStyles.fontFamily};">
            © ${new Date().getFullYear()} La Torre sulla via Francigena. All rights reserved.<br>
            You received this email because you made a booking with us.
          </p>
          <div style="display: inline-flex; gap: 16px;">
            <a href="https://www.latorre.farm/terms" style="color: ${emailStyles.secondaryColor}; text-decoration: none; font-size: 13px; font-family: ${emailStyles.fontFamily}; padding: 8px 16px; border: 1px solid ${emailStyles.borderColor}; border-radius: 6px; transition: all 0.2s;">Terms & Conditions</a>
            <a href="https://www.latorre.farm/privacy" style="color: ${emailStyles.secondaryColor}; text-decoration: none; font-size: 13px; font-family: ${emailStyles.fontFamily}; padding: 8px 16px; border: 1px solid ${emailStyles.borderColor}; border-radius: 6px; transition: all 0.2s;">Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  `
}

// Enhanced card component
const createCard = (content: string, backgroundColor = "white", borderColor: string = emailStyles.borderColor) => {
  return `
    <div style="background: ${backgroundColor}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      ${content}
    </div>
  `
}

// Enhanced section header
const createSectionHeader = (icon: string, title: string, color: string = emailStyles.primaryColor) => {
  return `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
      <div style="font-size: 24px;">${icon}</div>
      <h3 style="color: ${color}; margin: 0; font-size: 20px; font-weight: 600; font-family: ${emailStyles.fontFamily};">${title}</h3>
    </div>
  `
}

// Enhanced status badge
const createStatusBadge = (status: string, type: "success" | "warning" | "info" = "success") => {
  const colors = {
    success: { bg: "#d1fae5", text: emailStyles.successColor, border: "#a7f3d0" },
    warning: { bg: "#fef3c7", text: emailStyles.warningColor, border: "#fde68a" },
    info: { bg: "#dbeafe", text: emailStyles.infoColor, border: "#bfdbfe" },
  }

  const color = colors[type]

  return `
    <span style="background: ${color.bg}; color: ${color.text}; border: 1px solid ${color.border}; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; font-family: ${emailStyles.fontFamily}; display: inline-block;">
      ${status}
    </span>
  `
}

// Send enhanced booking confirmation email to guest
export const sendConsolidatedBookingConfirmation = async (
  bookings: BookingDetails[],
  customerDetails: CustomerDetails,
) => {
  if (!bookings.length) return

  const firstBooking = bookings[0]
  const payment = firstBooking.payment

  // Get overall date range
  const allCheckInDates = bookings.map((b) => new Date(b.checkIn))
  const allCheckOutDates = bookings.map((b) => new Date(b.checkOut))
  const earliestCheckIn = new Date(Math.min(...allCheckInDates.map((d) => d.getTime())))
  const latestCheckOut = new Date(Math.max(...allCheckOutDates.map((d) => d.getTime())))

  const checkInDate = earliestCheckIn.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const checkOutDate = latestCheckOut.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const totalNights = Math.ceil((latestCheckOut.getTime() - earliestCheckIn.getTime()) / (1000 * 60 * 60 * 24))
  const totalGuests = bookings.reduce((sum, booking) => sum + booking.totalGuests, 0)
  const totalRooms = bookings.length

  // Collect all enhancements
  const allEnhancements = bookings.flatMap((booking) => booking.enhancementBookings || [])
  const enhancementTotal = allEnhancements.reduce((total, enhancement) => {
    return total + enhancement.enhancement.price * enhancement.quantity
  }, 0)

  // Generate booking confirmation ID from first booking
  const confirmationId = firstBooking.id.substring(0, 8).toUpperCase()

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title> Booking Confirmation - La Torre</title>
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
        <!-- Main Content -->
        <div style="text-align: center; padding: 2px;">
          <img src="https://booking-engine-seven.vercel.app/assets/logo.png" alt="La Torre Logo" style="width: 70px"; margin-bottom: 24px;" />
        </div>
        <div style="padding: 40px 32px;" class="mobile-padding">
          
          <!-- Confirmation Hero -->
          <div style="background: linear-gradient(135deg, ${emailStyles.successColor} 0%, #059669 100%); color: white; text-align: center; padding: 32px; border-radius: 16px; margin-bottom: 32px; box-shadow: 0 8px 32px rgba(16, 185, 129, 0.2);">
            <div style="font-size: 44px; margin-bottom: 16px; line-height: 1;">✅</div>
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700; font-family: ${emailStyles.fontFamily};" class="mobile-title">Booking Confirmed!</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.95; font-family: ${emailStyles.fontFamily};">
              ${totalRooms} ${totalRooms === 1 ? "Room" : "Rooms"} Reserved • Welcome to La Torre
            </p>
          </div>

          <!-- Personal Greeting -->
          <div style="margin-bottom: 32px;">
            <h3 style="color: ${emailStyles.primaryColor}; font-size: 24px; margin: 0 0 12px 0; font-weight: 600; font-family: ${emailStyles.fontFamily};">Dear ${customerDetails.name},</h3>
            <p style="color: ${emailStyles.secondaryColor}; margin: 0; font-size: 16px; line-height: 1.7; font-family: ${emailStyles.fontFamily};">
              Thank you for choosing La Torre sulla via Francigena for your stay. We're delighted to confirm your reservation and look forward to welcoming you !.
            </p>
          </div>

          <!-- Booking Summary Card -->
          ${createCard(`
            ${createSectionHeader("📋", "Booking Summary")}
            <div style="background: ${emailStyles.backgroundColor}; border-radius: 8px; padding: 20px;">
              <div style="display: grid; gap: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid ${emailStyles.borderColor};">
                  <span style="font-weight: 600; color: ${emailStyles.secondaryColor}; font-family: ${emailStyles.fontFamily};">Confirmation ID:</span>
                  <span style="color: ${emailStyles.primaryColor}; font-weight: 700; font-family: 'Monaco', 'Menlo', monospace; background: white; padding: 6px 12px; border-radius: 6px; border: 1px solid ${emailStyles.borderColor};">#${confirmationId}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid ${emailStyles.borderColor};">
                  <span style="font-weight: 600; color: ${emailStyles.secondaryColor}; font-family: ${emailStyles.fontFamily};">Guest Name:</span>
                  <span style="color: ${emailStyles.primaryColor}; font-weight: 600; font-family: ${emailStyles.fontFamily};">${customerDetails.name}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid ${emailStyles.borderColor};">
                  <span style="font-weight: 600; color: ${emailStyles.secondaryColor}; font-family: ${emailStyles.fontFamily};">Total Rooms:</span>
                  <span style="color: ${emailStyles.primaryColor}; font-weight: 600; font-family: ${emailStyles.fontFamily};">${totalRooms}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid ${emailStyles.borderColor};">
                  <span style="font-weight: 600; color: ${emailStyles.secondaryColor}; font-family: ${emailStyles.fontFamily};">Total Guests:</span>
                  <span style="color: ${emailStyles.primaryColor}; font-weight: 600; font-family: ${emailStyles.fontFamily};">${totalGuests}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0;">
                  <span style="font-weight: 600; color: ${emailStyles.secondaryColor}; font-family: ${emailStyles.fontFamily};">Status:</span>
                  ${createStatusBadge(firstBooking.status.toUpperCase(), "success")}
                </div>
              </div>
            </div>
          `)}

          <!-- Stay Details Card -->
          ${createCard(
            `
            ${createSectionHeader("🗓️", "Your Stay Details", emailStyles.warningColor)}
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 24px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;" class="mobile-grid">
                <div style="text-align: center; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <div style="font-weight: 700; color: #92400e; font-size: 16px; margin-bottom: 8px; font-family: ${emailStyles.fontFamily};">Check-in</div>
                  <div style="color: #a16207; font-size: 15px; font-weight: 600; font-family: ${emailStyles.fontFamily}; margin-bottom: 4px;">${checkInDate}</div>
                  <div style="color: #a16207; font-size: 13px; font-family: ${emailStyles.fontFamily};">from 3:00 PM</div>
                </div>
                <div style="text-align: center; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <div style="font-weight: 700; color: #92400e; font-size: 16px; margin-bottom: 8px; font-family: ${emailStyles.fontFamily};">Check-out</div>
                  <div style="color: #a16207; font-size: 15px; font-weight: 600; font-family: ${emailStyles.fontFamily}; margin-bottom: 4px;">${checkOutDate}</div>
                  <div style="color: #a16207; font-size: 13px; font-family: ${emailStyles.fontFamily};">until 11:00 AM</div>
                </div>
              </div>
              <div style="text-align: center; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <span style="font-weight: 700; color: #92400e; font-size: 24px; font-family: ${emailStyles.fontFamily};">${totalNights}</span>
                <span style="color: #a16207; font-size: 16px; margin-left: 8px; font-family: ${emailStyles.fontFamily};">${totalNights === 1 ? "Night" : "Nights"} of Historic Hospitality</span>
              </div>
            </div>
          `,
            "#fef3c7",
            "#f59e0b",
          )}

          <!-- Room Details -->
          ${createCard(
            `
            ${createSectionHeader("🏨", "Your Accommodations", emailStyles.infoColor)}
            ${bookings
              .map((booking, index) => {
                const nights = Math.ceil(
                  (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24),
                )
                return `
                <div style="background: white; padding: 24px; border-radius: 12px; margin-bottom: ${index === bookings.length - 1 ? "0" : "20px"}; border-left: 4px solid ${emailStyles.infoColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <div style="flex: 1;">
                      <h4 style="color: ${emailStyles.primaryColor}; margin: 0 0 8px 0; font-size: 20px; font-weight: 700; font-family: ${emailStyles.fontFamily};">${booking.room.name}</h4>
                      <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; font-family: ${emailStyles.fontFamily};">${booking.room.description}</p>
                      <div style="background: #f0f9ff; padding: 12px; border-radius: 8px; border: 1px solid #bfdbfe;">
                        <div style="color: ${emailStyles.infoColor}; font-size: 14px; font-family: ${emailStyles.fontFamily}; line-height: 1.5;">
                          <div style="margin-bottom: 4px;"><strong>Booking ID:</strong> #${booking.id.substring(0, 8).toUpperCase()}</div>
                          <div style="margin-bottom: 4px;"><strong>Dates:</strong> ${new Date(booking.checkIn).toLocaleDateString()} - ${new Date(booking.checkOut).toLocaleDateString()}</div>
                          <div><strong>Details:</strong> ${nights} nights • ${booking.totalGuests} guests • Capacity: ${booking.room.capacity}</div>
                        </div>
                      </div>
                    </div>
                    <div style="text-align: right; margin-left: 24px;">
                      <div style="font-weight: 700; font-size: 20px; color: ${emailStyles.primaryColor}; font-family: ${emailStyles.fontFamily};">${payment.currency.toUpperCase()} ${booking.room.price}</div>
                      <div style="font-size: 13px; color: ${emailStyles.secondaryColor}; font-family: ${emailStyles.fontFamily};">per night</div>
                    </div>
                  </div>
                  ${
                    booking.room.amenities && booking.room.amenities.length > 0
                      ? `
                  <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f9ff;">
                    <strong style="color: ${emailStyles.primaryColor}; font-size: 14px; display: block; margin-bottom: 12px; font-family: ${emailStyles.fontFamily};">Room Amenities:</strong>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                      ${booking.room.amenities
                        .slice(0, 6)
                        .map(
                          (amenity) =>
                            `<span style="background: ${emailStyles.infoColor}; color: white; padding: 6px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; font-family: ${emailStyles.fontFamily};">${amenity}</span>`,
                        )
                        .join("")}
                      ${booking.room.amenities.length > 6 ? `<span style="color: ${emailStyles.infoColor}; font-size: 12px; padding: 6px 12px; font-family: ${emailStyles.fontFamily};">+${booking.room.amenities.length - 6} more</span>` : ""}
                    </div>
                  </div>
                  `
                      : ""
                  }
                  ${
                    booking.request
                      ? `
                  <div style="margin-top: 16px; padding: 16px; background: #fef7cd; border-radius: 8px; border-left: 4px solid ${emailStyles.warningColor};">
                    <strong style="color: #92400e; font-size: 13px; display: block; margin-bottom: 6px; font-family: ${emailStyles.fontFamily};">Special Request:</strong>
                    <p style="color: #a16207; margin: 0; font-size: 14px; font-style: italic; font-family: ${emailStyles.fontFamily};">"${booking.request}"</p>
                  </div>
                  `
                      : ""
                  }
                </div>
              `
              })
              .join("")}
          `,
            "#f0f9ff",
            emailStyles.infoColor,
          )}

          <!-- Enhancements -->
          ${
            allEnhancements.length > 0
              ? createCard(
                  `
            ${createSectionHeader("✨", "Selected Enhancements", "#a855f7")}
            ${allEnhancements
              .map(
                (enhancement) => `
              <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 16px; border-left: 4px solid #a855f7; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <div style="flex: 1;">
                    <h4 style="color: #6b21a8; margin: 0 0 8px 0; font-size: 18px; font-weight: 700; font-family: ${emailStyles.fontFamily};">${enhancement.enhancement.title}</h4>
                    <p style="color: #7c3aed; margin: 0 0 12px 0; font-size: 14px; line-height: 1.5; font-family: ${emailStyles.fontFamily};">${enhancement.enhancement.description}</p>
                    <div style="background: #f3e8ff; padding: 8px 12px; border-radius: 6px; border: 1px solid #e9d5ff;">
                      <div style="color: #8b5cf6; font-size: 13px; font-family: ${emailStyles.fontFamily};">
                        <strong>Quantity:</strong> ${enhancement.quantity} • <strong>Type:</strong> ${enhancement.enhancement.pricingType.replace("_", " ")}
                        ${enhancement.notes ? `<br><strong>Notes:</strong> ${enhancement.notes}` : ""}
                      </div>
                    </div>
                  </div>
                  <div style="text-align: right; margin-left: 24px;">
                    <div style="font-weight: 700; color: #6b21a8; font-size: 18px; font-family: ${emailStyles.fontFamily};">${payment.currency.toUpperCase()} ${(enhancement.enhancement.price * enhancement.quantity).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            `,
              )
              .join("")}
          `,
                  "#f3e8ff",
                  "#a855f7",
                )
              : ""
          }

          <!-- Special Requests -->
          ${
            customerDetails.specialRequests
              ? createCard(
                  `
            ${createSectionHeader("💬", "Your Special Requests", emailStyles.warningColor)}
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #fde68a;">
              <p style="color: #a16207; margin: 0; font-style: italic; font-size: 15px; line-height: 1.6; font-family: ${emailStyles.fontFamily};">"${customerDetails.specialRequests}"</p>
            </div>
          `,
                  "#fef7cd",
                  emailStyles.warningColor,
                )
              : ""
          }

          <!-- Payment Summary -->
          ${createCard(
            `
            ${createSectionHeader("💳", "Payment Summary", emailStyles.successColor)}
            <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 12px; padding: 24px;">
              <div style="background: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600; font-family: ${emailStyles.fontFamily};">Rooms (${totalRooms} rooms, ${totalNights} nights):</span>
                    <span style="color: #166534; font-weight: 600; font-family: ${emailStyles.fontFamily};">${payment.currency.toUpperCase()} ${(payment.amount - enhancementTotal).toFixed(2)}</span>
                  </div>
                  ${
                    allEnhancements.length > 0
                      ? `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #bbf7d0;">
                    <span style="color: #166534; font-weight: 600; font-family: ${emailStyles.fontFamily};">Enhancements (${allEnhancements.length} items):</span>
                    <span style="color: #166534; font-weight: 600; font-family: ${emailStyles.fontFamily};">${payment.currency.toUpperCase()} ${enhancementTotal.toFixed(2)}</span>
                  </div>
                  `
                      : ""
                  }
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 0; font-weight: 700; font-size: 24px; color: #166534; border-top: 2px solid ${emailStyles.successColor};">
                    <span style="font-family: ${emailStyles.fontFamily};">Total Paid:</span>
                    <span style="font-family: ${emailStyles.fontFamily};">${payment.currency.toUpperCase()} ${payment.amount.toFixed(2)}</span>
                  </div>
                  <div style="text-align: center; margin-top: 16px;">
                    ${createStatusBadge(`Payment ${payment.status.toUpperCase()}`, "success")}
                  </div>
                </div>
              </div>
            </div>
          `,
            "#dcfce7",
            emailStyles.successColor,
          )}

          <!-- Important Information -->
          ${createCard(
            `
            ${createSectionHeader("ℹ️", "Important Information", emailStyles.errorColor)}
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #fecaca;">
              <ul style="color: #b91c1c; margin: 0; padding-left: 20px; line-height: 2; font-family: ${emailStyles.fontFamily};">
                <li><strong>Check-in:</strong> 3:00 PM onwards</li>
                <li><strong>Check-out:</strong> 11:00 AM</li>
                <li><strong>ID Required:</strong> Please bring valid identification</li>
                <li><strong>Changes:</strong> Contact us 24 hours in advance for modifications</li>
                <li><strong>Confirmation:</strong> All ${totalRooms} rooms are secured under this reservation</li>
                <li><strong>Parking:</strong> Complimentary parking available on-site</li>
              </ul>
            </div>
          `,
            "#fef2f2",
            emailStyles.errorColor,
          )}

          <!-- What to Expect -->
          ${createCard(
            `
            ${createSectionHeader("🌟", "What to Expect", emailStyles.infoColor)}
            <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #bfdbfe;">
              <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 20px 0; line-height: 1.7; font-size: 16px; font-family: ${emailStyles.fontFamily};">
                La Torre sulla via Francigena offers a unique blend of historic charm and modern comfort. Our carefully restored tower provides an authentic experience along the ancient pilgrimage route, with stunning views of the surrounding countryside.
              </p>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
                <div style="text-align: center; padding: 16px; background: #f0f9ff; border-radius: 8px;">
                  <div style="font-size: 32px; margin-bottom: 8px;">🏰</div>
                  <div style="color: ${emailStyles.primaryColor}; font-weight: 600; font-size: 15px; font-family: ${emailStyles.fontFamily};">Historic Architecture</div>
                </div>
                <div style="text-align: center; padding: 16px; background: #f0f9ff; border-radius: 8px;">
                  <div style="font-size: 32px; margin-bottom: 8px;">🥾</div>
                  <div style="color: ${emailStyles.primaryColor}; font-weight: 600; font-size: 15px; font-family: ${emailStyles.fontFamily};">Pilgrimage Route</div>
                </div>
                <div style="text-align: center; padding: 16px; background: #f0f9ff; border-radius: 8px;">
                  <div style="font-size: 32px; margin-bottom: 8px;">🌄</div>
                  <div style="color: ${emailStyles.primaryColor}; font-weight: 600; font-size: 15px; font-family: ${emailStyles.fontFamily};">Scenic Views</div>
                </div>
              </div>
            </div>
          `,
            "#f0f9ff",
            emailStyles.infoColor,
          )}

          <!-- Final Message -->
          <div style="text-align: center; padding: 32px 24px; background: linear-gradient(135deg, ${emailStyles.backgroundColor} 0%, #f1f5f9 100%); border-radius: 16px; margin-bottom: 24px; border: 1px solid ${emailStyles.borderColor};">
            <h3 style="color: ${emailStyles.primaryColor}; margin: 0 0 16px 0; font-size: 26px; font-weight: 700; font-family: ${emailStyles.fontFamily};">We Can't Wait to Welcome You!</h3>
            <p style="color: ${emailStyles.secondaryColor}; margin: 0 0 24px 0; font-size: 17px; line-height: 1.7; font-family: ${emailStyles.fontFamily};">
              Your journey along the Via Francigena begins with us. If you have any questions or need assistance, 
              please don't hesitate to contact our team.
            </p>
            <div style="color: ${emailStyles.infoColor}; font-size: 18px; font-weight: 600; font-family: ${emailStyles.fontFamily};">
              Safe travels, and see you soon! 🌟
            </div>
          </div>
        </div>

        ${generateEmailFooter()}
      </div>
    </body>
    </html>
  `

  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: "La Torre sulla via Francigena", email: "subashchandraboseravi45@gmail.com" },
        to: [{ email: customerDetails.email, name: customerDetails.name }],
        subject: `Booking Confirmed - Welcome to La Torre! (#${confirmationId})`,
        htmlContent,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      },
    )

    console.log(`Enhanced booking confirmation sent to ${customerDetails.email} for ${totalRooms} rooms`)
  } catch (error: any) {
    console.error("Error sending booking confirmation email:", error.response?.data || error.message)
    throw new Error("Failed to send booking confirmation email")
  }
}

export const sendConsolidatedAdminNotification = async (
    bookings: BookingDetails[],
    customerDetails: CustomerDetails
  ) => {
    if (!bookings.length) return;
  
    const firstBooking = bookings[0];
    const payment = firstBooking.payment;
    const totalRooms = bookings.length;
    const totalGuests = bookings.reduce((sum, booking) => sum + booking.totalGuests, 0);
    const confirmationId = firstBooking.id.substring(0, 8).toUpperCase();
  
    // Get overall date range
    const allCheckInDates = bookings.map(b => new Date(b.checkIn));
    const allCheckOutDates = bookings.map(b => new Date(b.checkOut));
    const earliestCheckIn = new Date(Math.min(...allCheckInDates.map(d => d.getTime())));
    const latestCheckOut = new Date(Math.max(...allCheckOutDates.map(d => d.getTime())));
  
    const checkInDate = earliestCheckIn.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  
    const checkOutDate = latestCheckOut.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  
    const totalNights = Math.ceil((latestCheckOut.getTime() - earliestCheckIn.getTime()) / (1000 * 60 * 60 * 24));
    const allEnhancements = bookings.flatMap(booking => booking.enhancementBookings || []);
  
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Alert - New Booking</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; line-height: 1.6;">
        <div style="max-width: 700px; margin: 0 auto; background: white; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          
          <!-- Admin Header -->
          <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); color: white; padding: 30px; text-align: center;">
            <div style="width: 60px; height: 60px; background: white; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #1f2937;">
              🏰
            </div>
            <h1 style="font-size: 28px; font-weight: bold; margin: 0;">La Torre Admin System</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 16px;">New Multi-Room Booking Alert</p>
          </div>
  
          <!-- Content -->
          <div style="padding: 30px;">
            <!-- Alert Badge -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-align: center; padding: 25px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);">
              <div style="font-size: 48px; margin-bottom: 10px;">🔔</div>
              <h2 style="margin: 0; font-size: 24px; font-weight: 700;">New Multi-Room Booking</h2>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">
                ${totalRooms} rooms booked by ${customerDetails.name}
              </p>
            </div>
  
            <!-- Customer Details -->
            <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
              <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 18px; display: flex; align-items: center; gap: 10px;">
                👤 Customer Information
              </h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 12px;">
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-weight: 600; color: #374151;">Name:</span>
                    <span style="color: #1f2937; font-weight: 600;">${customerDetails.name}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-weight: 600; color: #374151;">Email:</span>
                    <span style="color: #1f2937;">${customerDetails.email}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-weight: 600; color: #374151;">Phone:</span>
                    <span style="color: #1f2937;">${customerDetails.phone}</span>
                  </div>
                  ${customerDetails.nationality ? `
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-weight: 600; color: #374151;">Nationality:</span>
                    <span style="color: #1f2937;">${customerDetails.nationality}</span>
                  </div>
                  ` : ''}
                  <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                    <span style="font-weight: 600; color: #374151;">Total Guests:</span>
                    <span style="color: #1f2937; font-weight: 600;">${totalGuests}</span>
                  </div>
                </div>
              </div>
            </div>
  
            <!-- Booking Summary -->
            <div style="background: #fef3c7; border: 2px solid #fbbf24; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
              <h3 style="color: #92400e; margin: 0 0 20px 0; font-size: 18px; display: flex; align-items: center; gap: 10px;">
                📋 Booking Summary
              </h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 12px;">
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #fde68a;">
                    <span style="font-weight: 600; color: #92400e;">Confirmation ID:</span>
                    <span style="color: #a16207; font-weight: 700; font-family: monospace; background: #fef3c7; padding: 4px 8px; border-radius: 4px;">#${confirmationId}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #fde68a;">
                    <span style="font-weight: 600; color: #92400e;">Check-in:</span>
                    <span style="color: #a16207; font-weight: 600;">${checkInDate}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #fde68a;">
                    <span style="font-weight: 600; color: #92400e;">Check-out:</span>
                    <span style="color: #a16207; font-weight: 600;">${checkOutDate}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #fde68a;">
                    <span style="font-weight: 600; color: #92400e;">Total Nights:</span>
                    <span style="color: #a16207; font-weight: 600;">${totalNights}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                    <span style="font-weight: 600; color: #92400e;">Total Rooms:</span>
                    <span style="color: #a16207; font-weight: 700; font-size: 18px;">${totalRooms}</span>
                  </div>
                </div>
              </div>
            </div>
  
            <!-- Room Breakdown -->
            <div style="background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
              <h3 style="color: #0c4a6e; margin: 0 0 20px 0; font-size: 18px; display: flex; align-items: center; gap: 10px;">
                🏨 Room Breakdown
              </h3>
              ${bookings.map((booking, index) => {
                const nights = Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24));
                return `
                  <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: ${index === bookings.length - 1 ? '0' : '15px'}; border-left: 5px solid #0ea5e9; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                      <div style="flex: 1;">
                        <h4 style="color: #0c4a6e; margin: 0 0 5px 0; font-size: 16px; font-weight: 700;">${booking.room.name}</h4>
                        <div style="color: #0284c7; font-size: 13px; background: #e0f2fe; padding: 8px; border-radius: 6px;">
                          <div style="margin-bottom: 4px;"><strong>Booking ID:</strong> #${booking.id.substring(0, 8).toUpperCase()}</div>
                          <div style="margin-bottom: 4px;"><strong>Dates:</strong> ${new Date(booking.checkIn).toLocaleDateString()} - ${new Date(booking.checkOut).toLocaleDateString()}</div>
                          <div><strong>Details:</strong> ${nights} nights • ${booking.totalGuests} guests • Capacity: ${booking.room.capacity}</div>
                        </div>
                      </div>
                      <div style="text-align: right; margin-left: 20px;">
                        <div style="font-weight: 700; font-size: 16px; color: #0c4a6e;">${payment.currency.toUpperCase()} ${booking.room.price}</div>
                        <div style="font-size: 12px; color: #0284c7;">per night</div>
                      </div>
                    </div>
                    ${booking.request ? `
                    <div style="margin-top: 10px; padding: 10px; background: #fef7cd; border-radius: 6px; border-left: 3px solid #f59e0b;">
                      <strong style="color: #92400e; font-size: 12px;">Special Request:</strong>
                      <p style="color: #a16207; margin: 2px 0 0 0; font-size: 12px; font-style: italic;">"${booking.request}"</p>
                    </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
  
            <!-- Action Items -->
            <div style="background: #fef2f2; border: 2px solid #f87171; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
              <h3 style="color: #dc2626; margin: 0 0 20px 0; font-size: 18px; display: flex; align-items: center; gap: 10px;">
                ⚡ Action Required
              </h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <ul style="color: #b91c1c; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li><strong>Room Preparation:</strong> Prepare ${totalRooms} rooms for check-in on ${checkInDate}</li>
                  <li><strong>Special Requests:</strong> Review and arrange any special requests</li>
                  <li><strong>Enhancements:</strong> Coordinate ${allEnhancements.length} enhancement bookings</li>
                  <li><strong>Guest Communication:</strong> Send welcome package if applicable</li>
                  <li><strong>PMS Update:</strong> Update property management system with guest preferences</li>
                  <li><strong>Staff Briefing:</strong> Brief front desk team on multi-room arrival</li>
                </ul>
              </div>
            </div>
  
            <!-- Payment Information -->
            <div style="background: #dcfce7; border: 2px solid #22c55e; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
              <h3 style="color: #166534; margin: 0 0 20px 0; font-size: 18px; display: flex; align-items: center; gap: 10px;">
                💳 Payment Information
              </h3>
              <div style="background: white; border-radius: 8px; padding: 20px;">
                <div style="display: grid; gap: 12px;">
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #bbf7d0;">
                    <span style="font-weight: 600; color: #166534;">Total Amount:</span>
                    <span style="color: #166534; font-weight: 700; font-size: 18px;">${payment.currency.toUpperCase()} ${payment.amount.toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #bbf7d0;">
                    <span style="font-weight: 600; color: #166534;">Payment Status:</span>
                    <span style="color: #166534; font-weight: 700; background: #d1fae5; padding: 4px 12px; border-radius: 20px;">${payment.status.toUpperCase()}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                    <span style="font-weight: 600; color: #166534;">Stripe Session ID:</span>
                    <span style="color: #166534; font-family: monospace; font-size: 12px; background: #f0fdf4; padding: 4px 8px; border-radius: 4px;">${payment.stripeSessionId}</span>
                  </div>
                </div>
              </div>
            </div>
  
            <!-- Contact Information -->
            <div style="text-align: center; padding: 25px; background: #f8fafc; border-radius: 12px;">
              <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">Customer Contact Details</h3>
              <div style="color: #3b82f6; font-size: 16px; font-weight: 600; line-height: 1.8;">
                📞 ${customerDetails.phone}<br>
                📧 ${customerDetails.email}
              </div>
            </div>
          </div>
  
          <!-- Admin Footer -->
          <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
              © ${new Date().getFullYear()} La Torre Admin System<br>
              Multi-room booking notification - ${new Date().toLocaleString()}<br>
              <strong>Confirmation ID: #${confirmationId}</strong>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  
    try {
      const adminEmail = process.env.ADMIN_EMAIL || "admin@latorresullaviafrancigena.com";
      
      await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
          sender: { name: "La Torre Booking System", email: "subashchandraboseravi45@gmail.com" },
          to: [{ email: adminEmail, name: "La Torre Admin" }],
          subject: `🔔 URGENT: ${totalRooms} Room Booking Alert - ${customerDetails.name} (#${confirmationId})`,
          htmlContent,
        },
        {
          headers: {
            "api-key": process.env.BREVO_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );
  
      console.log(`Professional admin notification sent for multi-room booking: ${totalRooms} rooms, confirmation #${confirmationId}`);
    } catch (error: any) {
      console.error("Error sending admin notification email:", error.response?.data || error.message);
      throw new Error("Failed to send admin notification email");
    }
  };
