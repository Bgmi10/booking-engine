-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('PAYMENT_INTENT', 'BOOKING', 'CHARGE', 'ROOM_CHANGE', 'PRICING_CHANGE', 'GUEST_INFO_CHANGE');

-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('CREATED', 'CANCELLED', 'REFUNDED', 'ROOM_CHANGED', 'DATES_CHANGED', 'GUEST_INFO_CHANGED', 'PRICING_CHANGED', 'STATUS_CHANGED', 'NOTES_ADDED', 'EDITED');

-- AlterTable
ALTER TABLE "PaymentIntent" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "refundInitiatedBy" TEXT,
ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BookingAuditLog" (
    "id" TEXT NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "actionType" "AuditActionType" NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "previousValues" JSONB,
    "newValues" JSONB,
    "changedFields" TEXT[],
    "paymentIntentId" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingAuditLog_entityType_entityId_idx" ON "BookingAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "BookingAuditLog_paymentIntentId_idx" ON "BookingAuditLog"("paymentIntentId");

-- CreateIndex
CREATE INDEX "BookingAuditLog_bookingId_idx" ON "BookingAuditLog"("bookingId");

-- CreateIndex
CREATE INDEX "BookingAuditLog_userId_idx" ON "BookingAuditLog"("userId");

-- CreateIndex
CREATE INDEX "BookingAuditLog_actionType_idx" ON "BookingAuditLog"("actionType");

-- CreateIndex
CREATE INDEX "BookingAuditLog_createdAt_idx" ON "BookingAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "BookingAuditLog" ADD CONSTRAINT "BookingAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAuditLog" ADD CONSTRAINT "BookingAuditLog_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAuditLog" ADD CONSTRAINT "BookingAuditLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
