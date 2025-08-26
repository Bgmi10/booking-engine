/*
  Warnings:

  - You are about to drop the column `groupEmail` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `groupName` on the `Customer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BookingGroup" ADD COLUMN     "mainGuestId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "groupEmail",
DROP COLUMN "groupName";

-- AddForeignKey
ALTER TABLE "BookingGroup" ADD CONSTRAINT "BookingGroup_mainGuestId_fkey" FOREIGN KEY ("mainGuestId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
