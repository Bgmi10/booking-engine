-- AlterEnum
ALTER TYPE "ChargeStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "Charge" ADD COLUMN     "paymentUrl" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';
