-- CreateTable
CREATE TABLE "RevenueSettings" (
    "id" TEXT NOT NULL,
    "autoReminders" BOOLEAN NOT NULL DEFAULT true,
    "reminderTime" TEXT NOT NULL DEFAULT '18:00',
    "discrepancyThreshold" DOUBLE PRECISION NOT NULL DEFAULT 10.00,
    "autoFinalizeDays" INTEGER NOT NULL DEFAULT 3,
    "managerEmail" BOOLEAN NOT NULL DEFAULT true,
    "discrepancyAlerts" BOOLEAN NOT NULL DEFAULT true,
    "dailySummaryEmail" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueSettings_pkey" PRIMARY KEY ("id")
);
