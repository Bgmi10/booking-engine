/*
  Warnings:

  - Added the required column `tax` to the `Enhancement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Enhancement" ADD COLUMN     "tax" DOUBLE PRECISION NOT NULL;
