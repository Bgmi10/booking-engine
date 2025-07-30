-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "extraBedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "extraBedPrice" DOUBLE PRECISION,
ADD COLUMN     "hasExtraBed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "allowsExtraBed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "extraBedPrice" DOUBLE PRECISION,
ADD COLUMN     "maxCapacityWithExtraBed" INTEGER;
