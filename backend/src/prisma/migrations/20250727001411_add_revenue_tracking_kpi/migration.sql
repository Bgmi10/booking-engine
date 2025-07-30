-- CreateEnum
CREATE TYPE "WaiterCashStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'DISCREPANCY', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CashDepositStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'DISCREPANCY', 'LOSS_ACCEPTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ManagerSummaryStatus" AS ENUM ('PENDING', 'FINALIZED', 'REPORTED');

-- CreateTable
CREATE TABLE "CashCalculationSettings" (
    "id" TEXT NOT NULL,
    "calculationPeriodDays" INTEGER NOT NULL DEFAULT 1,
    "resetTime" TEXT NOT NULL DEFAULT '00:00',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashCalculationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaiterCashSummary" (
    "id" TEXT NOT NULL,
    "waiterId" TEXT NOT NULL,
    "summaryDate" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalCashOrders" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outstandingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "WaiterCashStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaiterCashSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashDeposit" (
    "id" TEXT NOT NULL,
    "cashSummaryId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "actualReceived" DOUBLE PRECISION,
    "difference" DOUBLE PRECISION,
    "status" "CashDepositStatus" NOT NULL DEFAULT 'SUBMITTED',
    "depositedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "notes" TEXT,
    "acceptedLoss" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagerDailySummary" (
    "id" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "summaryDate" TIMESTAMP(3) NOT NULL,
    "totalCashDeposited" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCashReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDiscrepancy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAcceptedLoss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waiterCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ManagerSummaryStatus" NOT NULL DEFAULT 'PENDING',
    "finalizedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagerDailySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaiterCashSummary_waiterId_summaryDate_idx" ON "WaiterCashSummary"("waiterId", "summaryDate");

-- CreateIndex
CREATE INDEX "WaiterCashSummary_status_summaryDate_idx" ON "WaiterCashSummary"("status", "summaryDate");

-- CreateIndex
CREATE UNIQUE INDEX "WaiterCashSummary_waiterId_summaryDate_key" ON "WaiterCashSummary"("waiterId", "summaryDate");

-- CreateIndex
CREATE INDEX "CashDeposit_status_depositedAt_idx" ON "CashDeposit"("status", "depositedAt");

-- CreateIndex
CREATE INDEX "CashDeposit_cashSummaryId_idx" ON "CashDeposit"("cashSummaryId");

-- CreateIndex
CREATE INDEX "ManagerDailySummary_managerId_summaryDate_idx" ON "ManagerDailySummary"("managerId", "summaryDate");

-- CreateIndex
CREATE INDEX "ManagerDailySummary_status_summaryDate_idx" ON "ManagerDailySummary"("status", "summaryDate");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerDailySummary_managerId_summaryDate_key" ON "ManagerDailySummary"("managerId", "summaryDate");

-- AddForeignKey
ALTER TABLE "WaiterCashSummary" ADD CONSTRAINT "WaiterCashSummary_waiterId_fkey" FOREIGN KEY ("waiterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaiterCashSummary" ADD CONSTRAINT "WaiterCashSummary_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDeposit" ADD CONSTRAINT "CashDeposit_cashSummaryId_fkey" FOREIGN KEY ("cashSummaryId") REFERENCES "WaiterCashSummary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDeposit" ADD CONSTRAINT "CashDeposit_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerDailySummary" ADD CONSTRAINT "ManagerDailySummary_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
