/*
  Warnings:

  - A unique constraint covering the columns `[guestEmail]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Customer_guestEmail_key" ON "Customer"("guestEmail");
