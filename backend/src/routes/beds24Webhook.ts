import express, { Request, Response } from 'express';
import prisma from '../prisma';
import { handleError, responseHandler } from '../utils/helper';
import beds24Service from '../services/beds24Service';
import { markForChannelSync } from '../cron/cron';

const beds24WebhookRouter = express.Router();

// Webhook security validation middleware
const validateWebhookSource = (req: Request, res: Response, next: any) => {
  // Add IP whitelist for Beds24 if available
  const beds24IPs = process.env.BEDS24_WEBHOOK_IPS?.split(',') || [];
  const clientIP: any = req.ip || req.connection.remoteAddress;
  
  // For development, skip IP validation
  if (process.env.NODE_ENV === 'local' || beds24IPs.length === 0) {
    return next();
  }
  
  if (!beds24IPs.includes(clientIP)) {
    console.log(`[Beds24 Webhook] Rejected request from unauthorized IP: ${clientIP}`);
    return responseHandler(res, 403, 'Unauthorized webhook source');
  }
  
  next();
};

// Beds24 Inventory Webhook - handles room sync triggers
beds24WebhookRouter.post('/inventory', validateWebhookSource, express.json(), async (req: Request, res: Response) => {
  console.log('[Beds24 Webhook] Received inventory sync notification:', JSON.stringify(req.body, null, 2));
  
  try {
    const webhookData = req.body;
    
    // Beds24 Inventory Webhook format: {"roomId":"123456","propId":"12345","ownerId":"1234","action":"SYNC_ROOM"}
    const { roomId, propId, action } = webhookData;
    
    if (!roomId || !action) {
      return responseHandler(res, 400, 'Invalid webhook data: missing roomId or action');
    }

    if (action === 'SYNC_ROOM') {
      await handleRoomSyncRequest(roomId, propId);
    } else {
      console.log(`[Beds24 Webhook] Unhandled action type: ${action}`);
    }

    // Always respond with 200 to acknowledge receipt
    responseHandler(res, 200, 'Inventory webhook processed successfully');
    
  } catch (error) {
    console.error('[Beds24 Webhook] Error processing inventory webhook:', error);
    handleError(res, error as Error);
  }
});

// Generic webhook endpoint to handle any Beds24 webhook format
beds24WebhookRouter.post('/generic', validateWebhookSource, express.json(), async (req: Request, res: Response) => {
  console.log('[Beds24 Webhook] Received generic webhook:', JSON.stringify(req.body, null, 2));
  
  try {
    const webhookData = req.body;
    
    // Handle different possible webhook formats
    if (webhookData.roomId && webhookData.action === 'SYNC_ROOM') {
      // Inventory webhook format
      await handleRoomSyncRequest(webhookData.roomId, webhookData.propId);
    } else if (webhookData.bookId) {
      // If it contains booking data, handle as booking webhook
      await handleBookingWebhook(webhookData);
    } else {
      // Log unknown format for debugging
      console.log('[Beds24 Webhook] Unknown webhook format received');
    }

    responseHandler(res, 200, 'Generic webhook processed successfully');
    
  } catch (error) {
    console.error('[Beds24 Webhook] Error processing generic webhook:', error);
    handleError(res, error as Error);
  }
});

// Handle Beds24 room sync request (inventory webhook)
async function handleRoomSyncRequest(beds24RoomId: string, propId: string) {
  try {
    console.log(`[Beds24 Webhook] Processing room sync request for room: ${beds24RoomId}`);
    
    // Find the room mapping
    const roomMapping = await prisma.beds24RoomMapping.findFirst({
      where: {
        beds24RoomId: beds24RoomId,
        isActive: true
      },
      include: {
        room: true
      }
    });

    if (!roomMapping) {
      console.error(`[Beds24 Webhook] No room mapping found for Beds24 room: ${beds24RoomId}`);
      return;
    }

    console.log(`[Beds24 Webhook] Found local room: ${roomMapping.room.name} (${roomMapping.localRoomId})`);
    
    // Fetch latest booking data from Beds24 for this room
    const latestBookings = await beds24Service.fetchRoomBookings(beds24RoomId);
    
    // Process each booking from Beds24
    for (const beds24Booking of latestBookings) {
      await processBookingFromBeds24(beds24Booking, roomMapping);
    }
    
    // Update availability immediately to prevent double bookings
    await syncRoomAvailabilityRealTime(roomMapping);
    
    console.log(`[Beds24 Webhook] Room sync completed for: ${roomMapping.room.name}`);
    
  } catch (error) {
    console.error('[Beds24 Webhook] Error handling room sync:', error);
    throw error;
  }
}

