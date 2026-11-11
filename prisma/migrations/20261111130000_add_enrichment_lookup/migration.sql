-- Cache of provider enrichment answers, keyed by the identity we looked up.
-- A hit means the answer is stored; hit = false records a miss so a repeat
-- question is not paid for twice.
CREATE TABLE "EnrichmentLookup" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "keyType" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lookupKey" TEXT NOT NULL,
    "hit" BOOLEAN NOT NULL,
    "email" TEXT,
    "emailStatus" "EmailStatus",
    "confidence" INTEGER,
    "sourceUrl" TEXT,
    "linkedinUrl" TEXT,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrichmentLookup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnrichmentLookup_provider_keyType_keyHash_key" ON "EnrichmentLookup"("provider", "keyType", "keyHash");

CREATE INDEX "EnrichmentLookup_expiresAt_idx" ON "EnrichmentLookup"("expiresAt");

-- Same posture as the other GTM tables: reachable by the server only.
ALTER TABLE "EnrichmentLookup" ENABLE ROW LEVEL SECURITY;
