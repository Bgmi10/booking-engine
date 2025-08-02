/*
  Warnings:

  - You are about to drop the column `customRate` on the `RoomRate` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RatePolicy" ADD COLUMN     "basePrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "RoomRate" DROP COLUMN "customRate",
ADD COLUMN     "percentageAdjustment" DOUBLE PRECISION;
