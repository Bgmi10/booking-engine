-- CreateEnum
CREATE TYPE "RatePriceType" AS ENUM ('BASE_OVERRIDE', 'ROOM_INCREASE', 'ROOM_OVERRIDE');

-- CreateTable
CREATE TABLE "RateDatePrice" (
    "id" TEXT NOT NULL,
    "ratePolicyId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "priceType" "RatePriceType" NOT NULL DEFAULT 'ROOM_OVERRIDE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateDatePrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateDatePrice_ratePolicyId_date_isActive_idx" ON "RateDatePrice"("ratePolicyId", "date", "isActive");

-- CreateIndex
CREATE INDEX "RateDatePrice_roomId_date_isActive_idx" ON "RateDatePrice"("roomId", "date", "isActive");

-- CreateIndex
CREATE INDEX "RateDatePrice_date_isActive_idx" ON "RateDatePrice"("date", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RateDatePrice_ratePolicyId_roomId_date_key" ON "RateDatePrice"("ratePolicyId", "roomId", "date");

-- AddForeignKey
ALTER TABLE "RateDatePrice" ADD CONSTRAINT "RateDatePrice_ratePolicyId_fkey" FOREIGN KEY ("ratePolicyId") REFERENCES "RatePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateDatePrice" ADD CONSTRAINT "RateDatePrice_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
