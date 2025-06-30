-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "temporaryCustomerId" TEXT,
ALTER COLUMN "customerId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TemporaryCustomer" (
    "id" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemporaryCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_temporaryCustomerId_idx" ON "Order"("temporaryCustomerId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_temporaryCustomerId_fkey" FOREIGN KEY ("temporaryCustomerId") REFERENCES "TemporaryCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
