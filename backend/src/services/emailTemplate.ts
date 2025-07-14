import dotenv from "dotenv"
import { EmailService } from './emailService';
import Handlebars from 'handlebars';
import { generateMergedBookingId } from "../utils/helper";

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

Handlebars.registerHelper('or', function() {
  return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
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
    totalAmount: number;
    amount: number
    currency: string
    status: string
    stripeSessionId: string
    taxAmount: number
    confirmationId?: string; // Added for receipt_url handling
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
  receipt_url: string | null,
  voucherInfo?: any
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

  try {
    // Generate confirmation ID using the helper function for consistency
    const bookingIds = bookings.map(booking => booking.id);
    const confirmationId = generateMergedBookingId(bookingIds);
    
    // Debug logging to help identify payment data issues
    console.log('Payment data for email:', {
      totalAmount: payment.totalAmount,
      amount: payment.amount,
      taxAmount: payment.taxAmount,
      currency: payment.currency,
      paymentMethod: (payment as any).paymentMethod
    });
    
    // Prepare email data
    const emailData = {
      confirmationId: confirmationId,
      customerName: `${customerDetails.firstName} ${customerDetails.middleName || ''} ${customerDetails.lastName}`.trim(),
      showCommonDates: allSameCheckIn && allSameCheckOut,
      checkInDate: Handlebars.helpers.formatDate(earliestCheckIn),
      checkOutDate: Handlebars.helpers.formatDate(latestCheckOut),
      totalNights,
      totalRooms: bookings.length,
      totalGuests,
      amount: (payment.totalAmount || payment.amount || 0).toFixed(2),
      subtotal: ((payment.totalAmount || payment.amount || 0) - (payment.taxAmount || 0)).toFixed(2), // Subtotal = Total - Tax
      roomCharges,
      enhancementsTotal,
      taxAmount: (payment.taxAmount || 0).toFixed(2), // 10% tax included in total amount
      currency: payment.currency === 'EUR' ? '€' : (payment.currency || 'EUR').toUpperCase(),
      paymentStatus: payment.status,
      paymentMethod: (payment as any).paymentMethod || 'STRIPE',
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
      ...(voucherInfo && { voucherInfo }),
    };

    // Always generate PDF receipt for all payment methods
    let attachments: any[] = [];
    
    if (receipt_url) {
      try {
        // Fetch PDF receipt and create attachment for all payment methods
        const receiptAttachment = await EmailService.createPdfAttachment(
          receipt_url,
          `receipt-${confirmationId}.pdf`
        );
        attachments = [receiptAttachment];
      } catch (pdfError) {
        console.error('Error creating PDF attachment:', pdfError);
        // Continue without PDF attachment if there's an error
      }
    } else {
      // For cash/bank transfer without Stripe receipt URL, we'll need to generate a custom receipt
      // This could be implemented by creating a custom receipt endpoint
      console.log('No receipt URL available for payment method:', (payment as any).paymentMethod);
    }

    await EmailService.sendEmail({
      to: {
        email: customerDetails.email,
        name: `${customerDetails.firstName} ${customerDetails.lastName}`,
      },
      templateType: 'BOOKING_CONFIRMATION',
      subject: '', // Will be taken from template
      templateData: emailData,
      attachments: attachments
    });

    console.log(`Booking confirmation sent for booking: ${confirmationId} with payment method: ${(payment as any).paymentMethod || 'STRIPE'}`);
  } catch (error) {
    console.error('Error sending booking confirmation:', error);
    throw error;
  }
};

export const sendConsolidatedAdminNotification = async (
  bookings: BookingDetails[],
  customerDetails: CustomerDetails,
  stripeSessionId: string,
  voucherInfo?: any
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

  // Generate confirmation ID using the helper function for consistency
  const bookingIds = bookings.map(booking => booking.id);
  const confirmationId = generateMergedBookingId(bookingIds);

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@latorresullaviafrancigena.com';

  await EmailService.sendEmail({
    to: {
      email: adminEmail,
      name: 'La Torre Admin',
    },
    templateType: 'ADMIN_NOTIFICATION',
    subject: '', // Will be taken from template
    templateData: {
      confirmationId: confirmationId,
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
      ...(voucherInfo && { voucherInfo }),
    },
  });
};

export const sendPaymentLinkEmail = async (bookingItems: any) => {
  const { email, name, paymentLink, expiresAt, bankName, accountName, accountNumber, iban, swiftCode, routingNumber } = bookingItems;

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
      bankName: bankName || '',
      accountName: accountName || '',
      accountNumber: accountNumber || '',
      iban: iban || '',
      swiftCode: swiftCode || '',
      routingNumber: routingNumber || ''
    },
  });
};

