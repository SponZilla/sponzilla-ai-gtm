import type {
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

const DECISION_MODEL_VERSION =
  "deterministic-v1";

const DECISION_PROMPT_VERSION =
  "none";

const DECISION_POLICY_VERSION =
  "gtm-policy-v1";

export const decisionService = {
  async generate(opportunityId: string) {
    /*
     * 1. Build the trusted decision context.
     */
    const context =
      await decisionContextService.build(
        opportunityId,
      );

    /*
     * 2. Generate + validate the recommendation.
     */
    const output =
      decisionEngineService.decide(
        context,
      );

    /*
     * 3. Persist both input and output.
     *
     * This creates an audit trail:
     * "What did the engine know when it made
     * this recommendation?"
     */
    const decision =
      await decisionRepository.create({
        opportunityId,

        action: output.action,
        priority: output.priority,

        summary: output.summary,
        reasoning: output.reasoning,
        confidence: output.confidence,

        inputSnapshot:
          toJsonValue(context),

        proposedAction:
          toJsonValue(output.proposedAction),

        modelVersion:
          DECISION_MODEL_VERSION,

        promptVersion:
          DECISION_PROMPT_VERSION,

        policyVersion:
          DECISION_POLICY_VERSION,
      });

    return {
      decision,
      evidence: output.evidence,
    };
  },
};

function toJsonValue(
  value: unknown,
): Prisma.InputJsonValue {
  /*
   * Produces a JSON-safe detached snapshot.
   * Dates become ISO strings and undefined values
   * are omitted by JSON serialization.
   */
  return JSON.parse(
    JSON.stringify(value),
  ) as Prisma.InputJsonValue;
}