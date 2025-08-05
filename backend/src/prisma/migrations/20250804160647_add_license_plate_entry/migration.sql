-- CreateEnum
CREATE TYPE "LicensePlateType" AS ENUM ('ALLOW_LIST', 'BLOCK_LIST');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "numberPlate" TEXT;

-- CreateTable
CREATE TABLE "LicensePlateEntry" (
    "id" TEXT NOT NULL,
    "plateNo" TEXT NOT NULL,
    "type" "LicensePlateType" NOT NULL DEFAULT 'ALLOW_LIST',
    "ownerName" TEXT NOT NULL,
    "validStartTime" TIMESTAMP(3) NOT NULL,
    "validEndTime" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "bookingId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicensePlateEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LicensePlateEntry_plateNo_key" ON "LicensePlateEntry"("plateNo");

-- CreateIndex
CREATE INDEX "LicensePlateEntry_plateNo_type_isActive_idx" ON "LicensePlateEntry"("plateNo", "type", "isActive");

-- CreateIndex
CREATE INDEX "LicensePlateEntry_validStartTime_validEndTime_idx" ON "LicensePlateEntry"("validStartTime", "validEndTime");

-- CreateIndex
CREATE INDEX "LicensePlateEntry_userId_idx" ON "LicensePlateEntry"("userId");

-- CreateIndex
CREATE INDEX "LicensePlateEntry_bookingId_idx" ON "LicensePlateEntry"("bookingId");

-- AddForeignKey
ALTER TABLE "LicensePlateEntry" ADD CONSTRAINT "LicensePlateEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
