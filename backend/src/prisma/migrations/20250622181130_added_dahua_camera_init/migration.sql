-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "carNumberPlate" TEXT;

-- AlterTable
ALTER TABLE "GeneralSettings" ADD COLUMN     "dahuaApiUrl" TEXT,
ADD COLUMN     "dahuaGateId" TEXT,
ADD COLUMN     "dahuaIsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dahuaLicensePlateExpiryHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "dahuaPassword" TEXT,
ADD COLUMN     "dahuaUsername" TEXT;
