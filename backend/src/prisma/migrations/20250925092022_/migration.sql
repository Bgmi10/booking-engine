/*
  Warnings:

  - A unique constraint covering the columns `[eventParticipantId]` on the table `OrderItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[enhancementBookingId]` on the table `OrderItem` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "enhancementBookingId" TEXT,
ADD COLUMN     "eventParticipantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_eventParticipantId_key" ON "OrderItem"("eventParticipantId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_enhancementBookingId_key" ON "OrderItem"("enhancementBookingId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_eventParticipantId_fkey" FOREIGN KEY ("eventParticipantId") REFERENCES "EventParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_enhancementBookingId_fkey" FOREIGN KEY ("enhancementBookingId") REFERENCES "EnhancementBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
