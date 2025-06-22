-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('DISCOUNT', 'FIXED', 'PRODUCT');

-- CreateEnum
CREATE TYPE "VoucherRoomScope" AS ENUM ('ALL_ROOMS', 'SPECIFIC_ROOMS');

-- CreateEnum
CREATE TYPE "VoucherRateScope" AS ENUM ('ALL_RATES', 'SPECIFIC_RATES');

-- CreateEnum
CREATE TYPE "VoucherUsageStatus" AS ENUM ('APPLIED', 'REFUNDED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "voucherCode" TEXT,
ADD COLUMN     "voucherDiscount" DOUBLE PRECISION,
ADD COLUMN     "voucherProducts" JSONB;

-- AlterTable
ALTER TABLE "PaymentIntent" ADD COLUMN     "originalAmount" DOUBLE PRECISION,
ADD COLUMN     "voucherCode" TEXT,
ADD COLUMN     "voucherDiscount" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "VoucherProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoucherProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "VoucherType" NOT NULL,
    "discountPercent" DOUBLE PRECISION,
    "fixedAmount" DOUBLE PRECISION,
    "maxUsage" INTEGER,
    "currentUsage" INTEGER NOT NULL DEFAULT 0,
    "maxUsagePerUser" INTEGER,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTill" TIMESTAMP(3) NOT NULL,
    "roomScope" "VoucherRoomScope" NOT NULL DEFAULT 'ALL_ROOMS',
    "roomIds" TEXT[],
    "rateScope" "VoucherRateScope" NOT NULL DEFAULT 'ALL_RATES',
    "ratePolicyIds" TEXT[],
    "isActive" BOOLEAN NOT NULL,
    "productIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherUsage" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "usedBy" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bookingId" TEXT,
    "paymentIntentId" TEXT,
    "discountAmount" DOUBLE PRECISION,
    "originalAmount" DOUBLE PRECISION,
    "finalAmount" DOUBLE PRECISION,
    "productsReceived" JSONB,
    "status" "VoucherUsageStatus" NOT NULL DEFAULT 'APPLIED',

    CONSTRAINT "VoucherUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_VoucherProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_VoucherProducts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "VoucherProduct_isActive_idx" ON "VoucherProduct"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");

-- CreateIndex
CREATE INDEX "Voucher_code_isActive_idx" ON "Voucher"("code", "isActive");

-- CreateIndex
CREATE INDEX "Voucher_validFrom_validTill_idx" ON "Voucher"("validFrom", "validTill");

-- CreateIndex
CREATE INDEX "Voucher_type_isActive_idx" ON "Voucher"("type", "isActive");

-- CreateIndex
CREATE INDEX "VoucherUsage_voucherId_usedAt_idx" ON "VoucherUsage"("voucherId", "usedAt");

-- CreateIndex
CREATE INDEX "VoucherUsage_bookingId_idx" ON "VoucherUsage"("bookingId");

-- CreateIndex
CREATE INDEX "VoucherUsage_paymentIntentId_idx" ON "VoucherUsage"("paymentIntentId");

-- CreateIndex
CREATE INDEX "_VoucherProducts_B_index" ON "_VoucherProducts"("B");

-- AddForeignKey
ALTER TABLE "VoucherUsage" ADD CONSTRAINT "VoucherUsage_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherUsage" ADD CONSTRAINT "VoucherUsage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherUsage" ADD CONSTRAINT "VoucherUsage_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VoucherProducts" ADD CONSTRAINT "_VoucherProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VoucherProducts" ADD CONSTRAINT "_VoucherProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "VoucherProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
