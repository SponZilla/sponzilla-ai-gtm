import {
  gtmDecisionOutputSchema,
  type GTMDecisionOutput,
} from "./decision-output.schema.js";

import {
  decisionPolicyService,
} from "./decision-policy.service.js";

import type {
  GTMDecisionContext,
} from "./decision-context.types.js";

import type {
  GTMActionType,
} from "../../generated/prisma/client.js";

export const decisionEngineService = {
  decide(
    context: GTMDecisionContext,
  ): GTMDecisionOutput {
    const action =
      decisionPolicyService.selectAction(
        context,
      );

    const decision =
      buildDecision(
        context,
        action,
      );

    return gtmDecisionOutputSchema.parse(
      decision,
    );
  },
};

function buildDecision(
  context: GTMDecisionContext,
  action: GTMActionType,
): GTMDecisionOutput {
  const historySummary =
    analyzeHistory(context);

  const intelligence =
    context.marketIntelligence;

  const strongestEvidence =
    intelligence
      ? getStrongestEvidence(
          intelligence.evidence,
        )
      : undefined;

  const baseConfidence =
    calculateBaseConfidence(
      context,
      strongestEvidence?.confidence,
    );

  const confidence =
    adjustConfidenceFromHistory(
      baseConfidence,
      historySummary,
    );

  const reasoning =
    buildReasoning(
      context,
      action,
      historySummary,
    );

  const evidence =
    buildEvidence(
      context,
      strongestEvidence,
    );

  return {
    action,

    priority:
      determinePriorityForAction(
        action,
        confidence,
      ),

    summary:
      buildSummary(
        context,
        action,
      ),

    reasoning,

    evidence,

    confidence,

    proposedAction:
      buildProposedAction(
        context,
        action,
      ),
  };
}

function buildSummary(
  context: GTMDecisionContext,
  action: GTMActionType,
): string {
  switch (action) {
    case "RESEARCH_COMPANY":
      return `Research ${context.company.name} and identify the relevant decision-maker before outreach.`;

    case "SEND_INTRODUCTION":
      return `Prepare an initial introduction for ${context.company.name}.`;

    case "SCHEDULE_DISCOVERY_CALL":
      return `Prepare a discovery call with ${context.company.name} to understand campaign requirements.`;

    case "SEND_CAMPAIGN_PROPOSAL":
      return `Prepare a campaign proposal for ${context.company.name} based on the identified opportunity.`;

    case "FOLLOW_UP":
      return `Prepare a follow-up for ${context.company.name} based on the current opportunity state.`;

    case "ESCALATE_TO_SALES":
      return `Escalate ${context.company.name} to the sales team for negotiation handling.`;

    case "CLOSE_OPPORTUNITY":
      return `Prepare to close the ${context.company.name} opportunity in line with its final stage.`;

    case "REQUEST_MORE_INFORMATION":
      return "More information is required before selecting a stronger GTM action.";

    case "SEND_CASE_STUDY":
      return `Prepare a relevant case study for ${context.company.name}.`;

    case "PREPARE_PRICING":
      return `Prepare pricing information for ${context.company.name}.`;

    case "WAIT":
      return `Wait for additional signals before taking another action on ${context.company.name}.`;
  }
}

