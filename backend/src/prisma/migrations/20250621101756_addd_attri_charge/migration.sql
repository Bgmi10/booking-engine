-- AlterTable
ALTER TABLE "Charge" ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT;
