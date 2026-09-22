-- CreateEnum
CREATE TYPE "OpportunitySource" AS ENUM ('INBOUND', 'OUTBOUND', 'REFERRAL', 'PARTNER');

-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('NEW', 'CONTACTED', 'INTERESTED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('EMAIL_SENT', 'EMAIL_RECEIVED', 'CALL', 'MEETING', 'NOTE', 'PROPOSAL_SENT', 'PROPOSAL_REQUESTED');

-- CreateEnum
CREATE TYPE "GTMActionType" AS ENUM ('REQUEST_MORE_INFORMATION', 'RESEARCH_COMPANY', 'SEND_INTRODUCTION', 'SEND_CASE_STUDY', 'SEND_CAMPAIGN_PROPOSAL', 'SCHEDULE_DISCOVERY_CALL', 'FOLLOW_UP', 'PREPARE_PRICING', 'ESCALATE_TO_SALES', 'WAIT', 'CLOSE_OPPORTUNITY');

-- CreateEnum
CREATE TYPE "DecisionPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('AWAITING_APPROVAL', 'APPROVED', 'REJECTED', 'DEFERRED', 'EXECUTED', 'FAILED');

-- CreateEnum
CREATE TYPE "EvidenceSourceType" AS ENUM ('COMPANY', 'OPPORTUNITY', 'INTERACTION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('APPROVED', 'REJECTED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "OutcomeType" AS ENUM ('EMAIL_OPENED', 'REPLIED', 'MEETING_BOOKED', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED', 'OPPORTUNITY_WON', 'OPPORTUNITY_LOST');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" "OpportunitySource" NOT NULL,
    "stage" "OpportunityStage" NOT NULL DEFAULT 'NEW',
    "estimatedBudget" DECIMAL(12,2),
    "objective" TEXT,
    "lastInteractionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "summary" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GTMDecision" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "action" "GTMActionType" NOT NULL,
    "priority" "DecisionPriority" NOT NULL,
    "status" "DecisionStatus" NOT NULL DEFAULT 'AWAITING_APPROVAL',
    "summary" TEXT NOT NULL,
    "reasoning" TEXT[],
    "confidence" DECIMAL(5,4) NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "proposedAction" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GTMDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "sourceType" "EvidenceSourceType" NOT NULL,
    "sourceId" TEXT,
    "claim" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT,
    "comment" TEXT,
    "actionSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Execution" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "action" "GTMActionType" NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "actionSnapshot" JSONB NOT NULL,
    "result" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "Execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "type" "OutcomeType" NOT NULL,
    "value" DECIMAL(14,2),
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Opportunity_companyId_idx" ON "Opportunity"("companyId");

-- CreateIndex
CREATE INDEX "Opportunity_stage_idx" ON "Opportunity"("stage");

-- CreateIndex
CREATE INDEX "Opportunity_companyId_stage_idx" ON "Opportunity"("companyId", "stage");

-- CreateIndex
CREATE INDEX "Interaction_opportunityId_idx" ON "Interaction"("opportunityId");

-- CreateIndex
CREATE INDEX "Interaction_opportunityId_occurredAt_idx" ON "Interaction"("opportunityId", "occurredAt");

-- CreateIndex
CREATE INDEX "GTMDecision_opportunityId_createdAt_idx" ON "GTMDecision"("opportunityId", "createdAt");

-- CreateIndex
CREATE INDEX "GTMDecision_status_idx" ON "GTMDecision"("status");

-- CreateIndex
CREATE INDEX "Evidence_decisionId_idx" ON "Evidence"("decisionId");

-- CreateIndex
CREATE INDEX "Evidence_sourceType_sourceId_idx" ON "Evidence"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "Approval_decisionId_createdAt_idx" ON "Approval"("decisionId", "createdAt");

-- CreateIndex
CREATE INDEX "Approval_actorId_idx" ON "Approval"("actorId");

-- CreateIndex
CREATE INDEX "Execution_decisionId_createdAt_idx" ON "Execution"("decisionId", "createdAt");

-- CreateIndex
CREATE INDEX "Execution_approvalId_idx" ON "Execution"("approvalId");

-- CreateIndex
CREATE INDEX "Execution_status_idx" ON "Execution"("status");

-- CreateIndex
CREATE INDEX "Outcome_decisionId_occurredAt_idx" ON "Outcome"("decisionId", "occurredAt");

-- CreateIndex
CREATE INDEX "Outcome_type_idx" ON "Outcome"("type");

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GTMDecision" ADD CONSTRAINT "GTMDecision_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "GTMDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "GTMDecision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "GTMDecision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "GTMDecision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
