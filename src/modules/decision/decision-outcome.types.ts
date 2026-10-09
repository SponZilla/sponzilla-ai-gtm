import type {
  OutcomeType,
} from "../../generated/prisma/client.js";

export interface RecordDecisionOutcomeInput {
  type: OutcomeType;

  value?: number;

  metadata?: Record<
    string,
    unknown
  >;

  occurredAt: Date;
}