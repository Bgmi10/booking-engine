/*
  Warnings:

  - Added the required column `role` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderItemRole" AS ENUM ('KITCHEN', 'WAITER');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "role" "OrderItemRole" NOT NULL;
