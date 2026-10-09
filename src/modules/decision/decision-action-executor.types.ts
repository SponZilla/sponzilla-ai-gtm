import type {
  GTMActionType,
} from "../../generated/prisma/client.js";

export interface DecisionActionExecutionContext {
  executionId: string;
  decisionId: string;
  action: GTMActionType;
  actionSnapshot: unknown;
}

export interface DecisionActionExecutionResult {
  result: Record<string, unknown>;
}

export interface DecisionActionExecutor {
  execute(
    context: DecisionActionExecutionContext,
  ): Promise<DecisionActionExecutionResult>;
}