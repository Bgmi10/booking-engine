-- AlterTable
ALTER TABLE "RatePolicy" ADD COLUMN     "discountPercentage" DOUBLE PRECISION,
ALTER COLUMN "nightlyRate" DROP NOT NULL;
