/*
  Warnings:

  - You are about to drop the column `nightlyRate` on the `RatePolicy` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `RoomRate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RatePolicy" DROP COLUMN "nightlyRate",
ADD COLUMN     "isPromotion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxAdvanceBooking" INTEGER,
ADD COLUMN     "minStayNights" INTEGER;

-- AlterTable
ALTER TABLE "RoomRate" ADD COLUMN     "customRate" DOUBLE PRECISION,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "validFrom" TIMESTAMP(3),
ADD COLUMN     "validTo" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "RoomRate_roomId_isActive_idx" ON "RoomRate"("roomId", "isActive");
