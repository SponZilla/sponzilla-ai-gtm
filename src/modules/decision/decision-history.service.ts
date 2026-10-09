import {
  decisionHistoryRepository,
} from "./decision-history.repository.js";

import type {
  GTMDecisionHistoryContext,
} from "./decision-history.types.js";

const POSITIVE_OUTCOMES =
  new Set([
    "REPLIED",
    "MEETING_BOOKED",
    "PROPOSAL_ACCEPTED",
    "OPPORTUNITY_WON",
  ]);

const NEGATIVE_OUTCOMES =
  new Set([
    "PROPOSAL_REJECTED",
    "OPPORTUNITY_LOST",
  ]);

export const decisionHistoryService = {
  async buildForOpportunity(
    opportunityId: string,
  ): Promise<GTMDecisionHistoryContext> {
    const decisions =
      await decisionHistoryRepository
        .findRecentExecutedByOpportunity(
          opportunityId,
        );

    let successfulOutcomes = 0;
    let negativeOutcomes = 0;

    const historicalDecisions =
      decisions.map(
        (decision) => {
          const outcomes =
            decision.outcomes.map(
              (outcome) => {
                if (
                  POSITIVE_OUTCOMES.has(
                    outcome.type,
                  )
                ) {
                  successfulOutcomes += 1;
                }

                if (
                  NEGATIVE_OUTCOMES.has(
                    outcome.type,
                  )
                ) {
                  negativeOutcomes += 1;
                }

                return {
                  id:
                    outcome.id,

                  type:
                    outcome.type,

                  value:
                    outcome.value
                      ?.toString() ??
                    null,

                  occurredAt:
                    outcome.occurredAt,
                };
              },
            );

          return {
            decisionId:
              decision.id,

            action:
              decision.action,

            summary:
              decision.summary,

            confidence:
              Number(
                decision.confidence,
              ),

            executedAt:
              decision.executions[0]
                ?.executedAt ??
              null,

            outcomes,
          };
        },
      );

    return {
      decisions:
        historicalDecisions,

      totalDecisions:
        historicalDecisions.length,

      successfulOutcomes,

      negativeOutcomes,
    };
  },
};