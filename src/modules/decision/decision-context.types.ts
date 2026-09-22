import type {
  InteractionType,
  OpportunitySource,
  OpportunityStage,
} from "../../generated/prisma/client.js";

export interface GTMInteractionContext {
  id: string;
  type: InteractionType;
  summary: string;
  occurredAt: Date;
}

export interface GTMCompanyContext {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
}

export interface GTMOpportunityContext {
  id: string;
  title: string;
  source: OpportunitySource;
  stage: OpportunityStage;
  estimatedBudget: string | null;
  objective: string | null;
  lastInteractionAt: Date | null;
}

export interface GTMDecisionContext {
  company: GTMCompanyContext;
  opportunity: GTMOpportunityContext;
  interactions: GTMInteractionContext[];
}