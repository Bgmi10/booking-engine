-- AlterTable
ALTER TABLE "Beds24RoomMapping" ADD COLUMN     "lastSyncError" TEXT,
ADD COLUMN     "needsSync" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncFailCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "channelBookingId" TEXT,
ADD COLUMN     "channelSyncFailCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastChannelSyncAt" TIMESTAMP(3),
ADD COLUMN     "needsChannelSync" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "BookingRestriction" ADD COLUMN     "channelSyncFailCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastChannelSyncAt" TIMESTAMP(3),
ADD COLUMN     "needsChannelSync" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PaymentIntent" ALTER COLUMN "isSoftDeleted" SET DEFAULT false;

-- AlterTable
ALTER TABLE "RateDatePrice" ADD COLUMN     "channelSyncFailCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastChannelSyncAt" TIMESTAMP(3),
ADD COLUMN     "needsChannelSync" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RatePolicy" ADD COLUMN     "channelSyncFailCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastChannelSyncAt" TIMESTAMP(3),
ADD COLUMN     "needsChannelSync" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "channelSyncFailCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastChannelSyncAt" TIMESTAMP(3),
ADD COLUMN     "needsChannelSync" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Beds24RoomMapping_needsSync_idx" ON "Beds24RoomMapping"("needsSync");

-- CreateIndex
CREATE INDEX "Booking_needsChannelSync_idx" ON "Booking"("needsChannelSync");

-- CreateIndex
CREATE INDEX "BookingRestriction_needsChannelSync_idx" ON "BookingRestriction"("needsChannelSync");

-- CreateIndex
CREATE INDEX "RateDatePrice_needsChannelSync_idx" ON "RateDatePrice"("needsChannelSync");

-- CreateIndex
CREATE INDEX "RatePolicy_needsChannelSync_idx" ON "RatePolicy"("needsChannelSync");

-- CreateIndex
CREATE INDEX "Room_needsChannelSync_idx" ON "Room"("needsChannelSync");
