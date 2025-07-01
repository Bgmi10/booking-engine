/*
  Warnings:

  - Added the required column `tempCustomerId` to the `Charge` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Charge" DROP CONSTRAINT "Charge_orderId_fkey";

-- DropIndex
DROP INDEX "Booking_roomId_checkIn_checkOut_idx";

-- DropIndex
DROP INDEX "TemporaryHold_expiresAt_idx";

-- AlterTable
ALTER TABLE "Charge" ADD COLUMN     "tempCustomerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TemporaryCustomer" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateIndex
CREATE INDEX "Booking_roomId_checkIn_checkOut_status_idx" ON "Booking"("roomId", "checkIn", "checkOut", "status");

-- CreateIndex
CREATE INDEX "TemporaryHold_expiresAt_checkIn_checkOut_roomId_idx" ON "TemporaryHold"("expiresAt", "checkIn", "checkOut", "roomId");

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_tempCustomerId_fkey" FOREIGN KEY ("tempCustomerId") REFERENCES "TemporaryCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