function buildReasoning(
  context: GTMDecisionContext,
  action: GTMActionType,
  history: ReturnType<
    typeof analyzeHistory
  >,
): string[] {
  const reasoning: string[] = [];

  switch (action) {
    case "RESEARCH_COMPANY":
      reasoning.push(
        "The opportunity is new and was discovered through Market Intelligence.",
        "Research should be completed before attempting direct outreach.",
      );

      if (
        context.marketIntelligence
          ?.aiInference
      ) {
        reasoning.push(
          context.marketIntelligence
            .aiInference.marketingNeed,
        );
      }

      break;

    case "SEND_INTRODUCTION":
      reasoning.push(
        "The opportunity is new and sufficient basic company context is available.",
        "No stronger buying or engagement signal currently requires a later-stage GTM action.",
      );
      break;

    case "SCHEDULE_DISCOVERY_CALL":
      reasoning.push(
        "The opportunity is currently in the INTERESTED stage.",
        "A discovery conversation is appropriate before preparing a commercial proposal.",
      );
      break;

    case "SEND_CAMPAIGN_PROPOSAL":
      reasoning.push(
        "A proposal has been explicitly requested for this opportunity.",
        "An explicit proposal request is a strong signal that a campaign proposal should be prepared.",
      );
      break;

    case "FOLLOW_UP":
      if (
        context.opportunity.stage ===
        "PROPOSAL"
      ) {
        reasoning.push(
          "The opportunity is currently in the PROPOSAL stage.",
          "A follow-up is appropriate while the proposal is being evaluated.",
        );
      } else if (
        hasInteraction(
          context,
          "PROPOSAL_SENT",
        )
      ) {
        reasoning.push(
          "A proposal has already been sent for this opportunity.",
          "The next safe GTM action is to follow up rather than send another proposal.",
        );
      } else {
        reasoning.push(
          "Previous GTM interaction already exists for this opportunity.",
          "A follow-up is safer than repeating the initial outreach.",
        );
      }

      break;

    case "ESCALATE_TO_SALES":
      reasoning.push(
        "The opportunity has reached the NEGOTIATION stage.",
        "Negotiation requires direct sales handling rather than automated GTM progression.",
      );
      break;

    case "CLOSE_OPPORTUNITY":
      reasoning.push(
        `The opportunity is already in the ${context.opportunity.stage} stage.`,
        "Terminal opportunities should not continue through normal GTM actions.",
      );
      break;

    case "REQUEST_MORE_INFORMATION":
      reasoning.push(
        "The available deterministic signals do not support a stronger GTM action.",
        "Additional opportunity or interaction context should be collected before proceeding.",
      );
      break;

    case "SEND_CASE_STUDY":
      reasoning.push(
        "The current policy selected supporting material as the next appropriate GTM action.",
      );
      break;

    case "PREPARE_PRICING":
      reasoning.push(
        "The current policy selected pricing preparation as the next appropriate GTM action.",
      );
      break;

    case "WAIT":
      reasoning.push(
        "The current opportunity state does not require immediate GTM activity.",
      );
      break;
  }

  /*
   * History is supporting evidence.
   *
   * It explains confidence changes but does not
   * override the deterministic action selected
   * by decisionPolicyService.
   */
  if (
    history.totalDecisions > 0
  ) {
    reasoning.push(
      buildHistoryReasoning(history),
    );
  }

  /*
   * Output schema allows at most five
   * reasoning statements.
   */
  return reasoning.slice(0, 5);
}

function buildEvidence(
  context: GTMDecisionContext,
  strongestEvidence:
    | NonNullable<
        GTMDecisionContext[
          "marketIntelligence"
        ]
      >["evidence"][number]
    | undefined,
): GTMDecisionOutput["evidence"] {
  const evidence:
    GTMDecisionOutput["evidence"] =
      [];

  /*
   * Prefer current Market Intelligence evidence
   * when available.
   */
  if (strongestEvidence) {
    evidence.push({
      source:
        "MARKET_INTELLIGENCE",

      description:
        strongestEvidence.fact,

      reference:
        strongestEvidence
          .sourceTitle ??
        strongestEvidence
          .sourceUrl ??
        undefined,
    });
  }

  /*
   * Always retain the opportunity itself
   * as evidence for auditability.
   */
  evidence.push({
    source:
      "OPPORTUNITY",

    description:
      context.opportunity.objective ??
      context.opportunity.title,

    reference:
      context.opportunity.id,
  });

  /*
   * Include the most recent interaction
   * when interaction history exists.
   */
  const latestInteraction =
    getLatestInteraction(context);

  if (latestInteraction) {
    evidence.push({
      source:
        "INTERACTION",

      description:
        latestInteraction.summary,

      reference:
        latestInteraction.id,
    });
  }

  return evidence.slice(0, 10);
}

