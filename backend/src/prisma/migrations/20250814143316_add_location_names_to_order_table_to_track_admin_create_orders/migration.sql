/*
  Warnings:

  - You are about to drop the column `locationIds` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "locationIds",
ADD COLUMN     "locationNames" TEXT[] DEFAULT ARRAY[]::TEXT[];
