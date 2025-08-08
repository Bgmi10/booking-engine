import { Router } from 'express';
import beds24Controller from '../controllers/beds24Controller';
import authMiddleware from '../middlewares/authMiddlware';
import validateMiddleware from '../middlewares/validateMiddleware';
import {
  syncRatesAvailabilitySchema,
  pushRatesSchema,
  getBeds24BookingsSchema,
  bulkSyncSchema,
  createBeds24RoomMappingSchema,
  beds24BookingWebhookSchema,
} from '../zod/beds24.schema';

const beds24Router = Router();


// Get property information
beds24Router.get('/property', authMiddleware, beds24Controller.getPropertyInfo);

// Get all rooms from Beds24
beds24Router.get('/rooms', authMiddleware, beds24Controller.getBeds24Rooms);

// Sync rates and availability to Beds24
beds24Router.post(
  '/sync-rates-availability',
  authMiddleware,
  validateMiddleware(syncRatesAvailabilitySchema),
  beds24Controller.syncRatesAndAvailability
);

// Sync booking restrictions to Beds24
beds24Router.post(
  '/sync-booking-restrictions',
  authMiddleware,
  validateMiddleware(syncRatesAvailabilitySchema),
  beds24Controller.syncBookingRestrictions
);

// Manually push specific rates to Beds24
beds24Router.post(
  '/push-rates',
  authMiddleware,
  validateMiddleware(pushRatesSchema),
  beds24Controller.pushRates
);

// Get bookings from Beds24
beds24Router.get('/bookings', authMiddleware, beds24Controller.getBookings);

// Bulk sync operations
beds24Router.post(
  '/bulk-sync',
  authMiddleware,
  validateMiddleware(bulkSyncSchema),
  beds24Controller.bulkSync
);

// Room mapping management
beds24Router.get('/room-mappings', authMiddleware, beds24Controller.getRoomMappings);
beds24Router.post(
  '/room-mappings',
  authMiddleware,
  validateMiddleware(createBeds24RoomMappingSchema),
  beds24Controller.createRoomMapping
);

// Get sync status
beds24Router.get('/sync-status', authMiddleware, beds24Controller.getSyncStatus);

// Get dashboard statistics
beds24Router.get('/dashboard-stats', authMiddleware, beds24Controller.getDashboardStats);

// Webhook endpoints (no auth middleware for webhooks)
beds24Router.post('/webhook/booking', beds24Controller.processBookingWebhook);

export default beds24Router;