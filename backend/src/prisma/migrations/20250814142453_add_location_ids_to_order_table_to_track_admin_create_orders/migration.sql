-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_locationName_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "locationIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "locationName" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_locationName_fkey" FOREIGN KEY ("locationName") REFERENCES "Location"("name") ON DELETE SET NULL ON UPDATE CASCADE;
