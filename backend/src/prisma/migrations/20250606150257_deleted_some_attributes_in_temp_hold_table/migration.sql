/*
  Warnings:

  - You are about to drop the column `guestEmail` on the `TemporaryHold` table. All the data in the column will be lost.
  - You are about to drop the column `guestName` on the `TemporaryHold` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TemporaryHold" DROP COLUMN "guestEmail",
DROP COLUMN "guestName";
