/*
  Warnings:

  - You are about to drop the `ChannelAvailability` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChannelBooking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChannelBookingRoom` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChannelManager` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChannelRate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChannelRoom` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChannelAvailability" DROP CONSTRAINT "ChannelAvailability_channelId_fkey";

-- DropForeignKey
ALTER TABLE "ChannelAvailability" DROP CONSTRAINT "ChannelAvailability_channelRoomId_fkey";

-- DropForeignKey
ALTER TABLE "ChannelBooking" DROP CONSTRAINT "ChannelBooking_channelId_fkey";

-- DropForeignKey
ALTER TABLE "ChannelBookingRoom" DROP CONSTRAINT "ChannelBookingRoom_channelBookingId_fkey";

-- DropForeignKey
ALTER TABLE "ChannelRate" DROP CONSTRAINT "ChannelRate_channelId_fkey";

-- DropForeignKey
ALTER TABLE "ChannelRate" DROP CONSTRAINT "ChannelRate_channelRoomId_fkey";

-- DropForeignKey
ALTER TABLE "ChannelRoom" DROP CONSTRAINT "ChannelRoom_channelId_fkey";

-- DropForeignKey
ALTER TABLE "ChannelRoom" DROP CONSTRAINT "ChannelRoom_roomId_fkey";

-- DropTable
DROP TABLE "ChannelAvailability";

-- DropTable
DROP TABLE "ChannelBooking";

-- DropTable
DROP TABLE "ChannelBookingRoom";

-- DropTable
DROP TABLE "ChannelManager";

-- DropTable
DROP TABLE "ChannelRate";

-- DropTable
DROP TABLE "ChannelRoom";

-- DropEnum
DROP TYPE "ChannelBookingStatus";

-- DropEnum
DROP TYPE "ChannelPaymentModel";

-- DropEnum
DROP TYPE "ChannelPaymentStatus";

-- DropEnum
DROP TYPE "ChannelSyncStatus";

-- CreateTable
CREATE TABLE "Beds24RoomMapping" (
    "id" TEXT NOT NULL,
    "localRoomId" TEXT NOT NULL,
    "beds24RoomId" TEXT NOT NULL,
    "beds24RoomName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoSync" BOOLEAN NOT NULL DEFAULT true,
    "markupPercent" DOUBLE PRECISION,
    "minStay" INTEGER NOT NULL DEFAULT 1,
    "maxStay" INTEGER NOT NULL DEFAULT 30,
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Beds24RoomMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Beds24RoomMapping_isActive_autoSync_idx" ON "Beds24RoomMapping"("isActive", "autoSync");

-- CreateIndex
CREATE UNIQUE INDEX "Beds24RoomMapping_localRoomId_key" ON "Beds24RoomMapping"("localRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "Beds24RoomMapping_beds24RoomId_key" ON "Beds24RoomMapping"("beds24RoomId");

-- AddForeignKey
ALTER TABLE "Beds24RoomMapping" ADD CONSTRAINT "Beds24RoomMapping_localRoomId_fkey" FOREIGN KEY ("localRoomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
