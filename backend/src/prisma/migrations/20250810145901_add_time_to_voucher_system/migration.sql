-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN     "validFromTime" TEXT DEFAULT '00:00',
ADD COLUMN     "validTillTime" TEXT DEFAULT '23:59';
