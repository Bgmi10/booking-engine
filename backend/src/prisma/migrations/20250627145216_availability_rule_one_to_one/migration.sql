/*
  Warnings:

  - A unique constraint covering the columns `[orderCategoryId]` on the table `AvailabilityRule` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "AvailabilityRule_orderCategoryId_isActive_idx";

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityRule_orderCategoryId_key" ON "AvailabilityRule"("orderCategoryId");
