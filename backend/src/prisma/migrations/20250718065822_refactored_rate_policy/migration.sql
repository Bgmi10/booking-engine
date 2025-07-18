/*
  Warnings:

  - You are about to drop the column `discountPercentage` on the `RatePolicy` table. All the data in the column will be lost.
  - You are about to drop the column `isPromotion` on the `RatePolicy` table. All the data in the column will be lost.
  - You are about to drop the column `maxAdvanceBooking` on the `RatePolicy` table. All the data in the column will be lost.
  - You are about to drop the column `minStayNights` on the `RatePolicy` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RatePolicy" DROP COLUMN "discountPercentage",
DROP COLUMN "isPromotion",
DROP COLUMN "maxAdvanceBooking",
DROP COLUMN "minStayNights";
