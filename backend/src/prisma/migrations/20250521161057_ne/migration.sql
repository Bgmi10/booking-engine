/*
  Warnings:

  - You are about to drop the column `bookerEmail` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `bookerName` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `bookerNationality` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `bookerPhone` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `guestNationality` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `isBookingforSomeone` on the `Booking` table. All the data in the column will be lost.
  - Made the column `guestName` on table `Booking` required. This step will fail if there are existing NULL values in that column.
  - Made the column `guestEmail` on table `Booking` required. This step will fail if there are existing NULL values in that column.
  - Made the column `guestPhone` on table `Booking` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "bookerEmail",
DROP COLUMN "bookerName",
DROP COLUMN "bookerNationality",
DROP COLUMN "bookerPhone",
DROP COLUMN "guestNationality",
DROP COLUMN "isBookingforSomeone",
ADD COLUMN     "guestNationlaity" TEXT,
ALTER COLUMN "guestName" SET NOT NULL,
ALTER COLUMN "guestEmail" SET NOT NULL,
ALTER COLUMN "guestPhone" SET NOT NULL;
