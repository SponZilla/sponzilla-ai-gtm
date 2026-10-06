-- AlterEnum
ALTER TYPE "OpportunitySource" ADD VALUE 'MARKET_INTELLIGENCE';

-- CreateTable
CREATE TABLE "MarketIntelligenceOpportunity" (
    "id" TEXT NOT NULL,
    "externalOpportunityId" TEXT NOT NULL,
    "contractVersion" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "audience" TEXT[],
    "marketingNeed" TEXT NOT NULL,
    "interpretation" TEXT NOT NULL,
    "inferenceConfidence" DECIMAL(5,4) NOT NULL,
    "recommendation" TEXT NOT NULL,
    "nextActionHint" TEXT NOT NULL,
    "signals" JSONB NOT NULL,
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketIntelligenceOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketIntelligenceOpportunity_externalOpportunityId_key" ON "MarketIntelligenceOpportunity"("externalOpportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketIntelligenceOpportunity_opportunityId_key" ON "MarketIntelligenceOpportunity"("opportunityId");

-- CreateIndex
CREATE INDEX "MarketIntelligenceOpportunity_createdAt_idx" ON "MarketIntelligenceOpportunity"("createdAt");

-- AddForeignKey
ALTER TABLE "MarketIntelligenceOpportunity" ADD CONSTRAINT "MarketIntelligenceOpportunity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
