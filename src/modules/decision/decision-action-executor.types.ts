
import type {
  GTMActionType,
} from "../../generated/prisma/client.js";

/**
 * Context supplied to an approved
 * GTM action executor.
 *
 * Executors must validate actionSnapshot
 * before using its contents.
 */
export interface DecisionActionExecutionContext {
  readonly executionId: string;

  readonly decisionId: string;

  readonly action: GTMActionType;

  readonly actionSnapshot: unknown;
}

/**
 * Structured output returned by an executor.
 *
 * Results are persisted by the orchestrator.
 */
export interface DecisionActionExecutionResult {
  readonly result: Record<string, unknown>;
}

/**
 * Common interface for all GTM executors.
 *
 * Every executor must implement execute().
 */
export interface DecisionActionExecutor {
  execute(
    context: DecisionActionExecutionContext,
  ): Promise<DecisionActionExecutionResult>;
}
