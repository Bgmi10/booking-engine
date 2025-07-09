/*
  Warnings:

  - You are about to drop the `WeddingProposal` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ItineraryDay" DROP CONSTRAINT "ItineraryDay_proposalId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentPlan" DROP CONSTRAINT "PaymentPlan_proposalId_fkey";

-- DropForeignKey
ALTER TABLE "WeddingProposal" DROP CONSTRAINT "WeddingProposal_customerId_fkey";

-- DropTable
DROP TABLE "WeddingProposal";

-- CreateTable
CREATE TABLE "wedding_proposals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "weddingDate" TIMESTAMP(3) NOT NULL,
    "mainGuestCount" INTEGER NOT NULL,
    "termsAndConditions" TEXT,
    "customerId" TEXT NOT NULL,
    "holdExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentEmailCount" INTEGER NOT NULL DEFAULT 0,
    "lastEmailSentAt" TIMESTAMP(3),

    CONSTRAINT "wedding_proposals_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "wedding_proposals" ADD CONSTRAINT "wedding_proposals_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryDay" ADD CONSTRAINT "ItineraryDay_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "wedding_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "wedding_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
