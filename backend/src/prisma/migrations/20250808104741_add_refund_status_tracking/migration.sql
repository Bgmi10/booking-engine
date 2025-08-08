-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('NOT_REFUNDED', 'CANCELLED_NO_REFUND', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'FULLY_REFUNDED', 'REFUND_DENIED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NOT_REFUNDED';

-- AlterTable
ALTER TABLE "PaymentIntent" ADD COLUMN     "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NOT_REFUNDED';

-- CreateIndex
CREATE INDEX "Booking_refundStatus_idx" ON "Booking"("refundStatus");

-- CreateIndex
CREATE INDEX "PaymentIntent_refundStatus_idx" ON "PaymentIntent"("refundStatus");
