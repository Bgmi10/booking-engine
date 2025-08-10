-- AlterTable
ALTER TABLE "BulkOverRideLogs" ADD COLUMN     "daysAffected" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
