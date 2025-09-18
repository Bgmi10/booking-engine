-- CreateEnum
CREATE TYPE "EnhancementAvailabilityType" AS ENUM ('ALWAYS', 'WEEKLY', 'SPECIFIC_DATES', 'SEASONAL');

-- AlterTable
ALTER TABLE "Enhancement" ADD COLUMN     "availabilityType" "EnhancementAvailabilityType" NOT NULL DEFAULT 'ALWAYS',
ADD COLUMN     "availableTimeEnd" TEXT,
ADD COLUMN     "availableTimeStart" TEXT,
ADD COLUMN     "specificDates" TIMESTAMP(3)[],
ADD COLUMN     "validFrom" TIMESTAMP(3),
ADD COLUMN     "validUntil" TIMESTAMP(3);
