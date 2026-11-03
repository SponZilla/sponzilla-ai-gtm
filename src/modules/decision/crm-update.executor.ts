import { randomUUID } from "node:crypto";

import type {
  DecisionActionExecutionContext,
  DecisionActionExecutionResult,
  DecisionActionExecutor,
} from "./decision-action-executor.types.js";

export class CRMUpdateExecutor implements DecisionActionExecutor {
  async execute(
    context: DecisionActionExecutionContext,
  ): Promise<DecisionActionExecutionResult> {
    const action = context.action;
    const crmTaskId = `crm_task_${randomUUID()}`;
    const processedAt = new Date().toISOString();

    /*
     * No CRM task record is persisted and no calendar side effect
     * occurs here, so this is preparation only. It must not claim
     * to have executed until a real CRM/calendar integration does
     * the work.
     */
    console.log(
      `[CRMUpdateExecutor] Prepared CRM action (NOT APPLIED): draftTaskId=${crmTaskId}, action=${action}`,
    );

    return {
      result: {
        mode: "PREPARATION_ONLY",
        channel: "CRM",
        executionId: context.executionId,
        decisionId: context.decisionId,
        action,
        draftTaskId: crmTaskId,
        status: "NOT_APPLIED",
        preparedAt: processedAt,
      },
    };
  }
}

export const crmUpdateExecutor = new CRMUpdateExecutor();
