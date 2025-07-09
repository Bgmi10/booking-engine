-- DropForeignKey
ALTER TABLE "PaymentReminder" DROP CONSTRAINT "PaymentReminder_paymentStageId_fkey";

-- AddForeignKey
ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_paymentStageId_fkey" FOREIGN KEY ("paymentStageId") REFERENCES "PaymentStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
