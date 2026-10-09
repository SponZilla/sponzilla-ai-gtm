import {
  safeParseOpportunityV1,
  type OpportunityV1,
} from "@sponzilla/contracts/v1";

import {
  z,
} from "zod";

import {
  decisionContextRepository,
} from "./decision-context.repository.js";

import {
  decisionHistoryService,
} from "./decision-history.service.js";

import type {
  GTMDecisionContext,
} from "./decision-context.types.js";

/*
 * Stored Market Intelligence validation.
 *
 * These schemas protect the decision layer
 * from malformed JSON stored in the database.
 */
const storedSignalSchema = z.object({
  type: z.string(),

  description: z.string(),

  detectedAt:
    z.string().date(),

  sourceUrl:
    z.string()
      .nullable()
      .optional(),
});

const storedEvidenceSchema = z.object({
  fact: z.string(),

  sourceUrl:
    z.string()
      .nullable()
      .optional(),

  sourceTitle:
    z.string()
      .nullable()
      .optional(),

  confidence:
    z.number()
      .min(0)
      .max(1),
});

const storedSignalsSchema =
  z.array(
    storedSignalSchema,
  );

const storedEvidenceListSchema =
  z.array(
    storedEvidenceSchema,
  );

export class DecisionOpportunityNotFoundError
  extends Error {
  constructor() {
    super(
      "Opportunity not found",
    );

    this.name =
      "DecisionOpportunityNotFoundError";
  }
}

/**
 * Safely parses the canonical Market
 * Intelligence OpportunityV1 snapshot.
 *
 * Invalid or unavailable snapshots are
 * treated as absent rather than crashing
 * decision-context generation.
 */
function parseIntelligenceSnapshot(
  snapshot: unknown,
): OpportunityV1 | null {
  if (snapshot == null) {
    return null;
  }

  const parsed =
    safeParseOpportunityV1(
      snapshot,
    );

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export const decisionContextService = {
  async build(
    opportunityId: string,
  ): Promise<GTMDecisionContext> {
    /*
     * Load the primary opportunity context.
     */
    const record =
      await decisionContextRepository
        .findOpportunityContext(
          opportunityId,
        );

    if (!record) {
      throw new DecisionOpportunityNotFoundError();
    }

    /*
     * Build historical GTM context only after
     * confirming that the opportunity exists.
     *
     * This includes previous executed decisions
     * and their recorded outcomes.
     */
    const history =
      await decisionHistoryService
        .buildForOpportunity(
          opportunityId,
        );

    /*
     * Canonical Market Intelligence handoff.
     *
     * This preserves the OpportunityV1 payload
     * stored in intelligenceSnapshot.
     */
    const intelligence =
      parseIntelligenceSnapshot(
        record.intelligenceSnapshot,
      );

    /*
     * Normalized Market Intelligence context
     * consumed directly by the GTM decision
     * engine.
     */
    let marketIntelligence:
      GTMDecisionContext["marketIntelligence"] =
      null;

    if (
      record.marketIntelligence
    ) {
      const storedSignals =
        storedSignalsSchema.parse(
          record.marketIntelligence
            .signals,
        );

      const storedEvidence =
        storedEvidenceListSchema.parse(
          record.marketIntelligence
            .evidence,
        );

      marketIntelligence = {
        contractVersion:
          record.marketIntelligence
            .contractVersion,

        signals:
          storedSignals.map(
            (signal) => ({
              type:
                signal.type,

              description:
                signal.description,

              detectedAt:
                new Date(
                  signal.detectedAt,
                ),

              sourceUrl:
                signal.sourceUrl ??
                null,
            }),
          ),

        evidence:
          storedEvidence.map(
            (evidence) => ({
              fact:
                evidence.fact,

              sourceUrl:
                evidence.sourceUrl ??
                null,

              sourceTitle:
                evidence.sourceTitle ??
                null,

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

          confidence:
            Number(
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

    /*
     * Final decision context.
     *
     * This is the single structured input
     * available to the GTM decision layer.
     */
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
          record.estimatedBudget
            ?.toString() ??
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
       * Canonical Market Intelligence
       * representation.
       */
      intelligence,

      /*
       * Normalized Market Intelligence
       * representation.
       */
      marketIntelligence,

      /*
       * Historical GTM feedback.
       *
       * Previous executed decisions and
       * recorded outcomes can now be used
       * by future decision generation.
       */
      history,
    };
  },
};