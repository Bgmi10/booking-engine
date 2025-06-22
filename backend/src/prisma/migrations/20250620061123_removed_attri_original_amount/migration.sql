/*
  Warnings:

  - You are about to drop the column `originalAmount` on the `PaymentIntent` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PaymentIntent" DROP COLUMN "originalAmount";
