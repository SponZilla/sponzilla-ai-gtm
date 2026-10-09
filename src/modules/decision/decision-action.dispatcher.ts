import type {
  GTMActionType,
} from "../../generated/prisma/client.js";

import {
  decisionPreparationExecutor,
} from "./decision-preparation.executor.js";

import type {
  DecisionActionExecutionContext,
  DecisionActionExecutionResult,
  DecisionActionExecutor,
} from "./decision-action-executor.types.js";

export class UnsupportedDecisionActionError
  extends Error {
  constructor(
    public readonly action: GTMActionType,
  ) {
    super(
      `Unsupported GTM action: ${action}`,
    );

    this.name =
      "UnsupportedDecisionActionError";
  }
}

/*
 * Only actions explicitly registered here
 * are allowed to reach an executor.
 *
 * This is an allowlist, not a blocklist.
 */
const executors:
  Partial<
    Record<
      GTMActionType,
      DecisionActionExecutor
    >
  > = {
    REQUEST_MORE_INFORMATION:
      decisionPreparationExecutor,

    RESEARCH_COMPANY:
      decisionPreparationExecutor,

    SEND_INTRODUCTION:
      decisionPreparationExecutor,

    SEND_CASE_STUDY:
      decisionPreparationExecutor,

    SEND_CAMPAIGN_PROPOSAL:
      decisionPreparationExecutor,

    SCHEDULE_DISCOVERY_CALL:
      decisionPreparationExecutor,

    FOLLOW_UP:
      decisionPreparationExecutor,

    PREPARE_PRICING:
      decisionPreparationExecutor,

    ESCALATE_TO_SALES:
      decisionPreparationExecutor,

    WAIT:
      decisionPreparationExecutor,

    CLOSE_OPPORTUNITY:
      decisionPreparationExecutor,
  };

export const decisionActionDispatcher = {
  async dispatch(
    context: DecisionActionExecutionContext,
  ): Promise<DecisionActionExecutionResult> {
    const executor =
      executors[context.action];

    if (!executor) {
      throw new UnsupportedDecisionActionError(
        context.action,
      );
    }

    return executor.execute(context);
  },
};