-- Cards belong to the operator who claimed them. NULL means unclaimed intake,
-- which any operator may pick up; once claimed, only that operator sees it.
ALTER TABLE "Opportunity" ADD COLUMN "ownerId" TEXT;

CREATE INDEX "Opportunity_ownerId_idx" ON "Opportunity"("ownerId");
