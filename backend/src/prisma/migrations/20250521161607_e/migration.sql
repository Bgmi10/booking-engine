/*
  Warnings:

  - You are about to drop the column `guestNationlaity` on the `Booking` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "guestNationlaity",
ADD COLUMN     "guestNationality" TEXT;
