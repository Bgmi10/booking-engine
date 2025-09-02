-- CreateTable
CREATE TABLE "GuestCheckInAccess" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,

    CONSTRAINT "GuestCheckInAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestCheckInAccess_accessToken_key" ON "GuestCheckInAccess"("accessToken");

-- AddForeignKey
ALTER TABLE "GuestCheckInAccess" ADD CONSTRAINT "GuestCheckInAccess_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