function buildProposedAction(
  context: GTMDecisionContext,
  action: GTMActionType,
): GTMDecisionOutput["proposedAction"] {
  switch (action) {
    case "RESEARCH_COMPANY":
      return {
        type: "RESEARCH",

        description:
          `Identify the relevant marketing, partnerships, or campus activation decision-maker at ${context.company.name}.`,

        requiresApproval: true,
      };

    case "SEND_INTRODUCTION":
      return {
        type: "OUTREACH",

        description:
          `Prepare an introductory outreach message for ${context.company.name}.`,

        requiresApproval: true,
      };

    case "SEND_CASE_STUDY":
      return {
        type: "OUTREACH",

        description:
          `Prepare a relevant case study to share with ${context.company.name}.`,

        requiresApproval: true,
      };

    case "SEND_CAMPAIGN_PROPOSAL":
      return {
        type: "PREPARE_PROPOSAL",

        description:
          `Prepare a campaign proposal for ${context.company.name} using the available opportunity and Market Intelligence context.`,

        requiresApproval: true,
      };

    case "SCHEDULE_DISCOVERY_CALL":
      return {
        type: "SCHEDULE_MEETING",

        description:
          `Prepare a discovery-call action for ${context.company.name}.`,

        requiresApproval: true,
      };

    case "FOLLOW_UP":
      return {
        type: "FOLLOW_UP",

        description:
          `Prepare an appropriate follow-up for ${context.company.name}.`,

        requiresApproval: true,
      };

    case "PREPARE_PRICING":
      return {
        type: "PREPARE_PRICING",

        description:
          `Prepare pricing information for ${context.company.name}.`,

        requiresApproval: true,
      };

    case "ESCALATE_TO_SALES":
      return {
        type: "ESCALATE",

        description:
          `Prepare this opportunity for human sales review and negotiation handling.`,

        requiresApproval: true,
      };

    case "WAIT":
      return {
        type: "WAIT",

        description:
          `Wait for additional engagement or opportunity signals from ${context.company.name}.`,

        requiresApproval: true,
      };

    case "CLOSE_OPPORTUNITY":
      return {
        type: "CLOSE",

        description:
          `Prepare to close the opportunity according to its ${context.opportunity.stage} stage.`,

        requiresApproval: true,
      };

    case "REQUEST_MORE_INFORMATION":
      return {
        type:
          "REQUEST_INFORMATION",

        description:
          "Gather additional opportunity or interaction context before proceeding.",

        requiresApproval: true,
      };
  }
}

function calculateBaseConfidence(
  context: GTMDecisionContext,
  evidenceConfidence?: number,
): number {
  const inferenceConfidence =
    context.marketIntelligence
      ?.aiInference
      ?.confidence;

  /*
   * Market Intelligence provides the strongest
   * structured confidence signal when present.
   */
  if (
    inferenceConfidence !== undefined
  ) {
    return calculateDecisionConfidence(
      inferenceConfidence,
      evidenceConfidence,
    );
  }

  /*
   * Deterministic opportunity/interaction rules
   * without Market Intelligence start from a
   * conservative baseline.
   */
  if (
    context.interactions.length > 0
  ) {
    return 0.65;
  }

  if (
    context.opportunity.objective
  ) {
    return 0.6;
  }

  return 0.5;
}

function analyzeHistory(
  context: GTMDecisionContext,
) {
  const {
    totalDecisions,
    successfulOutcomes,
    negativeOutcomes,
  } = context.history;

  const evaluatedOutcomes =
    successfulOutcomes +
    negativeOutcomes;

  const positiveRatio =
    evaluatedOutcomes === 0
      ? 0
      : successfulOutcomes /
        evaluatedOutcomes;

  const negativeRatio =
    evaluatedOutcomes === 0
      ? 0
      : negativeOutcomes /
        evaluatedOutcomes;

  return {
    totalDecisions,
    successfulOutcomes,
    negativeOutcomes,
    evaluatedOutcomes,
    positiveRatio,
    negativeRatio,
  };
}

