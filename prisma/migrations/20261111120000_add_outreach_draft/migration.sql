-- CreateEnum
CREATE TYPE "OutreachDraftStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "OutreachDraft" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "action" "GTMActionType" NOT NULL DEFAULT 'SEND_INTRODUCTION',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "OutreachDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "modelVersion" TEXT,
    "promptVersion" TEXT,
    "inputSnapshot" JSONB,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutreachDraft_opportunityId_idx" ON "OutreachDraft"("opportunityId");

-- CreateIndex
CREATE INDEX "OutreachDraft_contactId_idx" ON "OutreachDraft"("contactId");

-- CreateIndex
CREATE INDEX "OutreachDraft_status_idx" ON "OutreachDraft"("status");

-- AddForeignKey
ALTER TABLE "OutreachDraft" ADD CONSTRAINT "OutreachDraft_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachDraft" ADD CONSTRAINT "OutreachDraft_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Server-only access path: RLS on, no client policies (matches the existing
-- tables; Prisma reaches this table with the database role).
ALTER TABLE "OutreachDraft" ENABLE ROW LEVEL SECURITY;
