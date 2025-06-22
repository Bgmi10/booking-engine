/*
  Warnings:

  - You are about to drop the column `guestEmail` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `guestFirstName` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `guestLastName` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `guestMiddleName` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `guestNationality` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `guestPhone` on the `Booking` table. All the data in the column will be lost.
  - Added the required column `customerId` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "guestEmail",
DROP COLUMN "guestFirstName",
DROP COLUMN "guestLastName",
DROP COLUMN "guestMiddleName",
DROP COLUMN "guestNationality",
DROP COLUMN "guestPhone",
ADD COLUMN     "customerId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "guestFirstName" TEXT NOT NULL,
    "guestMiddleName" TEXT,
    "guestLastName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "guestNationality" TEXT,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
