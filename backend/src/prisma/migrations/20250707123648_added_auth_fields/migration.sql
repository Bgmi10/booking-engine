-- DropIndex
DROP INDEX "Otp_email_key";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "accountActivated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailVerifyToken" TEXT,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "password" TEXT,
ADD COLUMN     "temporaryAccessToken" TEXT;

-- CreateIndex
CREATE INDEX "Otp_email_otp_idx" ON "Otp"("email", "otp");
