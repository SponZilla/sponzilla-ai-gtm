
-- Step 7J.5
-- Enforce one AWAITING_APPROVAL decision
-- per opportunity at the database level.

CREATE UNIQUE INDEX
  "GTMDecision_one_pending_per_opportunity"
ON "GTMDecision" ("opportunityId")
WHERE status = 'AWAITING_APPROVAL';
