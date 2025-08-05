-- AlterTable
ALTER TABLE "GeneralSettings" ADD COLUMN     "licensePlateDailyTriggerTime" TEXT NOT NULL DEFAULT '00:00',
ADD COLUMN     "licensePlateExpiryDays" INTEGER NOT NULL DEFAULT 30;
