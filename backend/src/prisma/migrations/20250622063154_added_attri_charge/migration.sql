-- AlterEnum
ALTER TYPE "ChargeStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "Charge" ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3);
