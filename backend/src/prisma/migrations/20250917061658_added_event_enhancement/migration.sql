-- CreateEnum
CREATE TYPE "AddedBy" AS ENUM ('MAIN_GUEST', 'GUEST', 'ADMIN');

-- CreateEnum
CREATE TYPE "EventParticipantStatus" AS ENUM ('COMPLETED', 'PENDING', 'CANCELLED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ParticipantType" AS ENUM ('GUEST', 'MAIN_GUEST');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('COMPLETED', 'IN_PROGRESS', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('ENHANCEMNET', 'PIZZA_NIGHT', 'SPECIAL_DINNER', 'WINE_TASTING', 'COOKING_CLASS', 'OTHERS');

-- AlterEnum
ALTER TYPE "AuditActionType" ADD VALUE 'REMOVED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEntityType" ADD VALUE 'ENHANCEMENT_EVENT';
ALTER TYPE "AuditEntityType" ADD VALUE 'ENHANCEMENT_EVENT_PARTICIPANT';

-- AlterTable
ALTER TABLE "BookingAuditLog" ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "eventParticipantId" TEXT;

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventType" "EventType" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "totalRevenue" DOUBLE PRECISION NOT NULL,
    "totalGuests" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventEnhancement" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "enhancementId" TEXT NOT NULL,
    "overridePrice" DOUBLE PRECISION,
    "maxQuantity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventEnhancement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventParticipant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "enhancementId" TEXT NOT NULL,
    "participantType" "ParticipantType" NOT NULL DEFAULT 'GUEST',
    "status" "EventParticipantStatus" NOT NULL DEFAULT 'PENDING',
    "addedBy" "AddedBy" NOT NULL DEFAULT 'ADMIN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventInvitation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invitationToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "isMainGuest" BOOLEAN NOT NULL DEFAULT false,
    "invitationStatus" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_eventDate_status_id_idx" ON "Event"("eventDate", "status", "id");

-- CreateIndex
CREATE INDEX "EventEnhancement_eventId_id_idx" ON "EventEnhancement"("eventId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "EventEnhancement_eventId_enhancementId_key" ON "EventEnhancement"("eventId", "enhancementId");

-- CreateIndex
CREATE INDEX "EventParticipant_eventId_idx" ON "EventParticipant"("eventId");

-- CreateIndex
CREATE INDEX "EventParticipant_bookingId_idx" ON "EventParticipant"("bookingId");

-- CreateIndex
CREATE INDEX "EventParticipant_customerId_idx" ON "EventParticipant"("customerId");

-- CreateIndex
CREATE INDEX "EventParticipant_paymentIntentId_idx" ON "EventParticipant"("paymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "EventParticipant_eventId_bookingId_customerId_enhancementId_key" ON "EventParticipant"("eventId", "bookingId", "customerId", "enhancementId");

-- CreateIndex
CREATE UNIQUE INDEX "EventInvitation_invitationToken_key" ON "EventInvitation"("invitationToken");

-- CreateIndex
CREATE INDEX "EventInvitation_invitationToken_idx" ON "EventInvitation"("invitationToken");

-- CreateIndex
CREATE INDEX "EventInvitation_eventId_idx" ON "EventInvitation"("eventId");

-- CreateIndex
CREATE INDEX "EventInvitation_bookingId_idx" ON "EventInvitation"("bookingId");

-- CreateIndex
CREATE INDEX "EventInvitation_customerId_idx" ON "EventInvitation"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "EventInvitation_customerId_bookingId_eventId_key" ON "EventInvitation"("customerId", "bookingId", "eventId");

-- AddForeignKey
ALTER TABLE "EventEnhancement" ADD CONSTRAINT "EventEnhancement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEnhancement" ADD CONSTRAINT "EventEnhancement_enhancementId_fkey" FOREIGN KEY ("enhancementId") REFERENCES "Enhancement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_enhancementId_fkey" FOREIGN KEY ("enhancementId") REFERENCES "Enhancement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAuditLog" ADD CONSTRAINT "BookingAuditLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAuditLog" ADD CONSTRAINT "BookingAuditLog_eventParticipantId_fkey" FOREIGN KEY ("eventParticipantId") REFERENCES "EventParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
