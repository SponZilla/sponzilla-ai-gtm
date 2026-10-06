import {
  safeParseOpportunityV1,
  type OpportunityV1,
} from "@sponzilla/contracts/v1";

import { z } from "zod";

import { decisionContextRepository } from "./decision-context.repository.js";

import type {
  GTMDecisionContext,
} from "./decision-context.types.js";

const storedSignalSchema = z.object({
  type: z.string(),
  description: z.string(),
  detectedAt: z.string().date(),
  sourceUrl: z.string().nullable().optional(),
});

const storedEvidenceSchema = z.object({
  fact: z.string(),
  sourceUrl: z.string().nullable().optional(),
  sourceTitle: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
});

const storedSignalsSchema = z.array(
  storedSignalSchema,
);

const storedEvidenceListSchema = z.array(
  storedEvidenceSchema,
);

export class DecisionOpportunityNotFoundError extends Error {
  constructor() {
    super("Opportunity not found");
    this.name =
      "DecisionOpportunityNotFoundError";
  }
}

function parseIntelligenceSnapshot(
  snapshot: unknown,
): OpportunityV1 | null {
  if (snapshot == null) {
    return null;
  }

  const parsed =
    safeParseOpportunityV1(snapshot);

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

    /*
     * Canonical Market Intelligence handoff.
     * This comes from the intelligenceSnapshot
     * introduced by the remote implementation.
     */
    const intelligence =
      parseIntelligenceSnapshot(
        record.intelligenceSnapshot,
      );

    /*
     * Structured Market Intelligence context
     * used directly by the GTM decision engine.
     */
    let marketIntelligence:
      GTMDecisionContext["marketIntelligence"] =
      null;

    if (record.marketIntelligence) {
      const storedSignals =
        storedSignalsSchema.parse(
          record.marketIntelligence.signals,
        );

      const storedEvidence =
        storedEvidenceListSchema.parse(
          record.marketIntelligence.evidence,
        );

      marketIntelligence = {
        contractVersion:
          record.marketIntelligence
            .contractVersion,

        signals: storedSignals.map(
          (signal) => ({
            type: signal.type,

            description:
              signal.description,

            detectedAt: new Date(
              signal.detectedAt,
            ),

            sourceUrl:
              signal.sourceUrl ?? null,
          }),
        ),

        evidence: storedEvidence.map(
          (evidence) => ({
            fact:
              evidence.fact,

            sourceUrl:
              evidence.sourceUrl ?? null,

            sourceTitle:
              evidence.sourceTitle ?? null,

            confidence:
              evidence.confidence,
          }),
        ),

        aiInference: {
          audience:
            record.marketIntelligence
              .audience,

          marketingNeed:
            record.marketIntelligence
              .marketingNeed,

          interpretation:
            record.marketIntelligence
              .interpretation,

          confidence: Number(
            record.marketIntelligence
              .inferenceConfidence,
          ),
        },

        recommendation: {
          recommendation:
            record.marketIntelligence
              .recommendation,

          nextActionHint:
            record.marketIntelligence
              .nextActionHint,
        },
      };
    }

    return {
      company: {
        id:
          record.company.id,

        name:
          record.company.name,

        website:
          record.company.website,

        industry:
          record.company.industry,
      },

      opportunity: {
        id:
          record.id,

        title:
          record.title,

        source:
          record.source,

        stage:
          record.stage,

        estimatedBudget:
          record.estimatedBudget?.toString() ??
          null,

        objective:
          record.objective,

        lastInteractionAt:
          record.lastInteractionAt,

        externalId:
          record.externalId,

        origin:
          record.origin,
      },

      interactions:
        record.interactions.map(
          (interaction) => ({
            id:
              interaction.id,

            type:
              interaction.type,

            summary:
              interaction.summary,

            occurredAt:
              interaction.occurredAt,
          }),
        ),

      /*
       * Preserve both MI representations:
       *
       * intelligence:
       * canonical OpportunityV1 payload.
       *
       * marketIntelligence:
       * normalized decision-engine context.
       */
      intelligence,
      marketIntelligence,
    };
  },
};