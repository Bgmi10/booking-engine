import dotenv from "dotenv"
import { EmailService } from './emailService';
import Handlebars from 'handlebars';

dotenv.config()

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', function(date: Date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

Handlebars.registerHelper('formatCurrency', function(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
});

Handlebars.registerHelper('calculateNights', function(checkIn: Date, checkOut: Date) {
  return Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
});

Handlebars.registerHelper('eq', function(a: any, b: any) {
  return a === b;
});

Handlebars.registerHelper('add', function(a: number, b: number) {
  return a + b;
});


interface RefundDetail {
  refundId: string;
  refundAmount: number;
  refundCurrency: string;
  refundReason: string;
}

interface BookingDetails {
  id: string
  guestFirstName: string
  guestMiddleName: string
  guestLastName: string
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
  paymentIntent: {
    amount: number
    currency: string
    status: string
    stripeSessionId: string
    taxAmount: number
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
  firstName: string
  middleName?: string
  lastName: string
  email: string
  phone: string
  nationality?: string
  specialRequests?: string
  receiveMarketing?: boolean
}
// Send enhanced booking confirmation email to guest
export const sendConsolidatedBookingConfirmation = async (
  bookings: BookingDetails[],
  customerDetails: CustomerDetails,
  receipt_url: string
) => {
  if (!bookings.length) return;

  const firstBooking = bookings[0];
  const payment = firstBooking.paymentIntent;

  // Get overall date range
  const allCheckInDates = bookings.map((b) => new Date(b.checkIn));
  const allCheckOutDates = bookings.map((b) => new Date(b.checkOut));
  const earliestCheckIn = new Date(Math.min(...allCheckInDates.map((d) => d.getTime())));
  const latestCheckOut = new Date(Math.max(...allCheckOutDates.map((d) => d.getTime())));

  // Check if all bookings have same check-in/out dates
  const allSameCheckIn = allCheckInDates.every(date => 
    date.getTime() === allCheckInDates[0].getTime()
  );
  const allSameCheckOut = allCheckOutDates.every(date => 
    date.getTime() === allCheckOutDates[0].getTime()
  );

  // Process bookings with enhanced data
  const processedBookings = bookings.map(booking => {
    const nights = Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24));
    const roomTotal = booking.room.price * nights;

    // Process enhancements with proper pricing
    const processedEnhancements = (booking.enhancementBookings || []).map(enhancement => {
      let calculatedPrice = enhancement.enhancement.price;
      
      switch (enhancement.enhancement.pricingType) {
        case 'PER_GUEST':
          calculatedPrice = enhancement.enhancement.price * booking.totalGuests;
          break;
        case 'PER_BOOKING':
          calculatedPrice = enhancement.enhancement.price;
          break;
        case 'PER_DAY':
          calculatedPrice = enhancement.enhancement.price * nights;
          break;
      }

      return {
        ...enhancement.enhancement,
        quantity: enhancement.quantity,
        notes: enhancement.notes,
        calculatedPrice,
        pricingDetails: {
          basePrice: enhancement.enhancement.price,
          pricingType: enhancement.enhancement.pricingType,
          nights: enhancement.enhancement.pricingType === 'PER_DAY' ? nights : null,
          guests: enhancement.enhancement.pricingType === 'PER_GUEST' ? booking.totalGuests : null
        }
      };
    });

    const enhancementsTotal = processedEnhancements.reduce((sum: number, enh: any) => sum + enh.calculatedPrice, 0);

    return {
      id: booking.id,
      room: {
        ...booking.room,
        amenities: booking.room.amenities || []
      },
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      formattedCheckIn: Handlebars.helpers.formatDate(booking.checkIn),
      formattedCheckOut: Handlebars.helpers.formatDate(booking.checkOut),
      totalGuests: booking.totalGuests,
      request: booking.request,
      nights,
      basePrice: booking.room.price,
      roomTotal,
      enhancements: processedEnhancements,
      enhancementsTotal,
      total: roomTotal + enhancementsTotal,
      rateOption: booking.metadata?.selectedRateOption
    };
  });

  // Calculate totals
  const totalNights = Math.ceil((latestCheckOut.getTime() - earliestCheckIn.getTime()) / (1000 * 60 * 60 * 24));
  const totalGuests = bookings.reduce((sum, booking) => sum + booking.totalGuests, 0);
  const roomCharges = processedBookings.reduce((sum, booking) => sum + booking.roomTotal, 0);
  const enhancementsTotal = processedBookings.reduce((sum, booking) => sum + booking.enhancementsTotal, 0);
  const subtotal = roomCharges + enhancementsTotal;

  await EmailService.sendEmail({
    to: {
      email: customerDetails.email,
      name: `${customerDetails.firstName} ${customerDetails.lastName}`,
    },
    templateType: 'BOOKING_CONFIRMATION',
    subject: '', // Will be taken from template
    templateData: {
      confirmationId: firstBooking.id,
      customerName: `${customerDetails.firstName} ${customerDetails.middleName || ''} ${customerDetails.lastName}`.trim(),
      showCommonDates: allSameCheckIn && allSameCheckOut,
      checkInDate: Handlebars.helpers.formatDate(earliestCheckIn),
      checkOutDate: Handlebars.helpers.formatDate(latestCheckOut),
      totalNights,
      totalRooms: bookings.length,
      totalGuests,
      amount: payment.amount,
      subtotal,
      roomCharges,
      enhancementsTotal,
      taxAmount: payment.taxAmount.toFixed(2), // 10% tax included in total amount
      currency: payment.currency,
      paymentStatus: payment.status,
      bookings: processedBookings,
      customerDetails: {
        firstName: customerDetails.firstName,
        middleName: customerDetails.middleName,
        lastName: customerDetails.lastName,
        email: customerDetails.email,
        phone: customerDetails.phone,
        nationality: customerDetails.nationality,
        specialRequests: customerDetails.specialRequests,
      },
      // Add receipt URL for PDF download
      pdfReceipt: {
        url: receipt_url,
        text: "View your receipt (includes 10% tax)",
        downloadText: "Download PDF Receipt"
      }
    },
  });
};

