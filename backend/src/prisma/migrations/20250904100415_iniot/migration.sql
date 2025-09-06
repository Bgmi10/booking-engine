/*
  Warnings:

  - You are about to drop the column `isActive` on the `RoomRate` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `RoomRate` table. All the data in the column will be lost.
  - You are about to drop the column `validFrom` on the `RoomRate` table. All the data in the column will be lost.
  - You are about to drop the column `validTo` on the `RoomRate` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "RoomRate_roomId_isActive_idx";

-- AlterTable
ALTER TABLE "RoomRate" DROP COLUMN "isActive",
DROP COLUMN "priority",
DROP COLUMN "validFrom",
DROP COLUMN "validTo";