function buildHistoryReasoning(
  history: ReturnType<
    typeof analyzeHistory
  >,
): string {
  if (
    history.evaluatedOutcomes === 0
  ) {
    return (
      `${history.totalDecisions} previous executed GTM ` +
      "decision(s) exist, but there are no positive or negative outcome signals yet."
    );
  }

  return (
    "Historical GTM evidence contains " +
    `${history.successfulOutcomes} positive outcome signal(s) ` +
    `and ${history.negativeOutcomes} negative outcome signal(s) ` +
    `across ${history.totalDecisions} previous executed decision(s).`
  );
}

function adjustConfidenceFromHistory(
  baseConfidence: number,
  history: ReturnType<
    typeof analyzeHistory
  >,
): number {
  if (
    history.evaluatedOutcomes === 0
  ) {
    return roundConfidence(
      baseConfidence,
    );
  }

  /*
   * Historical evidence can modify confidence
   * by at most +/- 0.05.
   *
   * It cannot dominate current opportunity
   * or Market Intelligence evidence.
   */
  const historicalSignal =
    history.positiveRatio -
    history.negativeRatio;

  const adjustment =
    historicalSignal * 0.05;

  return roundConfidence(
    baseConfidence +
      adjustment,
  );
}

function getStrongestEvidence(
  evidence: NonNullable<
    GTMDecisionContext[
      "marketIntelligence"
    ]
  >["evidence"],
) {
  return evidence.reduce<
    | (typeof evidence)[number]
    | undefined
  >(
    (
      strongest,
      current,
    ) => {
      if (
        !strongest ||
        current.confidence >
          strongest.confidence
      ) {
        return current;
      }

      return strongest;
    },
    undefined,
  );
}

function getLatestInteraction(
  context: GTMDecisionContext,
) {
  return context.interactions.reduce<
    | GTMDecisionContext[
        "interactions"
      ][number]
    | undefined
  >(
    (
      latest,
      current,
    ) => {
      if (
        !latest ||
        current.occurredAt >
          latest.occurredAt
      ) {
        return current;
      }

      return latest;
    },
    undefined,
  );
}

function hasInteraction(
  context: GTMDecisionContext,
  type:
    GTMDecisionContext[
      "interactions"
    ][number]["type"],
): boolean {
  return context.interactions.some(
    interaction =>
      interaction.type === type,
  );
}

function determinePriorityForAction(
  action: GTMActionType,
  confidence: number,
):
  | "LOW"
  | "MEDIUM"
  | "HIGH" {
  /*
   * Negotiation and explicit commercial actions
   * deserve elevated operational attention.
   */
  if (
    action ===
      "ESCALATE_TO_SALES" ||
    action ===
      "SEND_CAMPAIGN_PROPOSAL" ||
    action ===
      "PREPARE_PRICING"
  ) {
    return confidence >= 0.6
      ? "HIGH"
      : "MEDIUM";
  }

  return determinePriority(
    confidence,
  );
}

function determinePriority(
  confidence: number,
):
  | "LOW"
  | "MEDIUM"
  | "HIGH" {
  if (
    confidence >= 0.8
  ) {
    return "HIGH";
  }

  if (
    confidence >= 0.6
  ) {
    return "MEDIUM";
  }

  return "LOW";
}

function calculateDecisionConfidence(
  inferenceConfidence: number,
  evidenceConfidence?: number,
): number {
  if (
    evidenceConfidence === undefined
  ) {
    return roundConfidence(
      inferenceConfidence *
        0.8,
    );
  }

  /*
   * MVP heuristic:
   *
   * Market Intelligence inference = 60%
   * strongest evidence            = 40%
   *
   * This is not an ML probability.
   */
  const confidence =
    inferenceConfidence *
      0.6 +
    evidenceConfidence *
      0.4;

  return roundConfidence(
    confidence,
  );
}

function roundConfidence(
  value: number,
): number {
  return (
    Math.round(
      Math.min(
        1,
        Math.max(
          0,
          value,
        ),
      ) * 100,
    ) / 100
  );
}