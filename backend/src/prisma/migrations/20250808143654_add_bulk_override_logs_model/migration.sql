-- CreateEnum
CREATE TYPE "ActionTypeEnum" AS ENUM ('BULK_OVERRIDE', 'BULK_INCREASE', 'BULK_DECREASE');

-- CreateTable
CREATE TABLE "BulkOverRideLogs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ratePolicyId" TEXT NOT NULL,
    "actionType" "ActionTypeEnum" NOT NULL,
    "dateRangeStart" TIMESTAMP(3) NOT NULL,
    "dateRangeEnd" TIMESTAMP(3) NOT NULL,
    "roomsAffected" TEXT[],
    "overRideDetails" JSONB NOT NULL,
    "totalRoomsAffected" INTEGER NOT NULL DEFAULT 0,
    "totalDatesAffected" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulkOverRideLogs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BulkOverRideLogs" ADD CONSTRAINT "BulkOverRideLogs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkOverRideLogs" ADD CONSTRAINT "BulkOverRideLogs_ratePolicyId_fkey" FOREIGN KEY ("ratePolicyId") REFERENCES "RatePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
