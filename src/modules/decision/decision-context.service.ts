import {
  safeParseOpportunityV1,
  type OpportunityV1,
} from "@sponzilla/contracts/v1";

import { decisionContextRepository } from "./decision-context.repository.js";

import type {
  GTMDecisionContext,
} from "./decision-context.types.js";

export class DecisionOpportunityNotFoundError extends Error {
  constructor() {
    super("Opportunity not found");
    this.name = "DecisionOpportunityNotFoundError";
  }
}

function parseIntelligenceSnapshot(
  snapshot: unknown,
): OpportunityV1 | null {
  if (snapshot == null) {
    return null;
  }

  const parsed = safeParseOpportunityV1(snapshot);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export const decisionContextService = {
  async build(
    opportunityId: string,
  ): Promise<GTMDecisionContext> {
    const record =
      await decisionContextRepository.findOpportunityContext(
        opportunityId,
      );

    if (!record) {
      throw new DecisionOpportunityNotFoundError();
    }

    const intelligence = parseIntelligenceSnapshot(
      record.intelligenceSnapshot,
    );

    return {
      company: {
        id: record.company.id,
        name: record.company.name,
        website: record.company.website,
        industry: record.company.industry,
      },

      opportunity: {
        id: record.id,
        title: record.title,
        source: record.source,
        stage: record.stage,

        estimatedBudget:
          record.estimatedBudget?.toString() ?? null,

        objective: record.objective,

        lastInteractionAt:
          record.lastInteractionAt,

        externalId: record.externalId,
        origin: record.origin,
      },

      interactions: record.interactions.map(
        (interaction) => ({
          id: interaction.id,
          type: interaction.type,
          summary: interaction.summary,
          occurredAt: interaction.occurredAt,
        }),
      ),

      intelligence,
    };
  },
};
