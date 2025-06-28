-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderCategoryId_fkey";

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "orderCategoryId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderCategoryId_fkey" FOREIGN KEY ("orderCategoryId") REFERENCES "OrderCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
