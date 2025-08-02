-- CreateTable
CREATE TABLE "RoomDatePrice" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomDatePrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomDatePrice_roomId_date_isActive_idx" ON "RoomDatePrice"("roomId", "date", "isActive");

-- CreateIndex
CREATE INDEX "RoomDatePrice_date_isActive_idx" ON "RoomDatePrice"("date", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RoomDatePrice_roomId_date_key" ON "RoomDatePrice"("roomId", "date");

-- AddForeignKey
ALTER TABLE "RoomDatePrice" ADD CONSTRAINT "RoomDatePrice_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
