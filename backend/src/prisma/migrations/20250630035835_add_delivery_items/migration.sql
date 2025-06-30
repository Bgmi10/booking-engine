/*
  Warnings:

  - You are about to drop the column `requiresKitchen` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "requiresKitchen",
ADD COLUMN     "deliveryItems" JSONB;
