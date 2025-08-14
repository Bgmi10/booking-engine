-- CreateTable
CREATE TABLE "Beds24RatePolicyMapping" (
    "id" TEXT NOT NULL,
    "beds24RoomMappingId" TEXT NOT NULL,
    "ratePolicyId" TEXT NOT NULL,
    "priceSlot" INTEGER NOT NULL DEFAULT 1,
    "markupPercent" DOUBLE PRECISION,
    "channelRateCode" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Beds24RatePolicyMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Beds24RatePolicyMapping_isActive_idx" ON "Beds24RatePolicyMapping"("isActive");

-- CreateIndex
CREATE INDEX "Beds24RatePolicyMapping_beds24RoomMappingId_idx" ON "Beds24RatePolicyMapping"("beds24RoomMappingId");

-- CreateIndex
CREATE UNIQUE INDEX "Beds24RatePolicyMapping_beds24RoomMappingId_ratePolicyId_key" ON "Beds24RatePolicyMapping"("beds24RoomMappingId", "ratePolicyId");

-- CreateIndex
CREATE UNIQUE INDEX "Beds24RatePolicyMapping_beds24RoomMappingId_priceSlot_key" ON "Beds24RatePolicyMapping"("beds24RoomMappingId", "priceSlot");

-- AddForeignKey
ALTER TABLE "Beds24RatePolicyMapping" ADD CONSTRAINT "Beds24RatePolicyMapping_beds24RoomMappingId_fkey" FOREIGN KEY ("beds24RoomMappingId") REFERENCES "Beds24RoomMapping"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beds24RatePolicyMapping" ADD CONSTRAINT "Beds24RatePolicyMapping_ratePolicyId_fkey" FOREIGN KEY ("ratePolicyId") REFERENCES "RatePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
