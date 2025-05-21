/*
  Warnings:

  - Added the required column `bookerEmail` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookerName` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookerNationality` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookerPhone` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "bookerEmail" TEXT NOT NULL,
ADD COLUMN     "bookerName" TEXT NOT NULL,
ADD COLUMN     "bookerNationality" TEXT NOT NULL,
ADD COLUMN     "bookerPhone" TEXT NOT NULL,
ADD COLUMN     "guestNationality" TEXT,
ADD COLUMN     "guestPhone" TEXT,
ADD COLUMN     "isBookingforSomeone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "request" TEXT,
ALTER COLUMN "guestName" DROP NOT NULL,
ALTER COLUMN "guestEmail" DROP NOT NULL;
