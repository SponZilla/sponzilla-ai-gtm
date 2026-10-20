import type {
  GTMActionType,
} from "../../generated/prisma/client.js";

import {
  decisionPreparationExecutor,
} from "./decision-preparation.executor.js";

import {
  outreachEmailExecutor,
} from "./outreach-email.executor.js";

import {
  crmUpdateExecutor,
} from "./crm-update.executor.js";

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
      crmUpdateExecutor,

    RESEARCH_COMPANY:
      crmUpdateExecutor,

    SEND_INTRODUCTION:
      outreachEmailExecutor,

    SEND_CASE_STUDY:
      outreachEmailExecutor,

    SEND_CAMPAIGN_PROPOSAL:
      outreachEmailExecutor,

    SCHEDULE_DISCOVERY_CALL:
      crmUpdateExecutor,

    FOLLOW_UP:
      outreachEmailExecutor,

    PREPARE_PRICING:
      crmUpdateExecutor,

    ESCALATE_TO_SALES:
      crmUpdateExecutor,

    WAIT:
      crmUpdateExecutor,

    CLOSE_OPPORTUNITY:
      crmUpdateExecutor,
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