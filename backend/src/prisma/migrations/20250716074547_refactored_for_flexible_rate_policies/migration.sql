-- CreateEnum
CREATE TYPE "PaymentStructure" AS ENUM ('FULL_PAYMENT', 'SPLIT_PAYMENT');

-- CreateEnum
CREATE TYPE "CancellationPolicy" AS ENUM ('FLEXIBLE', 'MODERATE', 'STRICT', 'NON_REFUNDABLE');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('FULL_PAYMENT', 'FIRST_INSTALLMENT', 'SECOND_INSTALLMENT');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "finalPaymentStatus" "PaymentStatus",
ADD COLUMN     "paymentStructure" "PaymentStructure" NOT NULL DEFAULT 'FULL_PAYMENT',
ADD COLUMN     "prepaidAmount" DOUBLE PRECISION,
ADD COLUMN     "ratePolicyId" TEXT,
ADD COLUMN     "remainingAmount" DOUBLE PRECISION,
ADD COLUMN     "remainingDueDate" TIMESTAMP(3),
ADD COLUMN     "totalAmount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "installmentNumber" INTEGER,
ADD COLUMN     "paymentType" "PaymentType" NOT NULL DEFAULT 'FULL_PAYMENT';

-- AlterTable
ALTER TABLE "PaymentIntent" ADD COLUMN     "paymentStructure" "PaymentStructure" NOT NULL DEFAULT 'FULL_PAYMENT',
ADD COLUMN     "prepaidAmount" DOUBLE PRECISION,
ADD COLUMN     "remainingAmount" DOUBLE PRECISION,
ADD COLUMN     "remainingDueDate" TIMESTAMP(3),
ADD COLUMN     "secondPaymentIntentId" TEXT;

-- AlterTable
ALTER TABLE "RatePolicy" ADD COLUMN     "cancellationPolicy" "CancellationPolicy" NOT NULL DEFAULT 'FLEXIBLE',
ADD COLUMN     "paymentStructure" "PaymentStructure" NOT NULL DEFAULT 'FULL_PAYMENT';
