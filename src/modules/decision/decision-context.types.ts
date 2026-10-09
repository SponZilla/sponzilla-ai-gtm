import type { OpportunityV1 } from "@sponzilla/contracts/v1";

import type {
  InteractionType,
  OpportunitySource,
  OpportunityStage,
} from "../../generated/prisma/client.js";

import type {
  GTMDecisionHistoryContext,
} from "./decision-history.types.js";

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

export interface GTMMarketSignalContext {
  type: string;
  description: string;
  detectedAt: Date;
  sourceUrl: string | null;
}

export interface GTMMarketEvidenceContext {
  fact: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  confidence: number;
}

export interface GTMMarketAIInferenceContext {
  audience: string[];
  marketingNeed: string;
  interpretation: string;
  confidence: number;
}

export interface GTMMarketRecommendationContext {
  recommendation: string;
  nextActionHint: string;
}

export interface GTMMarketIntelligenceContext {
  contractVersion: string;
  signals: GTMMarketSignalContext[];
  evidence: GTMMarketEvidenceContext[];
  aiInference: GTMMarketAIInferenceContext | null;
  recommendation: GTMMarketRecommendationContext | null;
}

export interface GTMDecisionContext {
  company: GTMCompanyContext;
  opportunity: GTMOpportunityContext;
  interactions: GTMInteractionContext[];
  history: GTMDecisionHistoryContext;

  /** Canonical MI handoff payload when ingested; null for manual CRM-only deals. */
  intelligence: OpportunityV1 | null;

  /** Structured Market Intelligence context used by the GTM decision engine. */
  marketIntelligence: GTMMarketIntelligenceContext | null;
}