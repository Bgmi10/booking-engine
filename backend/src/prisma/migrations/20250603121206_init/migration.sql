-- CreateIndex
CREATE INDEX "PendingBooking_expiresAt_idx" ON "PendingBooking"("expiresAt");

-- CreateIndex
CREATE INDEX "TemporaryHold_expiresAt_idx" ON "TemporaryHold"("expiresAt");
