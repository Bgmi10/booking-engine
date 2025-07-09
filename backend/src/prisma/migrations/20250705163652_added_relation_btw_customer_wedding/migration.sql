-- DropForeignKey
ALTER TABLE "wedding_proposals" DROP CONSTRAINT "wedding_proposals_customerId_fkey";

-- CreateIndex
CREATE INDEX "wedding_proposals_customerId_idx" ON "wedding_proposals"("customerId");

-- CreateIndex
CREATE INDEX "wedding_proposals_status_weddingDate_idx" ON "wedding_proposals"("status", "weddingDate");

-- AddForeignKey
ALTER TABLE "wedding_proposals" ADD CONSTRAINT "wedding_proposals_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
