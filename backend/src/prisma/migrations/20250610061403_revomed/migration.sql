/*
  Warnings:

  - You are about to drop the `EmailQueue` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EmailQueue" DROP CONSTRAINT "EmailQueue_paymentIntentId_fkey";

-- DropTable
DROP TABLE "EmailQueue";

-- DropEnum
DROP TYPE "EmailQueueStatus";
