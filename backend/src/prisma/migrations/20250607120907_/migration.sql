/*
  Warnings:

  - You are about to drop the column `paymentId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the `PendingBooking` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[stripePaymentIntentId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('CREATED', 'PAYMENT_LINK_SENT', 'PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_paymentId_fkey";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "paymentId",
ADD COLUMN     "paymentIntentId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "paymentIntentId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT,
ALTER COLUMN "stripeSessionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TemporaryHold" ADD COLUMN     "paymentIntentId" TEXT;

-- DropTable
DROP TABLE "PendingBooking";

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeSessionId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'CREATED',
    "bookingData" TEXT NOT NULL,
    "customerData" TEXT NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "adminUserId" TEXT,
    "adminNotes" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_stripePaymentIntentId_key" ON "PaymentIntent"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_stripeSessionId_key" ON "PaymentIntent"("stripeSessionId");

-- CreateIndex
CREATE INDEX "PaymentIntent_status_expiresAt_idx" ON "PaymentIntent"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "PaymentIntent_stripePaymentIntentId_idx" ON "PaymentIntent"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "PaymentIntent_stripeSessionId_idx" ON "PaymentIntent"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryHold" ADD CONSTRAINT "TemporaryHold_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
