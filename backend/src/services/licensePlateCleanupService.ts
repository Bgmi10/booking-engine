import prisma from '../prisma';
import { dahuaService } from './dahuaService';
import { addHours } from 'date-fns';

class LicensePlateCleanupService {
  async cleanupExpiredLicensePlates() {
    try {
      const settings = await prisma.generalSettings.findFirst();
      if (!settings?.dahuaIsEnabled) {
        console.log('Dahua integration disabled, skipping license plate cleanup');
        return;
      }

      const expiryHours = settings.dahuaLicensePlateExpiryHours || 24;
      const cutoffTime = addHours(new Date(), -expiryHours);

      // Find bookings that have checked out and have license plates
      const expiredBookings = await prisma.booking.findMany({
        where: {
          carNumberPlate: { not: null },
          checkOut: { lt: cutoffTime },
          status: 'CONFIRMED'
        },
        include: {
          customer: true
        }
      });

      console.log(`Found ${expiredBookings.length} bookings with expired license plates`);

      for (const booking of expiredBookings) {
        try {
          if (booking.carNumberPlate) {
            const success = await dahuaService.removeLicensePlate(
              booking.carNumberPlate,
              booking.id
            );

            if (success) {
              // Clear the license plate from the booking
              await prisma.booking.update({
                where: { id: booking.id },
                data: { carNumberPlate: null }
              });

              console.log(`Cleaned up license plate ${booking.carNumberPlate} for booking ${booking.id}`);
            }
          }
        } catch (error) {
          console.error(`Failed to cleanup license plate for booking ${booking.id}:`, error);
        }
      }
    } catch (error) {
      console.error('License plate cleanup service error:', error);
    }
  }

  async cleanupLicensePlateForBooking(bookingId: string) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { customer: true }
      });

      if (booking?.carNumberPlate) {
        const success = await dahuaService.removeLicensePlate(
          booking.carNumberPlate,
          booking.id
        );

        if (success) {
          await prisma.booking.update({
            where: { id: booking.id },
            data: { carNumberPlate: null }
          });

          console.log(`Cleaned up license plate ${booking.carNumberPlate} for booking ${booking.id}`);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error(`Failed to cleanup license plate for booking ${bookingId}:`, error);
      return false;
    }
  }
}

export const licensePlateCleanupService = new LicensePlateCleanupService(); 