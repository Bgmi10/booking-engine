-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('PENDING', 'QUOTED', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('GUEST', 'ADMIN');

-- CreateTable
CREATE TABLE "ExternalVendor" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "proposalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeddingServiceRequest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "price" DOUBLE PRECISION,
    "guestCount" INTEGER,
    "proposalId" TEXT NOT NULL,
    "itineraryDayId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeddingServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeddingServiceMessage" (
    "id" TEXT NOT NULL,
    "text" TEXT,
    "sender" "MessageSender" NOT NULL,
    "requestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeddingServiceMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeddingServiceAttachment" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeddingServiceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalVendor_proposalId_idx" ON "ExternalVendor"("proposalId");

-- CreateIndex
CREATE INDEX "WeddingServiceRequest_proposalId_idx" ON "WeddingServiceRequest"("proposalId");

-- CreateIndex
CREATE INDEX "WeddingServiceRequest_itineraryDayId_idx" ON "WeddingServiceRequest"("itineraryDayId");

-- CreateIndex
CREATE INDEX "WeddingServiceMessage_requestId_idx" ON "WeddingServiceMessage"("requestId");

-- CreateIndex
CREATE INDEX "WeddingServiceAttachment_messageId_idx" ON "WeddingServiceAttachment"("messageId");

-- AddForeignKey
ALTER TABLE "ExternalVendor" ADD CONSTRAINT "ExternalVendor_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "wedding_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingServiceRequest" ADD CONSTRAINT "WeddingServiceRequest_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "wedding_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingServiceRequest" ADD CONSTRAINT "WeddingServiceRequest_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "ItineraryDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingServiceMessage" ADD CONSTRAINT "WeddingServiceMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "WeddingServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingServiceAttachment" ADD CONSTRAINT "WeddingServiceAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "WeddingServiceMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
