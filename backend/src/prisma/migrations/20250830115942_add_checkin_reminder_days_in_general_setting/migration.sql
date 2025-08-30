/*
  Warnings:

  - You are about to drop the column `carNumberPlate` on the `Booking` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "carNumberPlate";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "carNumberPlate" TEXT;

-- AlterTable
ALTER TABLE "GeneralSettings" ADD COLUMN     "checkinReminderDays" INTEGER NOT NULL DEFAULT 10;
