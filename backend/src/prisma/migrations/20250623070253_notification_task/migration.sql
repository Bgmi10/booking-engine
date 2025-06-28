-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TASK', 'MAINTENANCE', 'CLEANING', 'GUEST_REQUEST', 'BIRTHDAY', 'CHECK_IN', 'CHECK_OUT', 'PAYMENT', 'KITCHEN', 'SERVICE', 'ADMIN');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "AutomatedTaskTriggerType" AS ENUM ('DAY_OF_STAY', 'DAILY', 'WEEKLY', 'MONTHLY', 'CHECK_IN', 'CHECK_OUT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'MANAGER';
ALTER TYPE "Role" ADD VALUE 'RECEPTION';
ALTER TYPE "Role" ADD VALUE 'CLEANER';
ALTER TYPE "Role" ADD VALUE 'MAINTENANCE';
ALTER TYPE "Role" ADD VALUE 'KITCHEN';
ALTER TYPE "Role" ADD VALUE 'WAITER';

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT,
    "assignedBy" TEXT NOT NULL,
    "assignedRole" "Role",
    "guestId" TEXT,
    "guestName" TEXT,
    "roomId" TEXT,
    "roomName" TEXT,
    "bookingId" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "isAutomated" BOOLEAN NOT NULL DEFAULT false,
    "automatedRuleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationAttachment" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomatedTaskRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "taskTitle" TEXT NOT NULL,
    "taskDescription" TEXT,
    "triggerType" "AutomatedTaskTriggerType" NOT NULL,
    "triggerDay" INTEGER,
    "triggerTime" TEXT,
    "assignedRole" "Role" NOT NULL,
    "assignedTo" TEXT,
    "roomScope" "RoomScope" NOT NULL DEFAULT 'ALL_ROOMS',
    "roomIds" TEXT[],
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDateOffset" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomatedTaskRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_assignedTo_status_idx" ON "Notification"("assignedTo", "status");

-- CreateIndex
CREATE INDEX "Notification_assignedRole_status_idx" ON "Notification"("assignedRole", "status");

-- CreateIndex
CREATE INDEX "Notification_dueDate_idx" ON "Notification"("dueDate");

-- CreateIndex
CREATE INDEX "Notification_guestId_idx" ON "Notification"("guestId");

-- CreateIndex
CREATE INDEX "Notification_roomId_idx" ON "Notification"("roomId");

-- CreateIndex
CREATE INDEX "Notification_bookingId_idx" ON "Notification"("bookingId");

-- CreateIndex
CREATE INDEX "AutomatedTaskRule_isActive_triggerType_idx" ON "AutomatedTaskRule"("isActive", "triggerType");

-- CreateIndex
CREATE INDEX "AutomatedTaskRule_roomScope_idx" ON "AutomatedTaskRule"("roomScope");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_automatedRuleId_fkey" FOREIGN KEY ("automatedRuleId") REFERENCES "AutomatedTaskRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationAttachment" ADD CONSTRAINT "NotificationAttachment_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationAttachment" ADD CONSTRAINT "NotificationAttachment_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomatedTaskRule" ADD CONSTRAINT "AutomatedTaskRule_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
