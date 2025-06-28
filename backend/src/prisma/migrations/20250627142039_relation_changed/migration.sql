/*
  Warnings:

  - You are about to drop the column `locationId` on the `OrderItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_locationId_fkey";

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "locationId";

-- CreateTable
CREATE TABLE "_LocationToOrderCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LocationToOrderCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_LocationToOrderCategory_B_index" ON "_LocationToOrderCategory"("B");

-- AddForeignKey
ALTER TABLE "_LocationToOrderCategory" ADD CONSTRAINT "_LocationToOrderCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LocationToOrderCategory" ADD CONSTRAINT "_LocationToOrderCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "OrderCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
