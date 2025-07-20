/*
  Warnings:

  - The primary key for the `_LocationToOrderCategory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_OrderCategoryToOrderItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_VoucherProducts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_LocationToOrderCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_OrderCategoryToOrderItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_VoucherProducts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PaymentIntent" ADD COLUMN     "secondPaymentExpiresAt" TIMESTAMP(3),
ADD COLUMN     "secondPaymentLinkId" TEXT;

-- AlterTable
ALTER TABLE "_LocationToOrderCategory" DROP CONSTRAINT "_LocationToOrderCategory_AB_pkey";

-- AlterTable
ALTER TABLE "_OrderCategoryToOrderItem" DROP CONSTRAINT "_OrderCategoryToOrderItem_AB_pkey";

-- AlterTable
ALTER TABLE "_VoucherProducts" DROP CONSTRAINT "_VoucherProducts_AB_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "_LocationToOrderCategory_AB_unique" ON "_LocationToOrderCategory"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_OrderCategoryToOrderItem_AB_unique" ON "_OrderCategoryToOrderItem"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_VoucherProducts_AB_unique" ON "_VoucherProducts"("A", "B");
