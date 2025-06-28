-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_locationId_fkey";

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "locationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
