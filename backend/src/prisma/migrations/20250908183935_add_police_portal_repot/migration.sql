-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "policeReportError" TEXT,
ADD COLUMN     "policeReportedAt" TIMESTAMP(3),
ADD COLUMN     "reportedToPolice" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Booking_reportedToPolice_checkIn_idx" ON "Booking"("reportedToPolice", "checkIn");
