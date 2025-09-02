-- DropForeignKey
ALTER TABLE "GuestCheckInAccess" DROP CONSTRAINT "GuestCheckInAccess_customerId_fkey";

-- AddForeignKey
ALTER TABLE "GuestCheckInAccess" ADD CONSTRAINT "GuestCheckInAccess_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
