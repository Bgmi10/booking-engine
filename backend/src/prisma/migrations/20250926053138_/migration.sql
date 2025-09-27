/*
  Warnings:

  - You are about to drop the column `enhancementBookingId` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `eventParticipantId` on the `OrderItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_enhancementBookingId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_eventParticipantId_fkey";

-- DropIndex
DROP INDEX "OrderItem_enhancementBookingId_key";

-- DropIndex
DROP INDEX "OrderItem_eventParticipantId_key";

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "enhancementBookingId",
DROP COLUMN "eventParticipantId";
