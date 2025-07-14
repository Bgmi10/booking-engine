import { Request, Response } from 'express';
import channelWebhookService from '../services/channelWebhookService';

export class ChannelWebhookController {
  // Webhook endpoint for Booking.com
  async bookingComWebhook(req: Request, res: Response) {
    try {
      const { channelId } = req.params;
      const payload = req.body;

      console.log('Received Booking.com webhook:', { channelId, payload });

      const channelBooking = await channelWebhookService.processBookingComWebhook(channelId, payload);

      res.status(200).json({
        success: true,
        message: 'Booking.com webhook processed successfully',
        data: {
          channelBookingId: channelBooking.id,
          localBookingId: channelBooking.localBookingId,
        },
      });
    } catch (error: any) {
      console.error('Error processing Booking.com webhook:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to process Booking.com webhook',
      });
    }
  }

  // Webhook endpoint for Expedia
  async expediaWebhook(req: Request, res: Response) {
    try {
      const { channelId } = req.params;
      const payload = req.body;

      console.log('Received Expedia webhook:', { channelId, payload });

      const channelBooking = await channelWebhookService.processExpediaWebhook(channelId, payload);

      res.status(200).json({
        success: true,
        message: 'Expedia webhook processed successfully',
        data: {
          channelBookingId: channelBooking.id,
          localBookingId: channelBooking.localBookingId,
        },
      });
    } catch (error: any) {
      console.error('Error processing Expedia webhook:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to process Expedia webhook',
      });
    }
  }

  // Webhook endpoint for Airbnb
  async airbnbWebhook(req: Request, res: Response) {
    try {
      const { channelId } = req.params;
      const payload = req.body;

      console.log('Received Airbnb webhook:', { channelId, payload });

      const channelBooking = await channelWebhookService.processAirbnbWebhook(channelId, payload);

      res.status(200).json({
        success: true,
        message: 'Airbnb webhook processed successfully',
        data: {
          channelBookingId: channelBooking.id,
          localBookingId: channelBooking.localBookingId,
        },
      });
    } catch (error: any) {
      console.error('Error processing Airbnb webhook:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to process Airbnb webhook',
      });
    }
  }

  // Generic webhook endpoint for any channel
  async genericWebhook(req: Request, res: Response) {
    try {
      const { channelId } = req.params;
      const { channelType } = req.query;
      const payload = req.body;

      console.log('Received generic webhook:', { channelId, channelType, payload });

      let channelBooking;

      switch (channelType) {
        case 'booking_com':
          channelBooking = await channelWebhookService.processBookingComWebhook(channelId, payload);
          break;
        case 'expedia':
          channelBooking = await channelWebhookService.processExpediaWebhook(channelId, payload);
          break;
        case 'airbnb':
          channelBooking = await channelWebhookService.processAirbnbWebhook(channelId, payload);
          break;
        default:
          throw new Error(`Unsupported channel type: ${channelType}`);
      }

      res.status(200).json({
        success: true,
        message: `${channelType} webhook processed successfully`,
        data: {
          channelBookingId: channelBooking.id,
          localBookingId: channelBooking.localBookingId,
        },
      });
    } catch (error: any) {
      console.error('Error processing generic webhook:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to process webhook',
      });
    }
  }

  // Convert channel booking to local booking
  async convertToLocalBooking(req: Request, res: Response) {
    try {
      const { channelBookingId } = req.params;

      const localBooking = await channelWebhookService.convertToLocalBooking(channelBookingId);

      res.status(200).json({
        success: true,
        message: 'Channel booking converted to local booking successfully',
        data: {
          localBookingId: localBooking.id,
          channelBookingId,
        },
      });
    } catch (error: any) {
      console.error('Error converting channel booking:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to convert channel booking',
      });
    }
  }

  // Webhook health check
  async webhookHealthCheck(req: Request, res: Response) {
    res.status(200).json({
      success: true,
      message: 'Channel webhook service is healthy',
      timestamp: new Date().toISOString(),
    });
  }
}

export default new ChannelWebhookController(); 