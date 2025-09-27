-- AlterTable
ALTER TABLE "GeneralSettings" ADD COLUMN     "standardCheckInTime" TEXT NOT NULL DEFAULT '14:00',
ADD COLUMN     "standardCheckOutTime" TEXT NOT NULL DEFAULT '10:00';
