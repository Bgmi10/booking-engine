/*
  Warnings:

  - Added the required column `orderCategoryId` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "isAvailable" BOOLEAN DEFAULT true,
ADD COLUMN     "orderCategoryId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "OrderCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "isAvailable" BOOLEAN DEFAULT true,

    CONSTRAINT "OrderCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderCategoryId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "daysOfWeek" INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvailabilityRule_orderCategoryId_isActive_idx" ON "AvailabilityRule"("orderCategoryId", "isActive");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderCategoryId_fkey" FOREIGN KEY ("orderCategoryId") REFERENCES "OrderCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_orderCategoryId_fkey" FOREIGN KEY ("orderCategoryId") REFERENCES "OrderCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
