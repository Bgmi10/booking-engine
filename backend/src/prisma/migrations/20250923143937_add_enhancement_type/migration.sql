-- CreateEnum
CREATE TYPE "EnhancementType" AS ENUM ('PRODUCT', 'EVENT');

-- AlterTable
ALTER TABLE "Enhancement" ADD COLUMN     "type" "EnhancementType" NOT NULL DEFAULT 'PRODUCT';
