-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('HUSBAND', 'WIFE', 'PARTNER', 'DAUGHTER', 'SON', 'FATHER', 'MOTHER', 'OTHER_RELATIVE', 'FRIEND');

-- CreateTable
CREATE TABLE "GuestRelationShip" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "relatedCustomerId" TEXT NOT NULL,
    "relationshipType" "RelationshipType" NOT NULL,
    "reverseRelationshipType" "RelationshipType" NOT NULL,
    "canBookFor" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestRelationShip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestRelationShip_customerId_idx" ON "GuestRelationShip"("customerId");

-- CreateIndex
CREATE INDEX "GuestRelationShip_relatedCustomerId_idx" ON "GuestRelationShip"("relatedCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestRelationShip_customerId_relatedCustomerId_key" ON "GuestRelationShip"("customerId", "relatedCustomerId");

-- AddForeignKey
ALTER TABLE "GuestRelationShip" ADD CONSTRAINT "GuestRelationShip_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestRelationShip" ADD CONSTRAINT "GuestRelationShip_relatedCustomerId_fkey" FOREIGN KEY ("relatedCustomerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
