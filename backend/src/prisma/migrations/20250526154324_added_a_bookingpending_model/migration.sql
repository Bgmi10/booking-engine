-- CreateTable
CREATE TABLE "PendingBooking" (
    "id" TEXT NOT NULL,
    "bookingData" TEXT NOT NULL,
    "customerData" TEXT NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingBooking_pkey" PRIMARY KEY ("id")
);
