
import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  decisionContextService,
} from "./decision-context.service.js";

import {
  decisionEngineService,
} from "./decision-engine.service.js";

import {
  decisionRepository,
} from "./decision.repository.js";

import {
  GTMEnrichmentService,
} from "../../integrations/ai/gtm-enrichment.service.js";

import {
  GeminiProvider,
} from "../../integrations/ai/gemini.provider.js";

const DECISION_MODEL_VERSION =
  "deterministic-v1";

const DECISION_PROMPT_VERSION =
  "none";

const DECISION_POLICY_VERSION =
  "gtm-policy-v1";

function getEnrichmentService(): GTMEnrichmentService | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const enabled = process.env.ENABLE_GEMINI_ENRICHMENT !== "false";

  if (!apiKey || !enabled) {
    return null;
  }

  try {
    const provider = new GeminiProvider();
    return new GTMEnrichmentService(provider);
  } catch {
    return null;
  }
}

export class PendingDecisionExistsError
  extends Error {
  readonly decisionId: string;

  constructor(
    decisionId: string,
  ) {
    super(
      "An unresolved GTM decision already exists for this opportunity.",
    );

    this.name =
      "PendingDecisionExistsError";

    this.decisionId =
      decisionId;
  }
}

export const decisionService = {
  async generate(
    opportunityId: string,
    options?: {
      enrichmentService?: GTMEnrichmentService | null;
    },
  ) {
    /*
     * 1. Build trusted decision context.
     */
    const context =
      await decisionContextService.build(
        opportunityId,
      );

    /*
     * 2. Select and validate recommendation.
     */
    const output =
      decisionEngineService.decide(
        context,
      );

    /*
     * 2b. Wire Gemini enrichment into decision explanation.
     * If Gemini fails or is unconfigured, fallback cleanly to deterministic baseline.
     */
    let finalSummary = output.summary;
    let finalReasoning = output.reasoning;
    let modelVersion = DECISION_MODEL_VERSION;
    let promptVersion = DECISION_PROMPT_VERSION;

    const enrichment =
      options?.enrichmentService !== undefined
        ? options.enrichmentService
        : getEnrichmentService();

    if (enrichment) {
      try {
        const enriched = await enrichment.enrich(
          context,
          output,
        );

        if (enriched.status === "ENRICHED" && enriched.suggestion) {
          finalSummary = enriched.suggestion.summary;
          finalReasoning = enriched.suggestion.reasoning;
          modelVersion =
            process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
          promptVersion = "gtm-enrichment-v1";
        }
      } catch {
        // Fallback silently to deterministic baseline
      }
    }

    /*
     * 3. Persist decision safely.
     *
     * The repository uses a PostgreSQL
     * advisory lock and checks for an
     * existing pending decision.
     *
     * The database partial unique index
     * provides additional protection.
     */
    let result;

    try {
      result =
        await decisionRepository
          .createIfNoPendingDecision({
            opportunityId,

            action:
              output.action,

            priority:
              output.priority,

            summary:
              finalSummary,

            reasoning:
              finalReasoning,

            confidence:
              output.confidence,

            inputSnapshot:
              toJsonValue(context),

            proposedAction:
              toJsonValue(
                output.proposedAction,
              ),

            modelVersion,

            promptVersion,

            policyVersion:
              DECISION_POLICY_VERSION,
          });
    } catch (error) {
      /*
       * Step 7J.6:
       *
       * P2002 means a unique constraint
       * was violated.
       *
       * Only translate it into a duplicate
       * decision response when we can
       * confirm an existing pending decision.
       */
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existingDecision =
          await decisionRepository
            .findPendingByOpportunityId(
              opportunityId,
            );

        if (existingDecision) {
          throw new PendingDecisionExistsError(
            existingDecision.id,
          );
        }
      }

      /*
       * Preserve unexpected errors.
       */
      throw error;
    }

    /*
     * 4. Handle duplicate detected by
     * the advisory-lock transaction.
     */
    if (
      result.kind ===
      "PENDING_EXISTS"
    ) {
      throw new PendingDecisionExistsError(
        result.decision.id,
      );
    }

    /*
     * 5. Return the generated decision.
     */
    return {
      decision:
        result.decision,

      evidence:
        output.evidence,
    };
  },
};

function toJsonValue(
  value: unknown,
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value),
  ) as Prisma.InputJsonValue;
}
