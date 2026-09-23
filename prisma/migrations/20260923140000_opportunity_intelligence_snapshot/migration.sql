-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN "externalId" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "intelligenceSnapshot" JSONB;
ALTER TABLE "Opportunity" ADD COLUMN "origin" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_externalId_key" ON "Opportunity"("externalId");
