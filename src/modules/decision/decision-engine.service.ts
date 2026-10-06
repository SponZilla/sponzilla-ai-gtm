import {
  gtmDecisionOutputSchema,
  type GTMDecisionOutput,
} from "./decision-output.schema.js";

import type {
  GTMDecisionContext,
} from "./decision-context.types.js";

export const decisionEngineService = {
  decide(
    context: GTMDecisionContext,
  ): GTMDecisionOutput {
    const decision = buildDecision(context);

    return gtmDecisionOutputSchema.parse(decision);
  },
};

function buildDecision(
  context: GTMDecisionContext,
): GTMDecisionOutput {
  const hasInteractions =
    context.interactions.length > 0;

  const intelligence =
    context.marketIntelligence;

  /*
   * Rule 1:
   *
   * A newly discovered Market Intelligence opportunity
   * with no previous GTM interaction should be researched
   * before outreach is attempted.
   */
  if (
    context.opportunity.source ===
      "MARKET_INTELLIGENCE" &&
    context.opportunity.stage === "NEW" &&
    !hasInteractions &&
    intelligence
  ) {
    const strongestEvidence =
      getStrongestEvidence(intelligence.evidence);

    const reasoning = [
      "The opportunity was discovered through Market Intelligence.",
      "There is no previous GTM interaction recorded for this opportunity.",
      intelligence.aiInference
        ? intelligence.aiInference.marketingNeed
        : context.opportunity.objective ??
          "A potential GTM opportunity has been identified.",
    ];

    const evidence =
      strongestEvidence
        ? [
            {
              source:
                "MARKET_INTELLIGENCE" as const,

              description:
                strongestEvidence.fact,

              reference:
                strongestEvidence.sourceTitle ??
                strongestEvidence.sourceUrl ??
                undefined,
            },
          ]
        : [
            {
              source: "OPPORTUNITY" as const,

              description:
                context.opportunity.objective ??
                context.opportunity.title,

              reference:
                context.opportunity.id,
            },
          ];

    return {
      action: "RESEARCH_COMPANY",

      priority: determinePriority(
        intelligence.aiInference?.confidence ??
          0.5,
      ),

      summary:
        `Research ${context.company.name} and identify the relevant decision-maker before outreach.`,

      reasoning,

      evidence,

      confidence: calculateDecisionConfidence(
        intelligence.aiInference?.confidence ??
          0.5,
        strongestEvidence?.confidence,
      ),

      proposedAction: {
        type: "RESEARCH",

        description:
          `Identify the relevant marketing, partnerships, or campus activation decision-maker at ${context.company.name}.`,

        requiresApproval: true,
      },
    };
  }

  /*
   * Conservative fallback.
   *
   * If we do not yet have enough deterministic rules,
   * ask for more information instead of inventing an action.
   */
  return {
    action: "REQUEST_MORE_INFORMATION",

    priority: "MEDIUM",

    summary:
      "More information is required before selecting the next GTM action.",

    reasoning: [
      "The current deterministic decision rules do not provide enough support for a stronger action.",
    ],

    evidence: [
      {
        source: "OPPORTUNITY",

        description:
          context.opportunity.objective ??
          context.opportunity.title,

        reference:
          context.opportunity.id,
      },
    ],

    confidence: 0.5,

    proposedAction: {
      type: "REQUEST_INFORMATION",

      description:
        "Gather additional opportunity or interaction context before proceeding.",

      requiresApproval: true,
    },
  };
}

function getStrongestEvidence(
  evidence: NonNullable<
    GTMDecisionContext["marketIntelligence"]
  >["evidence"],
) {
  return evidence.reduce<
    (typeof evidence)[number] | undefined
  >((strongest, current) => {
    if (
      !strongest ||
      current.confidence > strongest.confidence
    ) {
      return current;
    }

    return strongest;
  }, undefined);
}

function determinePriority(
  inferenceConfidence: number,
): "LOW" | "MEDIUM" | "HIGH" {
  if (inferenceConfidence >= 0.8) {
    return "HIGH";
  }

  if (inferenceConfidence >= 0.6) {
    return "MEDIUM";
  }

  return "LOW";
}

function calculateDecisionConfidence(
  inferenceConfidence: number,
  evidenceConfidence?: number,
): number {
  if (evidenceConfidence === undefined) {
    return roundConfidence(
      inferenceConfidence * 0.8,
    );
  }

  /*
   * MVP heuristic:
   * intelligence interpretation = 60%
   * strongest supporting evidence = 40%
   *
   * This is NOT an ML probability.
   */
  const confidence =
    inferenceConfidence * 0.6 +
    evidenceConfidence * 0.4;

  return roundConfidence(confidence);
}

function roundConfidence(
  value: number,
): number {
  return Math.round(
    Math.min(1, Math.max(0, value)) * 100,
  ) / 100;
}