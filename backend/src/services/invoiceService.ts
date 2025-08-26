import prisma from '../prisma';
import { generatePDF } from '../utils/pdfGenerator';
import { EmailService } from './emailService';
import { format } from 'date-fns';

export class InvoiceService {
  /**
   * Generates an invoice PDF for a payment intent
   * @param paymentIntentId - The payment intent ID
   * @param replacementMap - Optional map of item replacements for tax optimization
   * @returns PDF buffer
   */
  async generateInvoice(paymentIntentId: string, replacementMap?: Record<string, string>) {
    // Get payment intent with all related data
    const paymentIntent = await prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
      include: {
        bookings: {
          include: {
            room: {
              include: {
                images: true
              }
            }
          }
        },
        orders: true,
        charges: {
          include: {
            tempCustomer: true
          }
        }
      }
    });

    if (!paymentIntent) {
      throw new Error('Payment intent not found');
    }

    // Parse customer data
    const customerData = JSON.parse(paymentIntent.customerData || '{}');
    
    // Generate invoice number
    const invoiceNumber = `INV-${format(new Date(), 'yyyy')}-${paymentIntent.id.substring(0, 8).toUpperCase()}`;
    
    // Collect all order items
    let orderItems = [];
    
    // Add room bookings as line items
    if (paymentIntent.bookings && paymentIntent.bookings.length > 0) {
      const bookingData = JSON.parse(paymentIntent.bookingData || '[]');
      
      for (const booking of paymentIntent.bookings) {
        const bookingInfo = bookingData.find((b: any) => b.selectedRoom === booking.roomId);
        if (bookingInfo) {
          // Calculate nights
          const checkIn = new Date(booking.checkIn);
          const checkOut = new Date(booking.checkOut);
          const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
          
          // For bookings, use the payment intent's taxAmount (actual amount, not percentage)
          const totalPrice = bookingInfo.totalPrice || bookingInfo.price;
          const totalTaxForBookings = paymentIntent.taxAmount || 0;
          
          // Calculate this booking's share of the total tax (proportionally)
          const bookingTaxAmount = paymentIntent.bookings.length === 1 ? 
            totalTaxForBookings : 
            (totalTaxForBookings * totalPrice) / paymentIntent.totalAmount;
          
          const priceBeforeTax = totalPrice - bookingTaxAmount;
          
          orderItems.push({
            id: `booking-${booking.id}`,
            description: `${booking.room.name} - ${nights} nights`,
            quantity: 1,
            unitPrice: priceBeforeTax.toFixed(2),
            taxAmount: bookingTaxAmount.toFixed(2),
            total: totalPrice.toFixed(2),
            imageUrl: booking.room.images && booking.room.images.length > 0 ? booking.room.images[0].url : null
          });
        }
      }
    }
    
    // Add order items from orders
    if (paymentIntent.orders && paymentIntent.orders.length > 0) {
      for (const order of paymentIntent.orders) {
        if (order.items) {
          // Parse the JSON items field
          try {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            if (Array.isArray(items)) {
              for (const item of items) {
                // For order items, tax is a percentage that needs to be converted to amount
                const totalPrice = (item.quantity || 1) * (item.price || 0);
                const taxPercentage = item.tax || 10; // This is percentage from OrderItem.tax
                const priceBeforeTax = totalPrice / (1 + taxPercentage / 100);
                const taxAmount = totalPrice - priceBeforeTax;
                
                orderItems.push({
                  id: item.id || `order-${order.id}-${item.name}`,
                  description: item.name,
                  quantity: item.quantity || 1,
                  unitPrice: (priceBeforeTax / (item.quantity || 1)).toFixed(2),
                  taxAmount: taxAmount.toFixed(2),
                  total: totalPrice.toFixed(2),
                  imageUrl: item.imageUrl || null
                });
              }
            }
          } catch (e) {
            console.error('Error parsing order items:', e);
          }
        }
      }
    }
    
    // Apply replacements if provided
    if (replacementMap && Object.keys(replacementMap).length > 0) {
      // Get replacement items
      const replacementIds = Object.values(replacementMap);
      const replacementItems = await prisma.orderItem.findMany({
        where: {
          id: {
            in: replacementIds
          }
        },
        select: {
          id: true,
          name: true,
          price: true,
          tax: true,
          imageUrl: true
        }
      });
      
      // Create a map for quick lookup
      const replacementItemsMap = replacementItems.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {} as Record<string, any>);
      
      // Replace items
      orderItems = orderItems.map(item => {
        const replacementId = replacementMap[item.id];
        if (replacementId && replacementItemsMap[replacementId]) {
          const replacement = replacementItemsMap[replacementId];
          // Calculate with new item but keep quantity
          const totalPrice = item.quantity * replacement.price;
          const taxPercentage = replacement.tax || 10; // This is percentage from OrderItem.tax
          const priceBeforeTax = totalPrice / (1 + taxPercentage / 100);
          const taxAmount = totalPrice - priceBeforeTax;
          
          return {
            ...item,
            description: replacement.name,
            unitPrice: (priceBeforeTax / item.quantity).toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            total: totalPrice.toFixed(2),
            imageUrl: replacement.imageUrl || item.imageUrl
          };
        }
        return item;
      });
    }
    
    // Calculate totals (prices already include tax)
    const totalAmount = orderItems.reduce((sum, item) => sum + parseFloat(item.total), 0);
    const totalTaxAmount = orderItems.reduce((sum, item) => sum + parseFloat(item.taxAmount || '0'), 0);
    const subtotal = totalAmount - totalTaxAmount;
    
    // Get booking details
    let checkInDate, checkOutDate, totalNights;
    if (paymentIntent.bookings && paymentIntent.bookings.length > 0) {
      const firstBooking = paymentIntent.bookings[0];
      checkInDate = format(new Date(firstBooking.checkIn), 'MMMM d, yyyy');
      checkOutDate = format(new Date(firstBooking.checkOut), 'MMMM d, yyyy');
      totalNights = Math.ceil((new Date(firstBooking.checkOut).getTime() - new Date(firstBooking.checkIn).getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // Get payment method
    let paymentMethod = 'N/A';
    let transactionId = paymentIntent.stripePaymentIntentId || paymentIntent.id;
    
    if (paymentIntent.stripePaymentIntentId) {
      paymentMethod = 'Credit Card';
    } else if ((paymentIntent as any).actualPaymentMethod === 'BANK_TRANSFER') {
      paymentMethod = 'Bank Transfer';
    } else if ((paymentIntent as any).actualPaymentMethod === 'CASH') {
      paymentMethod = 'Cash';
    }
    
    // Prepare template variables
    const templateVariables = {
      invoiceNumber,
      invoiceDate: format(new Date(), 'MMMM d, yyyy'),
      paymentStatus: paymentIntent.status === 'SUCCEEDED' ? 'PAID' : paymentIntent.status,
      customerName: customerData.name || 'Guest',
      customerEmail: customerData.email || '',
      customerPhone: customerData.phone || null,
      customerAddress: customerData.address || null,
      customerVat: customerData.vat || null,
      checkInDate,
      checkOutDate,
      totalNights,
      items: orderItems,
      subtotal: subtotal.toFixed(2),
      taxAmount: totalTaxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      paymentMethod,
      transactionId,
      notes: replacementMap ? 'This invoice has been adjusted for tax optimization purposes.' : null,
      bookingDetails: !!(checkInDate && checkOutDate)
    };
    
    // Get the invoice template
    const template = await prisma.emailTemplate.findFirst({
      where: { type: 'PAYMENT_INTENT_INVOICE' }
    });
    
    if (!template) {
      throw new Error('Invoice template not found. Please run seed to create templates.');
    }
    
    // Compile the template
    const compiledHtml = (EmailService as any).compileTemplate(template.html, templateVariables);
    
    // Generate PDF
    const pdfBuffer = await generatePDF(compiledHtml);
    
    return pdfBuffer;
  }
}