export const sendRefundConfirmationEmail = async (
  bookings: any[],
  customerDetails: CustomerDetails,
  refund?: RefundDetail
) => {
  console.log("387", bookings)
  if (!bookings || !bookings.length) return;

  // Use the first booking (or extend for multiple if needed)
  const bookingData = bookings[0];

  // Safely handle dates
  const checkIn = bookingData.checkIn ? new Date(bookingData.checkIn) : new Date();
  const checkOut = bookingData.checkOut ? new Date(bookingData.checkOut) : new Date();
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  // Safely handle room details - check if roomDetails exists and has required properties
  const room = bookingData.roomDetails || {};
  const roomPrice = room.price || 0;
  const roomTotal = roomPrice * nights;

  // Safely handle enhancements
  const processedEnhancements = (bookingData.selectedEnhancements || []).map((enh: any) => {
    if (!enh || typeof enh.price !== 'number') {
      console.warn('Skipping invalid enhancement booking in cancellation email:', enh);
      return undefined;
    }
    
    let calculatedPrice = enh.price;
    const totalGuests = bookingData.adults || bookingData.totalGuests || 1;
    
    // Handle different pricing types
    switch (enh.pricingType) {
      case 'PER_GUEST':
        calculatedPrice = enh.price * totalGuests;
        break;
      case 'PER_DAY':
        calculatedPrice = enh.price * nights;
        break;
      case 'PER_BOOKING':
      default:
        calculatedPrice = enh.price;
        break;
    }
    
    return {
      title: enh.title || enh.name || 'Enhancement',
      description: enh.description || '',
      price: enh.price,
      pricingType: enh.pricingType || 'PER_BOOKING',
      calculatedPrice,
      pricingDetails: {
        basePrice: enh.price,
        pricingType: enh.pricingType || 'PER_BOOKING',
        nights: enh.pricingType === 'PER_DAY' ? nights : null,
        guests: enh.pricingType === 'PER_GUEST' ? totalGuests : null
      }
    };
  }).filter(Boolean);

  const enhancementsTotal = processedEnhancements.reduce((sum: number, enh: any) => sum + enh.calculatedPrice, 0);

  // Prepare bookings array for template (even if only one booking)
  const bookingsForTemplate = [{
    id: bookingData.id || 'N/A',
    room: {
      name: room.name || 'Room',
      description: room.description || 'Room booking',
      price: roomPrice,
      capacity: room.capacity || 1,
      amenities: room.amenities || []
    },
    checkIn: bookingData.checkIn || new Date().toISOString(),
    checkOut: bookingData.checkOut || new Date().toISOString(),
    totalGuests: bookingData.adults || bookingData.totalGuests || 1,
    nights: nights > 0 ? nights : 1,
    basePrice: roomPrice,
    roomTotal,
    enhancementsTotal,
    enhancements: processedEnhancements
  }];

  const templateData: any = {
    confirmationId: bookingData.confirmationId || bookingData.id || 'N/A',
    customerName: `${customerDetails.firstName} ${customerDetails.middleName || ''} ${customerDetails.lastName}`.trim(),
    checkInDate: bookingData.checkIn ? Handlebars.helpers.formatDate(checkIn) : 'N/A',
    checkOutDate: bookingData.checkOut ? Handlebars.helpers.formatDate(checkOut) : 'N/A',
    totalNights: nights > 0 ? nights : 1,
    totalGuests: bookingData.adults || bookingData.totalGuests || 1,
    currency: (refund && refund.refundCurrency) ? (refund.refundCurrency === 'EUR' ? '€' : refund.refundCurrency.toUpperCase()) : '€',
    bookings: bookingsForTemplate,
    paymentMethod: bookingData.paymentMethod || 'STRIPE',
    isManualRefund: bookingData.paymentMethod === 'CASH' || bookingData.paymentMethod === 'BANK_TRANSFER',
  };

  // Only add refund data if it exists
  if (refund) {
    templateData.refund = {
      refundId: refund.refundId,
      refundAmount: refund.refundAmount,
      refundCurrency: refund.refundCurrency.toUpperCase(),
      refundReason: refund.refundReason
    };
  }

  try {
    console.log(customerDetails.email)
    await EmailService.sendEmail({
      to: {
        email: customerDetails.email,
        name: `${customerDetails.firstName} ${customerDetails.lastName}`,
      },
      templateType: 'BOOKING_CANCELLATION',
      subject: '', // Will be taken from template
      templateData,
    });
    
    console.log(`Cancellation/Refund email sent successfully to ${customerDetails.email}`);
  } catch (error) {
    console.error('Error sending cancellation/refund email:', error);
    throw error;
  }
};

