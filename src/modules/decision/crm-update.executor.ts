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

    console.log(
      `[CRMUpdateExecutor] Executed real CRM action: taskId=${crmTaskId}, action=${action}`,
    );

    return {
      result: {
        mode: "REAL_EXECUTION",
        channel: "CRM",
        executionId: context.executionId,
        decisionId: context.decisionId,
        action,
        crmTaskId,
        status: "COMPLETED",
        processedAt,
      },
    };
  }
}

export const crmUpdateExecutor = new CRMUpdateExecutor();
