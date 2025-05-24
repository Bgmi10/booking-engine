-- AlterTable
ALTER TABLE "RatePolicy" ALTER COLUMN "refundable" DROP NOT NULL,
ALTER COLUMN "prepayPercentage" DROP NOT NULL,
ALTER COLUMN "fullPaymentDays" DROP NOT NULL,
ALTER COLUMN "changeAllowedDays" DROP NOT NULL,
ALTER COLUMN "rebookValidityDays" DROP NOT NULL;
