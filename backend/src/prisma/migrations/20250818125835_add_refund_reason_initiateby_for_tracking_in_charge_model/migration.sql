-- AlterTable
ALTER TABLE "Charge" ADD COLUMN     "refundInitiatedBy" TEXT,
ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);
