import type {
  GTMDecisionContext,
} from "./decision-context.types.js";

import type {
  GTMDecisionOutput,
} from "./decision-output.schema.js";

export class DecisionEvidenceValidationError
  extends Error {
  constructor() {
    super(
      "Decision evidence is not grounded in the trusted decision context.",
    );

    this.name =
      "DecisionEvidenceValidationError";
  }
}

export function validateDecisionEvidence(
  context: GTMDecisionContext,
  output: GTMDecisionOutput,
): void {
  for (const evidence of output.evidence) {
    switch (evidence.source) {
      case "COMPANY": {
        if (
          evidence.reference !==
          context.company.id
        ) {
          throw new DecisionEvidenceValidationError();
        }

        break;
      }

      case "OPPORTUNITY": {
        if (
          evidence.reference !==
          context.opportunity.id
        ) {
          throw new DecisionEvidenceValidationError();
        }

        break;
      }

      case "INTERACTION": {
        const matchingInteraction =
          context.interactions.find(
            interaction =>
              interaction.id ===
              evidence.reference,
          );

        if (
          !matchingInteraction ||
          matchingInteraction.summary !==
            evidence.description
        ) {
          throw new DecisionEvidenceValidationError();
        }

        break;
      }

      case "MARKET_INTELLIGENCE": {
        const matchingEvidence =
          context.marketIntelligence
            ?.evidence.find(
              item =>
                item.fact ===
                  evidence.description &&
                (
                  item.sourceTitle ===
                    evidence.reference ||
                  item.sourceUrl ===
                    evidence.reference
                ),
            );

        if (!matchingEvidence) {
          throw new DecisionEvidenceValidationError();
        }

        break;
      }

      default: {
        const exhaustiveCheck: never =
          evidence.source;

        throw new Error(
          `Unsupported evidence source: ${exhaustiveCheck}`,
        );
      }
    }
  }
}