/*
  Warnings:

  - You are about to drop the `RoomDatePrice` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RoomDatePrice" DROP CONSTRAINT "RoomDatePrice_roomId_fkey";

-- DropTable
DROP TABLE "RoomDatePrice";
