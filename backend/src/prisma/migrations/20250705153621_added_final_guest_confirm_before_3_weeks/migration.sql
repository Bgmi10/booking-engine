-- AlterTable
ALTER TABLE "wedding_proposals" ADD COLUMN     "finalGuestConfirmationSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "finalGuestConfirmationSentAt" TIMESTAMP(3),
ADD COLUMN     "finalGuestCountConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "finalGuestCountConfirmedAt" TIMESTAMP(3);
