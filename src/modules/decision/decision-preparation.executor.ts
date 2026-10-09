import type {
  DecisionActionExecutionContext,
  DecisionActionExecutionResult,
  DecisionActionExecutor,
} from "./decision-action-executor.types.js";

export const decisionPreparationExecutor:
  DecisionActionExecutor = {
  async execute(
    context: DecisionActionExecutionContext,
  ): Promise<DecisionActionExecutionResult> {
    /*
     * No external side effect happens here.
     *
     * We only confirm that the approved
     * action has reached the execution layer
     * and preserve its prepared payload.
     */
    return {
      result: {
        mode: "PREPARATION_ONLY",

        executionId:
          context.executionId,

        decisionId:
          context.decisionId,

        action:
          context.action,

        actionSnapshot:
          context.actionSnapshot,

        preparedAt:
          new Date().toISOString(),
      },
    };
  },
};