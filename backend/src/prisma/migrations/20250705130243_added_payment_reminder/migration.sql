-- CreateTable
CREATE TABLE "PaymentReminder" (
    "id" TEXT NOT NULL,
    "paymentStageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentReminder_paymentStageId_idx" ON "PaymentReminder"("paymentStageId");

-- CreateIndex
CREATE INDEX "PaymentReminder_type_idx" ON "PaymentReminder"("type");

-- CreateIndex
CREATE INDEX "PaymentReminder_sentAt_idx" ON "PaymentReminder"("sentAt");

-- AddForeignKey
ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_paymentStageId_fkey" FOREIGN KEY ("paymentStageId") REFERENCES "PaymentStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
