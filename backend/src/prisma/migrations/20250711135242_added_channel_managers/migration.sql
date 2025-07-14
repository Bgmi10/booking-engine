-- CreateEnum
CREATE TYPE "ChannelPaymentModel" AS ENUM ('PAID_TO_CHANNEL', 'PAID_ON_SITE', 'MIXED');

-- CreateEnum
CREATE TYPE "ChannelPaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIALLY_PAID', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChannelBookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ChannelSyncStatus" AS ENUM ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'OUT_OF_SYNC');

-- CreateTable
CREATE TABLE "ChannelManager" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "apiEndpoint" TEXT,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "webhookUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "commissionPercentage" DOUBLE PRECISION,
    "paymentModel" "ChannelPaymentModel" NOT NULL DEFAULT 'PAID_TO_CHANNEL',
    "markupPercentage" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "lastSyncAt" TIMESTAMP(3),
    "syncFrequency" INTEGER NOT NULL DEFAULT 3600,
    "autoSync" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelManager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelRoom" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelRoomId" TEXT NOT NULL,
    "channelRoomCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "channelPrice" DOUBLE PRECISION,
    "channelCurrency" TEXT NOT NULL DEFAULT 'eur',
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" "ChannelSyncStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelRate" (
    "id" TEXT NOT NULL,
    "channelRoomId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "baseRate" DOUBLE PRECISION NOT NULL,
    "channelRate" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "availableRooms" INTEGER NOT NULL DEFAULT 1,
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" "ChannelSyncStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelAvailability" (
    "id" TEXT NOT NULL,
    "channelRoomId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "availableRooms" INTEGER NOT NULL DEFAULT 1,
    "totalRooms" INTEGER NOT NULL DEFAULT 1,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" "ChannelSyncStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelBooking" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelBookingId" TEXT NOT NULL,
    "channelReservationId" TEXT,
    "channelGuestId" TEXT,
    "guestFirstName" TEXT NOT NULL,
    "guestLastName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "guestNationality" TEXT,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "totalGuests" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "channelCommission" DOUBLE PRECISION,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "paymentStatus" "ChannelPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentModel" "ChannelPaymentModel" NOT NULL DEFAULT 'PAID_TO_CHANNEL',
    "paidToChannel" BOOLEAN NOT NULL DEFAULT false,
    "paidToChannelAt" TIMESTAMP(3),
    "status" "ChannelBookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "confirmationNumber" TEXT,
    "localBookingId" TEXT,
    "localCustomerId" TEXT,
    "specialRequests" TEXT,
    "channelMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "ChannelBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelBookingRoom" (
    "id" TEXT NOT NULL,
    "channelBookingId" TEXT NOT NULL,
    "channelRoomId" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "roomType" TEXT,
    "ratePerNight" DOUBLE PRECISION NOT NULL,
    "totalRate" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "guestCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelBookingRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChannelManager_code_key" ON "ChannelManager"("code");

-- CreateIndex
CREATE INDEX "ChannelManager_code_isActive_idx" ON "ChannelManager"("code", "isActive");

-- CreateIndex
CREATE INDEX "ChannelRoom_channelId_isActive_idx" ON "ChannelRoom"("channelId", "isActive");

-- CreateIndex
CREATE INDEX "ChannelRoom_channelRoomId_idx" ON "ChannelRoom"("channelRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelRoom_roomId_channelId_key" ON "ChannelRoom"("roomId", "channelId");

-- CreateIndex
CREATE INDEX "ChannelRate_channelId_date_idx" ON "ChannelRate"("channelId", "date");

-- CreateIndex
CREATE INDEX "ChannelRate_date_isAvailable_idx" ON "ChannelRate"("date", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelRate_channelRoomId_date_key" ON "ChannelRate"("channelRoomId", "date");

-- CreateIndex
CREATE INDEX "ChannelAvailability_channelId_date_idx" ON "ChannelAvailability"("channelId", "date");

-- CreateIndex
CREATE INDEX "ChannelAvailability_date_isBlocked_idx" ON "ChannelAvailability"("date", "isBlocked");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelAvailability_channelRoomId_date_key" ON "ChannelAvailability"("channelRoomId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelBooking_channelBookingId_key" ON "ChannelBooking"("channelBookingId");

-- CreateIndex
CREATE INDEX "ChannelBooking_channelId_status_idx" ON "ChannelBooking"("channelId", "status");

-- CreateIndex
CREATE INDEX "ChannelBooking_channelBookingId_idx" ON "ChannelBooking"("channelBookingId");

-- CreateIndex
CREATE INDEX "ChannelBooking_checkIn_checkOut_idx" ON "ChannelBooking"("checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "ChannelBooking_localBookingId_idx" ON "ChannelBooking"("localBookingId");

-- CreateIndex
CREATE INDEX "ChannelBookingRoom_channelBookingId_idx" ON "ChannelBookingRoom"("channelBookingId");

-- AddForeignKey
ALTER TABLE "ChannelRoom" ADD CONSTRAINT "ChannelRoom_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelRoom" ADD CONSTRAINT "ChannelRoom_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ChannelManager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelRate" ADD CONSTRAINT "ChannelRate_channelRoomId_fkey" FOREIGN KEY ("channelRoomId") REFERENCES "ChannelRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelRate" ADD CONSTRAINT "ChannelRate_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ChannelManager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelAvailability" ADD CONSTRAINT "ChannelAvailability_channelRoomId_fkey" FOREIGN KEY ("channelRoomId") REFERENCES "ChannelRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelAvailability" ADD CONSTRAINT "ChannelAvailability_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ChannelManager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelBooking" ADD CONSTRAINT "ChannelBooking_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ChannelManager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelBookingRoom" ADD CONSTRAINT "ChannelBookingRoom_channelBookingId_fkey" FOREIGN KEY ("channelBookingId") REFERENCES "ChannelBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
