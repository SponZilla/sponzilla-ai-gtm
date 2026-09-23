import type { OpportunityV1 } from "@sponzilla/contracts/v1";

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
  externalId: string | null;
  origin: string | null;
}

export interface GTMDecisionContext {
  company: GTMCompanyContext;
  opportunity: GTMOpportunityContext;
  interactions: GTMInteractionContext[];
  /** Canonical MI handoff payload when ingested; null for manual CRM-only deals. */
  intelligence: OpportunityV1 | null;
}