/*
  Warnings:

  - A unique constraint covering the columns `[customerId,bookingId]` on the table `GuestCheckInAccess` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "GuestType" AS ENUM ('INVITED', 'MANUAL', 'MAIN_GUEST');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('INCOMPLETE', 'PARTIAL', 'COMPLETE');

-- AlterTable
ALTER TABLE "GuestCheckInAccess" ADD COLUMN     "addedManuallyAt" TIMESTAMP(3),
ADD COLUMN     "addedManuallyBy" TEXT,
ADD COLUMN     "addressDetailsComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "checkInCompletedAt" TIMESTAMP(3),
ADD COLUMN     "completionStatus" "CompletionStatus" NOT NULL DEFAULT 'INCOMPLETE',
ADD COLUMN     "guestType" "GuestType" NOT NULL DEFAULT 'INVITED',
ADD COLUMN     "identityDetailsComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "invitationAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "invitationSentAt" TIMESTAMP(3),
ADD COLUMN     "invitationStatus" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "isMainGuest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "personalDetailsComplete" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "GuestCheckInAccess_customerId_bookingId_key" ON "GuestCheckInAccess"("customerId", "bookingId");
