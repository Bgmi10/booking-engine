/*
  Warnings:

  - Added the required column `isSoftDeleted` to the `PaymentIntent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PaymentIntent" ADD COLUMN     "isSoftDeleted" BOOLEAN NOT NULL;
