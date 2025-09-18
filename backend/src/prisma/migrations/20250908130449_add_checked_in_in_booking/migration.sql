/*
  Warnings:

  - The values [OTHERS] on the enum `GENDER` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditActionType" ADD VALUE 'GROUP_CHECK_IN';
ALTER TYPE "AuditActionType" ADD VALUE 'GROUP_CHECKOUT';
ALTER TYPE "AuditActionType" ADD VALUE 'CHECKOUT_PROCESSED';

-- AlterEnum
BEGIN;
CREATE TYPE "GENDER_new" AS ENUM ('MALE', 'FEMALE');
ALTER TABLE "Customer" ALTER COLUMN "gender" TYPE "GENDER_new" USING ("gender"::text::"GENDER_new");
ALTER TYPE "GENDER" RENAME TO "GENDER_old";
ALTER TYPE "GENDER_new" RENAME TO "GENDER";
DROP TYPE "GENDER_old";
COMMIT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "checkedIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "checkedOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "checkedOutAt" TIMESTAMP(3);
