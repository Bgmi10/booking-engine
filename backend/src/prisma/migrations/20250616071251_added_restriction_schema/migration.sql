-- CreateEnum
CREATE TYPE "RestrictionType" AS ENUM ('CLOSE_TO_STAY', 'CLOSE_TO_ARRIVAL', 'CLOSE_TO_DEPARTURE', 'MIN_LENGTH', 'MAX_LENGTH', 'ADVANCE_BOOKING');

-- CreateEnum
CREATE TYPE "RateScope" AS ENUM ('ALL_RATES', 'SPECIFIC_RATES', 'BASE_RATE');

-- CreateEnum
CREATE TYPE "RoomScope" AS ENUM ('ALL_ROOMS', 'SPECIFIC_ROOMS');

-- CreateTable
CREATE TABLE "BookingRestriction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "RestrictionType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "daysOfWeek" INTEGER[],
    "rateScope" "RateScope" NOT NULL DEFAULT 'ALL_RATES',
    "ratePolicyIds" TEXT[],
    "roomScope" "RoomScope" NOT NULL DEFAULT 'ALL_ROOMS',
    "roomIds" TEXT[],
    "minLength" INTEGER,
    "maxLength" INTEGER,
    "minAdvance" INTEGER,
    "maxAdvance" INTEGER,
    "sameDayCutoffTime" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestrictionException" (
    "id" TEXT NOT NULL,
    "bookingRestrictionId" TEXT NOT NULL,
    "minLengthOverride" INTEGER,
    "maxLengthOverride" INTEGER,
    "exceptionStartDate" TIMESTAMP(3),
    "exceptionEndDate" TIMESTAMP(3),
    "exceptionDaysOfWeek" INTEGER[],
    "rateScope" "RateScope",
    "ratePolicyIds" TEXT[],
    "roomScope" "RoomScope",
    "roomIds" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestrictionException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingRestriction_startDate_endDate_idx" ON "BookingRestriction"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "BookingRestriction_type_isActive_idx" ON "BookingRestriction"("type", "isActive");

-- CreateIndex
CREATE INDEX "RestrictionException_exceptionStartDate_exceptionEndDate_idx" ON "RestrictionException"("exceptionStartDate", "exceptionEndDate");

-- AddForeignKey
ALTER TABLE "RestrictionException" ADD CONSTRAINT "RestrictionException_bookingRestrictionId_fkey" FOREIGN KEY ("bookingRestrictionId") REFERENCES "BookingRestriction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
