-- DropForeignKey
ALTER TABLE "BookingGroup" DROP CONSTRAINT "BookingGroup_mainGuestId_fkey";

-- AddForeignKey
ALTER TABLE "BookingGroup" ADD CONSTRAINT "BookingGroup_mainGuestId_fkey" FOREIGN KEY ("mainGuestId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
