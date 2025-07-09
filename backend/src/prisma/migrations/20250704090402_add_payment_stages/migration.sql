/*
  Warnings:

  - You are about to drop the column `stages` on the `PaymentPlan` table. All the data in the column will be lost.
  - Added the required column `totalAmount` to the `PaymentPlan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentStageStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'OVERDUE', 'CANCELLED');

-- AlterTable
ALTER TABLE "PaymentPlan" DROP COLUMN "stages",
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'eur',
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL;

-- CreateTable
CREATE TABLE "PaymentStage" (
    "id" TEXT NOT NULL,
    "paymentPlanId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "PaymentStageStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT,
    "stripePaymentUrl" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentStage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PaymentStage" ADD CONSTRAINT "PaymentStage_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "PaymentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
