/*
  Warnings:

  - A unique constraint covering the columns `[orderId]` on the table `Charge` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Charge" ADD COLUMN     "orderId" TEXT,
ALTER COLUMN "expiredAt" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Charge_orderId_key" ON "Charge"("orderId");

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
