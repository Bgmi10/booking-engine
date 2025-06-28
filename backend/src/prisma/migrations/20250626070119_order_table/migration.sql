-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'ASSIGNED', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "customerId" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "items" JSONB NOT NULL,
    "locationName" TEXT NOT NULL,
    "assignedToKitchen" TEXT,
    "assignedToWaiter" TEXT,
    "kitchenAssignedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "waiterAssignedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_assignedToKitchen_idx" ON "Order"("assignedToKitchen");

-- CreateIndex
CREATE INDEX "Order_assignedToWaiter_idx" ON "Order"("assignedToWaiter");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_locationName_fkey" FOREIGN KEY ("locationName") REFERENCES "Location"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedToKitchen_fkey" FOREIGN KEY ("assignedToKitchen") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedToWaiter_fkey" FOREIGN KEY ("assignedToWaiter") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