export const sendConsolidatedAdminNotification = async (
  bookings: BookingDetails[],
  customerDetails: CustomerDetails,
  stripeSessionId: string
) => {
  if (!bookings.length) return;

  const firstBooking = bookings[0];
  const payment = firstBooking.paymentIntent;
  const totalRooms = bookings.length;
  const totalGuests = bookings.reduce((sum, booking) => sum + booking.totalGuests, 0);

  // Get overall date range
  const allCheckInDates = bookings.map((b) => new Date(b.checkIn));
  const allCheckOutDates = bookings.map((b) => new Date(b.checkOut));
  const earliestCheckIn = new Date(Math.min(...allCheckInDates.map((d) => d.getTime())));
  const latestCheckOut = new Date(Math.max(...allCheckOutDates.map((d) => d.getTime())));

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@latorresullaviafrancigena.com';

  await EmailService.sendEmail({
    to: {
      email: adminEmail,
      name: 'La Torre Admin',
    },
    templateType: 'ADMIN_NOTIFICATION',
    subject: '', // Will be taken from template
    templateData: {
      confirmationId: firstBooking.id,
      customerName: `${customerDetails.firstName} ${customerDetails.middleName || ''} ${customerDetails.lastName}`,
      totalRooms,
      checkInDate: earliestCheckIn.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      checkOutDate: latestCheckOut.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      customerEmail: customerDetails.email,
      customerPhone: customerDetails.phone,
      totalGuests,
      bookings: bookings.map(booking => ({
        id: booking.id,
        room: booking.room,
        checkIn: new Date(booking.checkIn).toLocaleDateString(),
        checkOut: new Date(booking.checkOut).toLocaleDateString(),
        totalGuests: booking.totalGuests,
        request: booking.request,
        nights: Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)),
      })),
      payment: {
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        stripeSessionId,
      },
      customerDetails: {
        firstName: customerDetails.firstName,
        middleName: customerDetails.middleName,
        lastName: customerDetails.lastName,
        email: customerDetails.email,
        phone: customerDetails.phone,
        nationality: customerDetails.nationality,
        specialRequests: customerDetails.specialRequests,
      },
    },
  });
};

export const sendPaymentLinkEmail = async (bookingItems: any) => {
  const { email, name, paymentLink, expiresAt } = bookingItems;

  await EmailService.sendEmail({
    to: {
      email,
      name,
    },
    templateType: 'PAYMENT_LINK',
    subject: '', // Will be taken from template
    templateData: {
      customerName: name,
      paymentLink,
      expiresAt: new Date(expiresAt).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  });
};

export const sendRefundConfirmationEmail = async (
  bookings: any[],
  customerDetails: CustomerDetails,
  refund?: RefundDetail
) => {
  if (!bookings || !bookings.length) return;

  // Use the first booking (or extend for multiple if needed)
  const bookingData = bookings[0];

  // Dates
  const checkIn = new Date(bookingData.checkIn);
  const checkOut = new Date(bookingData.checkOut);
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  // Room
  const room = bookingData.roomDetails;
  const roomTotal = room.price * nights;

  // Enhancements
  const processedEnhancements = (bookingData.selectedEnhancements || []).map((enh: any) => {
    if (!enh || typeof enh.price !== 'number') {
      console.warn('Skipping invalid enhancement booking in cancellation email:', enh);
      return undefined;
    }
    let calculatedPrice = enh.price;
    // If you have pricingType logic, add here
    return {
      ...enh,
      calculatedPrice,
      pricingDetails: {
        basePrice: enh.price,
        pricingType: enh.pricingType || 'PER_BOOKING',
        nights: enh.pricingType === 'PER_DAY' ? nights : null,
        guests: enh.pricingType === 'PER_GUEST' ? bookingData.adults : null
      }
    };
  }).filter(Boolean);
  const enhancementsTotal = processedEnhancements.reduce((sum: number, enh: any) => sum + enh.calculatedPrice, 0);

  // Prepare bookings array for template (even if only one booking)
  const bookingsForTemplate = [{
    id: bookingData.id,
    room: {
      name: room.name,
      description: room.description,
      price: room.price,
      capacity: room.capacity,
      amenities: room.amenities || []
    },
    checkIn: bookingData.checkIn,
    checkOut: bookingData.checkOut,
    totalGuests: bookingData.adults,
    nights,
    roomTotal,
    enhancementsTotal,
    enhancements: processedEnhancements
  }];

  // Prepare template data
  const templateData: any = {
    confirmationId: bookingData.id,
    customerName: `${customerDetails.firstName} ${customerDetails.middleName || ''} ${customerDetails.lastName}`.trim(),
    checkInDate: Handlebars.helpers.formatDate(checkIn),
    checkOutDate: Handlebars.helpers.formatDate(checkOut),
    totalNights: nights,
    totalGuests: bookingData.adults,
    currency: (refund && refund.refundCurrency) ? refund.refundCurrency.toUpperCase() : 'EUR',
    bookings: bookingsForTemplate,
  };

  if (refund) {
    templateData.refund = refund;
  }

  await EmailService.sendEmail({
    to: {
      email: customerDetails.email,
      name: `${customerDetails.firstName} ${customerDetails.lastName}`,
    },
    templateType: 'BOOKING_CANCELLATION',
    subject: '', // Will be taken from template
    templateData,
  });
};