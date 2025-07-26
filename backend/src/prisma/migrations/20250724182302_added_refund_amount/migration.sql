-- CreateEnum
CREATE TYPE "BookingGroupStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PARTIALLY_REFUNDED', 'FULLY_REFUNDED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "refundAmount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Charge" ADD COLUMN     "bookingGroupId" TEXT;

-- AlterTable
ALTER TABLE "PaymentIntent" ADD COLUMN     "bookingGroupId" TEXT;

-- CreateTable
CREATE TABLE "BookingGroup" (
    "id" TEXT NOT NULL,
    "groupName" TEXT,
    "isAutoGrouped" BOOLEAN NOT NULL DEFAULT false,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "status" "BookingGroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingGroup_status_idx" ON "BookingGroup"("status");

-- CreateIndex
CREATE INDEX "PaymentIntent_bookingGroupId_idx" ON "PaymentIntent"("bookingGroupId");

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_bookingGroupId_fkey" FOREIGN KEY ("bookingGroupId") REFERENCES "BookingGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_bookingGroupId_fkey" FOREIGN KEY ("bookingGroupId") REFERENCES "BookingGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
