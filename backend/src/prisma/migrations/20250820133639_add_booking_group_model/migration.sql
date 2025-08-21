/*
  Warnings:

  - You are about to drop the column `currency` on the `BookingGroup` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `BookingGroup` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `BookingGroup` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditActionType" ADD VALUE 'GROUP_CREATED';
ALTER TYPE "AuditActionType" ADD VALUE 'GROUP_UPDATED';
ALTER TYPE "AuditActionType" ADD VALUE 'GROUP_DELETED';
ALTER TYPE "AuditActionType" ADD VALUE 'BOOKING_ADDED_TO_GROUP';
ALTER TYPE "AuditActionType" ADD VALUE 'BOOKING_REMOVED_FROM_GROUP';

-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'BOOKING_GROUP';

-- DropIndex
DROP INDEX "BookingGroup_status_idx";

-- AlterTable
ALTER TABLE "BookingAuditLog" ADD COLUMN     "bookingGroupId" TEXT;

-- AlterTable
ALTER TABLE "BookingGroup" DROP COLUMN "currency",
DROP COLUMN "status",
DROP COLUMN "totalAmount",
ADD COLUMN     "outstandingAmount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "GeneralSettings" ADD COLUMN     "autoGroupingRoomCount" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "bookingGroupId" TEXT;

-- DropEnum
DROP TYPE "BookingGroupStatus";

-- CreateIndex
CREATE INDEX "BookingAuditLog_bookingGroupId_idx" ON "BookingAuditLog"("bookingGroupId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_bookingGroupId_fkey" FOREIGN KEY ("bookingGroupId") REFERENCES "BookingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAuditLog" ADD CONSTRAINT "BookingAuditLog_bookingGroupId_fkey" FOREIGN KEY ("bookingGroupId") REFERENCES "BookingGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
