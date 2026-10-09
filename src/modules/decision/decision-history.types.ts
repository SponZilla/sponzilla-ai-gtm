import type {
  GTMActionType,
  OutcomeType,
} from "../../generated/prisma/client.js";

export interface GTMHistoricalOutcomeContext {
  id: string;

  type: OutcomeType;

  value: string | null;

  occurredAt: Date;
}

export interface GTMHistoricalDecisionContext {
  decisionId: string;

  action: GTMActionType;

  summary: string;

  confidence: number;

  executedAt: Date | null;

  outcomes:
    GTMHistoricalOutcomeContext[];
}

export interface GTMDecisionHistoryContext {
  decisions:
    GTMHistoricalDecisionContext[];

  totalDecisions: number;

  successfulOutcomes: number;

  negativeOutcomes: number;
}