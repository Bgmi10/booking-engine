-- DropForeignKey
ALTER TABLE "Charge" DROP CONSTRAINT "Charge_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Charge" DROP CONSTRAINT "Charge_tempCustomerId_fkey";

-- AlterTable
ALTER TABLE "Charge" ALTER COLUMN "customerId" DROP NOT NULL,
ALTER COLUMN "tempCustomerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_tempCustomerId_fkey" FOREIGN KEY ("tempCustomerId") REFERENCES "TemporaryCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
