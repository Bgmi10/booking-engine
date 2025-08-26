import prisma from '../prisma';
import { generatePDF } from '../utils/pdfGenerator';
import { EmailService } from './emailService';
import { AuditService } from './auditService';
import { format } from 'date-fns';

export class GroupInvoiceService {
  /**
   * Generates an invoice PDF for a booking group
   * @param bookingGroupId - The booking group ID
   * @param replacementMap - Optional map of item replacements for tax optimization
   * @param userId - User ID for audit logging
   * @returns PDF buffer
   */
  async generateGroupInvoice(bookingGroupId: string, replacementMap?: Record<string, string>, userId?: string) {
    // Get booking group with all related data
    const bookingGroup = await prisma.bookingGroup.findUnique({
      where: { id: bookingGroupId },
      include: {
        paymentIntents: {
          include: {
            bookings: {
              include: {
                room: {
                  include: {
                    images: true
                  }
                }
              }
            }
          }
        },
        charges: {
          include: {
            tempCustomer: true
          }
        },
        orders: true
      }
    });

    if (!bookingGroup) {
      throw new Error('Booking group not found');
    }

    if (!bookingGroup.paymentIntents || bookingGroup.paymentIntents.length === 0) {
      throw new Error('No payment intents found in booking group');
    }

    // Get customer data from the first payment intent
    const firstPaymentIntent = bookingGroup.paymentIntents[0];
    const customerData = JSON.parse(firstPaymentIntent.customerData || '{}');
    
    // Generate invoice number
    const invoiceNumber = `INV-${format(new Date(), 'yyyy')}-GROUP-${bookingGroup.id.substring(0, 8).toUpperCase()}`;
    
    // Collect all order items
    let orderItems = [];
    
    // Add room bookings from all payment intents in the group
    for (const paymentIntent of bookingGroup.paymentIntents) {
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
    }
    
    // Add group-level orders (NOT individual PaymentIntent orders)
    if (bookingGroup.orders && bookingGroup.orders.length > 0) {
      for (const order of bookingGroup.orders) {
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
                  id: item.id || `group-order-${order.id}-${item.name}`,
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
            console.error('Error parsing group order items:', e);
          }
        }
      }
    }

    // Add group-level charges (NOT individual PaymentIntent charges)
    if (bookingGroup.charges && bookingGroup.charges.length > 0) {
      for (const charge of bookingGroup.charges) {
        // For charges, we assume they are tax-inclusive
        const totalPrice = charge.amount;
        // Use a default tax rate for charges (could be configurable)
        const taxPercentage = 10; // Default tax percentage for charges
        const priceBeforeTax = totalPrice / (1 + taxPercentage / 100);
        const taxAmount = totalPrice - priceBeforeTax;
        
        orderItems.push({
          id: `group-charge-${charge.id}`,
          description: charge.description || 'Additional Charge',
          quantity: 1,
          unitPrice: priceBeforeTax.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          total: totalPrice.toFixed(2),
          imageUrl: null
        });
      }
    }
    
    // Apply replacements if provided (for tax optimization)
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
    
    // Get booking details from first payment intent
    let checkInDate, checkOutDate, totalNights;
    if (bookingGroup.paymentIntents[0].bookings && bookingGroup.paymentIntents[0].bookings.length > 0) {
      const firstBooking = bookingGroup.paymentIntents[0].bookings[0];
      checkInDate = format(new Date(firstBooking.checkIn), 'MMMM d, yyyy');
      checkOutDate = format(new Date(firstBooking.checkOut), 'MMMM d, yyyy');
      totalNights = Math.ceil((new Date(firstBooking.checkOut).getTime() - new Date(firstBooking.checkIn).getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // Get payment method (could be multiple in a group)
    let paymentMethod = 'Multiple Methods';
    let transactionId = bookingGroup.id;
    
    // If all payment intents use the same method, show that
    const paymentMethods = bookingGroup.paymentIntents
      .map(pi => pi.actualPaymentMethod || pi.paymentMethod)
      .filter(pm => pm);
    
    if (paymentMethods.length > 0 && paymentMethods.every(pm => pm === paymentMethods[0])) {
      const method = paymentMethods[0];
      if (method === 'STRIPE') paymentMethod = 'Credit Card';
      else if (method === 'BANK_TRANSFER') paymentMethod = 'Bank Transfer';
      else if (method === 'CASH') paymentMethod = 'Cash';
    }
    
    // Prepare template variables
    const templateVariables = {
      invoiceNumber,
      invoiceDate: format(new Date(), 'MMMM d, yyyy'),
      paymentStatus: 'PAID', // Groups are typically paid
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
    
    // Create audit log if userId is provided
    if (userId) {
      try {
        await AuditService.createAuditLog(null, {
          entityType: 'BOOKING_GROUP',
          entityId: bookingGroupId,
          actionType: replacementMap ? 'TAX_OPTIMIZED_INVOICE_GENERATED' : 'INVOICE_GENERATED',
          userId: userId,
          notes: replacementMap ? `Tax-optimized invoice generated with ${Object.keys(replacementMap).length} item replacements` : 'Group invoice generated',
          bookingGroupId: bookingGroupId,
          newValues: replacementMap ? { replacements: replacementMap } : null
        });
      } catch (auditError) {
        console.error('Failed to create audit log for group invoice generation:', auditError);
        // Don't fail the invoice generation if audit logging fails
      }
    }
    
    return pdfBuffer;
  }
}