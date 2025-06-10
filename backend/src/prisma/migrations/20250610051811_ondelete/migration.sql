-- DropForeignKey
ALTER TABLE "EmailQueue" DROP CONSTRAINT "EmailQueue_paymentIntentId_fkey";

-- AddForeignKey
ALTER TABLE "EmailQueue" ADD CONSTRAINT "EmailQueue_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
