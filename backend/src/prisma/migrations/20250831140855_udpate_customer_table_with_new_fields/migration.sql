-- CreateEnum
CREATE TYPE "GENDER" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "BookingPurpose" AS ENUM ('BUSINESS', 'LEISURE', 'EDUCATION');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "BookingPurpose" "BookingPurpose";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "city" TEXT,
ADD COLUMN     "gender" "GENDER",
ADD COLUMN     "passportIssuedCountry" TEXT,
ADD COLUMN     "placeOfBirth" TEXT,
ADD COLUMN     "receiveMarketingEmail" BOOLEAN DEFAULT true,
ADD COLUMN     "tcAgreed" BOOLEAN DEFAULT false;
