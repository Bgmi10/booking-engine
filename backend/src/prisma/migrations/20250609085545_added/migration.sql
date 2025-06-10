/*
  Warnings:

  - You are about to drop the column `metadata` on the `EmailTemplate` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "EmailTemplate_type_version_key";

-- AlterTable
ALTER TABLE "EmailTemplate" DROP COLUMN "metadata",
ADD COLUMN     "design" TEXT,
ALTER COLUMN "variables" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "EmailTemplate_type_isActive_idx" ON "EmailTemplate"("type", "isActive");
