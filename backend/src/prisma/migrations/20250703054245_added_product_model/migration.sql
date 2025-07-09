-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('REGULAR', 'WEDDING', 'RESTAURANT');

-- CreateEnum
CREATE TYPE "ProductPricingModel" AS ENUM ('FIXED', 'PER_PERSON');

-- DropIndex
DROP INDEX "Order_assignedToKitchen_idx";

-- DropIndex
DROP INDEX "Order_assignedToWaiter_idx";

-- DropIndex
DROP INDEX "Order_createdAt_idx";

-- DropIndex
DROP INDEX "Order_status_idx";

-- DropIndex
DROP INDEX "Order_temporaryCustomerId_idx";

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "pricingModel" "ProductPricingModel" NOT NULL DEFAULT 'FIXED',
    "type" "ProductType" NOT NULL DEFAULT 'WEDDING',
    "category" TEXT NOT NULL,
    "sampleMenu" JSONB,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
