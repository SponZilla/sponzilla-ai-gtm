-- A research run id identifies a card per user, not a single row for everyone.
-- Global uniqueness made one user's ingest overwrite the owner of another
-- user's card, so the constraint becomes a lookup index instead: code keys on
-- (externalId, ownerId).
DROP INDEX "Opportunity_externalId_key";

CREATE INDEX "Opportunity_externalId_ownerId_idx" ON "Opportunity"("externalId", "ownerId");