// Handle booking webhook (if Beds24 sends booking data directly)
async function handleBookingWebhook(bookingData: any) {
  try {
    console.log(`[Beds24 Webhook] Processing booking webhook: ${bookingData.bookId}`);
    
    // Find the room mapping
    const roomMapping = await prisma.beds24RoomMapping.findFirst({
      where: {
        beds24RoomId: bookingData.roomId,
        isActive: true
      },
      include: {
        room: true
      }
    });

    if (!roomMapping) {
      console.error(`[Beds24 Webhook] No room mapping found for booking room: ${bookingData.roomId}`);
      return;
    }

    await processBookingFromBeds24(bookingData, roomMapping);
    await syncRoomAvailabilityRealTime(roomMapping);
    
  } catch (error) {
    console.error('[Beds24 Webhook] Error handling booking webhook:', error);
    throw error;
  }
}

// Process a single booking from Beds24
async function processBookingFromBeds24(beds24Booking: any, roomMapping: any) {
  try {
    // Check if booking already exists
    const existingBooking = await prisma.booking.findFirst({
      where: {
        channelBookingId: beds24Booking.bookId
      }
    });

    const checkInDate = new Date(beds24Booking.arrival);
    const checkOutDate = new Date(beds24Booking.departure);
    const totalGuests = (beds24Booking.numAdult || 0) + (beds24Booking.numChild || 0);

    if (existingBooking) {
      // Update existing booking
      await prisma.booking.update({
        where: { id: existingBooking.id },
        data: {
          checkIn: checkInDate,
          checkOut: checkOutDate,
          totalGuests: totalGuests,
          status: beds24Booking.status === '1' ? 'CONFIRMED' : 'PENDING',
          totalAmount: beds24Booking.price || existingBooking.totalAmount,
          request: beds24Booking.guestComments || existingBooking.request,
          needsChannelSync: false // Don't sync back to channel
        }
      });
      
      console.log(`[Beds24 Webhook] Updated existing booking: ${existingBooking.id}`);
    } else {
      // Check for double booking conflicts
      const conflictingBookings = await checkForDoubleBookings(
        roomMapping.localRoomId, 
        checkInDate, 
        checkOutDate, 
        beds24Booking.bookId
      );

      if (conflictingBookings.length > 0) {
        console.error(`[Beds24 Webhook] ⚠️ DOUBLE BOOKING DETECTED!`);
        console.error(`[Beds24 Webhook] Existing booking: ${conflictingBookings[0].id}`);
        console.error(`[Beds24 Webhook] New Beds24 booking: ${beds24Booking.bookId}`);
        
        // Create booking but mark it for admin attention
        const newBooking = await createBookingFromBeds24(beds24Booking, roomMapping, true);
        await sendDoubleBookingAlert(newBooking, conflictingBookings[0], beds24Booking);
        
        return;
      }

      // Create new booking
      await createBookingFromBeds24(beds24Booking, roomMapping);
      console.log(`[Beds24 Webhook] Created new booking from Beds24: ${beds24Booking.bookId}`);
    }
  } catch (error) {
    console.error('[Beds24 Webhook] Error processing booking:', error);
    throw error;
  }
}