export const sendChargeRefundConfirmationEmail = async (
  customer: { guestEmail: string; guestFirstName: string; guestLastName: string },
  charge: { description: string; paidAt: Date | null },
  refund: { id: string; amount: number; currency: string; reason: string | null }
) => {
  try {
    await EmailService.sendEmail({
      to: {
        email: customer.guestEmail,
        name: `${customer.guestFirstName} ${customer.guestLastName}`,
      },
      templateType: 'CHARGE_REFUND_CONFIRMATION',
      subject: '', // Will be taken from template
      templateData: {
        customerName: `${customer.guestFirstName} ${customer.guestLastName}`,
        refundAmount: (refund.amount / 100).toFixed(2),
        refundCurrency: refund.currency.toUpperCase(),
        chargeDescription: charge.description,
        transactionDate: charge.paidAt ? new Date(charge.paidAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }) : 'N/A',
        refundId: refund.id,
        refundReason: refund.reason || 'N/A',
      },
    });
    console.log(`Charge refund confirmation sent successfully to ${customer.guestEmail}`);
  } catch (error) {
    console.error('Error sending charge refund confirmation email:', error);
    throw error;
  }
};

export const sendChargeConfirmationEmail = async (
  customer: { 
    guestEmail: string; 
    guestFirstName: string; 
    guestLastName: string;
    guestPhone?: string;
    guestNationality?: string;
  },
  charge: { 
    id: string; 
    amount: number; 
    description: string; 
    currency: string; 
    createdAt: Date;
  },
  paymentLink: string,
  expiresAt: Date
) => {
  try {
    await EmailService.sendEmail({
      to: {
        email: customer.guestEmail,
        name: `${customer.guestFirstName} ${customer.guestLastName}`,
      },
      templateType: 'CHARGE_CONFIRMATION',
      subject: '', // Will be taken from template
      templateData: {
        chargeId: charge.id,
        customerName: `${customer.guestFirstName} ${customer.guestLastName}`,
        customerEmail: customer.guestEmail,
        customerPhone: customer.guestPhone || null,
        customerNationality: customer.guestNationality || null,
        amount: (charge.amount / 100).toFixed(2), // Convert from cents to dollars
        currency: charge.currency.toUpperCase(),
        description: charge.description,
        chargeDate: new Date(charge.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
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
    console.log(`Charge confirmation sent successfully to ${customer.guestEmail}`);
  } catch (error) {
    console.error('Error sending charge confirmation email:', error);
    throw error;
  }
};