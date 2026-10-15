import type {
  GTMDecisionContext,
} from "../../modules/decision/decision-context.types.js";

import {
  gtmDecisionOutputSchema,
  type GTMDecisionOutput,
} from "../../modules/decision/decision-output.schema.js";

import type {
  AIProvider,
} from "./ai-provider.types.js";

import {
  buildGTMPrompt,
} from "./gtm-prompt.builder.js";

import {
  validateGTMAIResponse,
} from "./gtm-ai-response.validator.js";

import type {
  GTMAIResponse,
} from "./gtm-ai-response.schema.js";

export type GTMEnrichmentResult =
  | {
      status: "ENRICHED";
      decision: GTMDecisionOutput;
      suggestion: GTMAIResponse;
    }
  | {
      status: "FALLBACK";
      decision: GTMDecisionOutput;
      suggestion: null;
    };

export class GTMEnrichmentService {
  constructor(
    private readonly provider: AIProvider,
  ) {}

  async enrich(
    context: GTMDecisionContext,
    baseline: GTMDecisionOutput,
  ): Promise<GTMEnrichmentResult> {
    // Validate the trusted baseline before
    // invoking any external provider.
    const {
      gtmDecisionOutputSchema,
    } = await import(
      "../../modules/decision/decision-output.schema.js"
    );

    const validatedBaseline =
      gtmDecisionOutputSchema.parse(
        baseline,
      );

    const request = buildGTMPrompt(
      context,
      validatedBaseline,
    );

    try {
      const response =
        await this.provider.generateText(
          request,
        );

      const suggestion =
        validateGTMAIResponse(
          response.text,
        );

      return {
        status: "ENRICHED",
        decision: validatedBaseline,
        suggestion,
      };
    } catch {
      // AI failure must not corrupt the
      // trusted deterministic decision.
      return {
        status: "FALLBACK",
        decision: validatedBaseline,
        suggestion: null,
      };
    }
  }
}