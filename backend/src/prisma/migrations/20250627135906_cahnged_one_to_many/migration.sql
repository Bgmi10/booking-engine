/*
  Warnings:

  - You are about to drop the column `orderCategoryId` on the `OrderItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderCategoryId_fkey";

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "orderCategoryId";

-- CreateTable
CREATE TABLE "_OrderCategoryToOrderItem" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OrderCategoryToOrderItem_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_OrderCategoryToOrderItem_B_index" ON "_OrderCategoryToOrderItem"("B");

-- AddForeignKey
ALTER TABLE "_OrderCategoryToOrderItem" ADD CONSTRAINT "_OrderCategoryToOrderItem_A_fkey" FOREIGN KEY ("A") REFERENCES "OrderCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrderCategoryToOrderItem" ADD CONSTRAINT "_OrderCategoryToOrderItem_B_fkey" FOREIGN KEY ("B") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
