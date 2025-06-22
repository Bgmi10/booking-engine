-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "groupId" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "groupEmail" TEXT,
ADD COLUMN     "groupName" TEXT;
