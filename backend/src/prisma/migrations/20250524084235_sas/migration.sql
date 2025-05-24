/*
  Warnings:

  - A unique constraint covering the columns `[roomId,ratePolicyId]` on the table `RoomRate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "RoomRate_roomId_ratePolicyId_idx" ON "RoomRate"("roomId", "ratePolicyId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomRate_roomId_ratePolicyId_key" ON "RoomRate"("roomId", "ratePolicyId");
