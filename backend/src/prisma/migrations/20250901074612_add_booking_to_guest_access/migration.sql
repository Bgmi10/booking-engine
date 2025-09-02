/*
  Warnings:

  - You are about to drop the column `tokenExpriesAt` on the `GuestCheckInAccess` table. All the data in the column will be lost.
  - Added the required column `bookingId` to the `GuestCheckInAccess` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tokenExpiresAt` to the `GuestCheckInAccess` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `GuestCheckInAccess` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GuestCheckInAccess" DROP COLUMN "tokenExpriesAt",
ADD COLUMN     "bookingId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "GuestCheckInAccess" ADD CONSTRAINT "GuestCheckInAccess_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
