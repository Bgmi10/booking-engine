/*
  Warnings:

  - The values [BANK_TRANSFER_CONFIRMED] on the enum `AuditActionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `availabilityType` on the `Enhancement` table. All the data in the column will be lost.
  - You are about to drop the column `availableDays` on the `Enhancement` table. All the data in the column will be lost.
  - You are about to drop the column `availableTimeEnd` on the `Enhancement` table. All the data in the column will be lost.
  - You are about to drop the column `availableTimeStart` on the `Enhancement` table. All the data in the column will be lost.
  - You are about to drop the column `seasonEnd` on the `Enhancement` table. All the data in the column will be lost.
  - You are about to drop the column `seasonStart` on the `Enhancement` table. All the data in the column will be lost.
  - You are about to drop the column `seasonal` on the `Enhancement` table. All the data in the column will be lost.
  - You are about to drop the column `specificDates` on the `Enhancement` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Enhancement` table. All the data in the column will be lost.
  - You are about to drop the column `validFrom` on the `Enhancement` table. All the data in the column will be lost.
  - You are about to drop the column `validUntil` on the `Enhancement` table. All the data in the column will be lost.
  - Added the required column `name` to the `Enhancement` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EnhancementRoomScope" AS ENUM ('ALL_ROOMS', 'SPECIFIC_ROOMS');

-- AlterEnum
BEGIN;
CREATE TYPE "AuditActionType_new" AS ENUM ('CREATED', 'CANCELLED', 'REFUNDED', 'ROOM_CHANGED', 'DATES_CHANGED', 'GUEST_INFO_CHANGED', 'PRICING_CHANGED', 'STATUS_CHANGED', 'NOTES_ADDED', 'EDITED', 'GROUP_CREATED', 'GROUP_UPDATED', 'GROUP_DELETED', 'BOOKING_ADDED_TO_GROUP', 'BOOKING_REMOVED_FROM_GROUP', 'INVOICE_GENERATED', 'TAX_OPTIMIZED_INVOICE_GENERATED', 'INVOICE_SENT', 'CHECKIN_INVITATION_SENT', 'ADMIN_CHECKIN_ACCESS', 'GROUP_CHECK_IN', 'GROUP_CHECKOUT', 'CHECKOUT_PROCESSED', 'BANK_TRANSFER_CONFIRM');
ALTER TABLE "BookingAuditLog" ALTER COLUMN "actionType" TYPE "AuditActionType_new" USING ("actionType"::text::"AuditActionType_new");
ALTER TYPE "AuditActionType" RENAME TO "AuditActionType_old";
ALTER TYPE "AuditActionType_new" RENAME TO "AuditActionType";
DROP TYPE "AuditActionType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Enhancement" DROP COLUMN "availabilityType",
DROP COLUMN "availableDays",
DROP COLUMN "availableTimeEnd",
DROP COLUMN "availableTimeStart",
DROP COLUMN "seasonEnd",
DROP COLUMN "seasonStart",
DROP COLUMN "seasonal",
DROP COLUMN "specificDates",
DROP COLUMN "title",
DROP COLUMN "validFrom",
DROP COLUMN "validUntil",
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "EnhancementRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enhancementId" TEXT NOT NULL,
    "availabilityType" "EnhancementAvailabilityType" NOT NULL DEFAULT 'ALWAYS',
    "availableDays" TEXT[],
    "availableTimeStart" TEXT,
    "availableTimeEnd" TEXT,
    "seasonal" BOOLEAN NOT NULL DEFAULT false,
    "seasonStart" TIMESTAMP(3),
    "seasonEnd" TIMESTAMP(3),
    "specificDates" TIMESTAMP(3)[],
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "roomScope" "EnhancementRoomScope" NOT NULL DEFAULT 'ALL_ROOMS',
    "roomIds" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnhancementRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnhancementRule_enhancementId_isActive_idx" ON "EnhancementRule"("enhancementId", "isActive");

-- CreateIndex
CREATE INDEX "EnhancementRule_validFrom_validUntil_idx" ON "EnhancementRule"("validFrom", "validUntil");

-- AddForeignKey
ALTER TABLE "EnhancementRule" ADD CONSTRAINT "EnhancementRule_enhancementId_fkey" FOREIGN KEY ("enhancementId") REFERENCES "Enhancement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
