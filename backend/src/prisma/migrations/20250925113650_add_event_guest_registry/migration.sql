-- AlterTable
ALTER TABLE "EventParticipant" ADD COLUMN     "guestCount" INTEGER,
ADD COLUMN     "registryId" TEXT,
ALTER COLUMN "bookingId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "EventGuestRegistry" (
    "id" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "bookingId" TEXT,
    "mainGuestEmail" TEXT NOT NULL,
    "mainGuestName" TEXT NOT NULL,
    "mainGuestPhone" TEXT,
    "customerId" TEXT,
    "totalGuestCount" INTEGER NOT NULL,
    "confirmedGuests" INTEGER NOT NULL DEFAULT 1,
    "subGuests" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PROVISIONAL',
    "syncedWithCheckIn" BOOLEAN NOT NULL DEFAULT false,
    "guestCheckInAccessId" TEXT,
    "selectedEvents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventGuestRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventGuestRegistry_paymentIntentId_idx" ON "EventGuestRegistry"("paymentIntentId");

-- CreateIndex
CREATE INDEX "EventGuestRegistry_mainGuestEmail_idx" ON "EventGuestRegistry"("mainGuestEmail");

-- CreateIndex
CREATE INDEX "EventGuestRegistry_status_idx" ON "EventGuestRegistry"("status");

-- CreateIndex
CREATE INDEX "EventGuestRegistry_bookingId_idx" ON "EventGuestRegistry"("bookingId");

-- CreateIndex
CREATE INDEX "EventParticipant_registryId_idx" ON "EventParticipant"("registryId");

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_registryId_fkey" FOREIGN KEY ("registryId") REFERENCES "EventGuestRegistry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGuestRegistry" ADD CONSTRAINT "EventGuestRegistry_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGuestRegistry" ADD CONSTRAINT "EventGuestRegistry_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGuestRegistry" ADD CONSTRAINT "EventGuestRegistry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
