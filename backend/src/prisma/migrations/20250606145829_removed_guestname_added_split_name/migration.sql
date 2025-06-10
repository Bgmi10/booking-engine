/*
  Warnings:

  - You are about to drop the column `guestName` on the `Booking` table. All the data in the column will be lost.
  - Added the required column `guestFirstName` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guestLastName` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "guestName",
ADD COLUMN     "guestFirstName" TEXT NOT NULL,
ADD COLUMN     "guestLastName" TEXT NOT NULL,
ADD COLUMN     "guestMiddleName" TEXT;
