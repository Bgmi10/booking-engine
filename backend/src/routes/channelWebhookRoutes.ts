import { Router } from 'express';
import channelWebhookController from '../controllers/channelWebhookController';

const router = Router();

// Webhook endpoints (no authentication required for external webhooks)
router.post('/webhooks/booking-com/:channelId', channelWebhookController.bookingComWebhook);
router.post('/webhooks/expedia/:channelId', channelWebhookController.expediaWebhook);
router.post('/webhooks/airbnb/:channelId', channelWebhookController.airbnbWebhook);
router.post('/webhooks/generic/:channelId', channelWebhookController.genericWebhook);

// Conversion endpoint (requ    ires authentication)
router.post('/webhooks/convert/:channelBookingId', channelWebhookController.convertToLocalBooking);

// Health check
router.get('/webhooks/health', channelWebhookController.webhookHealthCheck);

export default router; 