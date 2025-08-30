-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('BOOKING_COM', 'EXPEDIA', 'AIRBNB', 'WEDDING', 'PRIVATE_EVENT', 'DIRECT', 'CORPORATE', 'OTHER');

-- AlterTable
ALTER TABLE "BookingGroup" ADD COLUMN     "bookingType" "BookingType" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "emailToMainGuestOnly" BOOLEAN NOT NULL DEFAULT true;