// Create booking from Beds24 data
async function createBookingFromBeds24(bookingData: any, roomMapping: any, isDoubleBooking = false) {
  // Find or create customer
  let customer = await prisma.customer.findUnique({
    where: { guestEmail: bookingData.guestEmail }
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        guestFirstName: bookingData.guestFirstName || 'Unknown',
        guestLastName: bookingData.guestName || 'Guest',
        guestEmail: bookingData.guestEmail,
        guestPhone: bookingData.guestPhone || '',
        guestNationality: bookingData.guestCountry || null
      }
    });
  }

  // Create booking
  const newBooking = await prisma.booking.create({
    data: {
      roomId: roomMapping.localRoomId,
      customerId: customer.id,
      checkIn: new Date(bookingData.arrival),
      checkOut: new Date(bookingData.departure),
      totalGuests: (bookingData.numAdult || 0) + (bookingData.numChild || 0),
      status: isDoubleBooking ? 'PENDING' : (bookingData.status === '1' ? 'CONFIRMED' : 'PENDING'),
      totalAmount: bookingData.price || 0,
      channelBookingId: bookingData.bookId,
      request: bookingData.guestComments,
      needsChannelSync: false, // Don't sync back to channel
      metadata: {
        source: 'beds24_webhook',
        originalBookingData: bookingData,
        isDoubleBooking: isDoubleBooking,
        ...(isDoubleBooking && { 
          adminAlert: 'DOUBLE BOOKING DETECTED - Requires immediate attention' 
        })
      }
    },
    include: {
      room: true,
      customer: true
    }
  });

  return newBooking;
}

// Check for double booking conflicts
async function checkForDoubleBookings(
  roomId: string, 
  checkIn: Date, 
  checkOut: Date, 
  excludeChannelBookingId?: string
) {
  return await prisma.booking.findMany({
    where: {
      roomId: roomId,
      status: { in: ['CONFIRMED', 'PENDING'] },
      AND: [
        { checkIn: { lt: checkOut } },
        { checkOut: { gt: checkIn } }
      ],
      ...(excludeChannelBookingId && {
        channelBookingId: { not: excludeChannelBookingId }
      })
    },
    include: {
      customer: true,
      paymentIntent: true
    }
  });
}

// Sync room availability in real-time
async function syncRoomAvailabilityRealTime(roomMapping: any) {
  try {
    // Get all active bookings for this room
    const activeBookings = await prisma.booking.findMany({
      where: {
        roomId: roomMapping.localRoomId,
        status: { in: ['CONFIRMED', 'PENDING'] },
        checkOut: { gte: new Date() } // Only future bookings
      }
    });

    // Immediately sync availability to prevent other channels from double booking
    if (roomMapping.isActive && roomMapping.autoSync) {
      await beds24Service.syncRoomAvailability(roomMapping.room, activeBookings);
      console.log(`[Beds24 Webhook] Real-time availability updated for room: ${roomMapping.room.name}`);
    }
  } catch (error) {
    console.error('[Beds24 Webhook] Error updating real-time availability:', error);
    // Don't throw error - let the main webhook processing continue
  }
}

// Send double booking alert to admin
async function sendDoubleBookingAlert(newBooking: any, existingBooking: any, beds24Data: any) {
  // TODO: Implement email alert to admin
  console.error(`[DOUBLE BOOKING ALERT]`);
  console.error(`Room: ${newBooking.room.name}`);
  console.error(`Existing Booking: ${existingBooking.id} (${existingBooking.checkIn} - ${existingBooking.checkOut})`);
  console.error(`New Beds24 Booking: ${beds24Data.bookId} (${beds24Data.arrival} - ${beds24Data.departure})`);
  console.error(`Customer: ${beds24Data.guestFirstName} ${beds24Data.guestName} (${beds24Data.guestEmail})`);
  
  // You can integrate with your existing email service here
  // await EmailService.sendEmail({
  //   to: { email: 'admin@example.com', name: 'Admin' },
  //   templateType: 'DOUBLE_BOOKING_ALERT',
  //   templateData: { newBooking, existingBooking, beds24Data }
  // });
}

// Health check endpoint for webhook testing
beds24WebhookRouter.get('/health', (req: Request, res: Response) => {
  responseHandler(res, 200, 'Beds24 webhook endpoint is healthy');
});

// Test endpoint for webhook validation
beds24WebhookRouter.post('/test', express.json(), (req: Request, res: Response) => {
  console.log('[Beds24 Webhook Test] Received:', JSON.stringify(req.body, null, 2));
  responseHandler(res, 200, 'Test webhook received successfully', req.body);
});

export default beds24WebhookRouter;