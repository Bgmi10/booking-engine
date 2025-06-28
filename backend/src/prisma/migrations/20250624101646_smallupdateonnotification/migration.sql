-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_assignedBy_fkey";

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "assignedBy" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
