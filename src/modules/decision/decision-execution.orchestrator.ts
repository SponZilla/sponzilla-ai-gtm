
import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  decisionExecutionService,
} from "./decision-execution.service.js";

import {
  decisionExecutionRepository,
} from "./decision-execution.repository.js";

import {
  decisionActionDispatcher,
} from "./decision-action.dispatcher.js";

import type {
  DecisionActionExecutionResult,
} from "./decision-action-executor.types.js";

/**
 * Execution was not safely claimed.
 * No action should be dispatched.
 */
export class ExecutionClaimError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionClaimError";
  }
}

/**
 * The executor completed, but database
 * finalization could not be confirmed.
 */
export class ExecutionFinalizationError extends Error {
  constructor(
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ExecutionFinalizationError";
  }
}

/**
 * The executor failed, but its failure
 * could not be safely persisted.
 */
export class ExecutionFailurePersistenceError extends Error {
  constructor(
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ExecutionFailurePersistenceError";
  }
}

/**
 * Dependencies required by the orchestrator.
 *
 * Pick keeps the dependency contracts aligned
 * with the actual production services.
 */
export interface ExecutionOrchestratorDependencies {
  executionService: Pick<
    typeof decisionExecutionService,
    "prepare"
  >;

  executionRepository: Pick<
    typeof decisionExecutionRepository,
    | "claimForExecution"
    | "failAtomically"
    | "completeAtomically"
  >;

  actionDispatcher: Pick<
    typeof decisionActionDispatcher,
    "dispatch"
  >;
}

/**
 * Creates an orchestrator with supplied dependencies.
 *
 * Production uses the real singleton dependencies.
 * Tests can supply controlled implementations.
 */
export function createDecisionExecutionOrchestrator(
  dependencies: ExecutionOrchestratorDependencies = {
    executionService: decisionExecutionService,
    executionRepository: decisionExecutionRepository,
    actionDispatcher: decisionActionDispatcher,
  },
) {
  return {
    async execute(decisionId: string) {
      /*
       * 1. Validate approval and create
       * a unique PENDING execution.
       */
      const execution =
        await dependencies.executionService.prepare(
          decisionId,
        );

      /*
       * 2. Atomically claim the execution
       * before invoking the dispatcher.
       *
       * A failed claim must never
       * trigger dispatch.
       */
      const claim =
        await dependencies.executionRepository
          .claimForExecution(
            execution.id,
            decisionId,
          );

      if (claim.kind !== "CLAIMED") {
        throw new ExecutionClaimError(
          `Execution claim rejected: ${claim.kind}`,
        );
      }

      /*
       * 3. Dispatch the approved action.
       *
       * This catch block handles only
       * executor failures.
       */
      let executionResult: DecisionActionExecutionResult;

      try {
        executionResult =
          await dependencies.actionDispatcher.dispatch({
            executionId: execution.id,
            decisionId: execution.decisionId,
            action: execution.action,
            actionSnapshot: execution.actionSnapshot,
          });
      } catch (executorError) {
        const errorMessage =
          executorError instanceof Error
            ? executorError.message
            : "Unknown execution error";

        /*
         * Record both FAILED transitions
         * in a single transaction.
         */
        try {
          const failure =
            await dependencies.executionRepository
              .failAtomically(
                execution.id,
                decisionId,
                errorMessage,
              );

          if (failure.kind !== "FAILED") {
            throw new Error(
              `Cannot persist execution failure: ${failure.kind}`,
            );
          }
        } catch (persistenceError) {
          throw new ExecutionFailurePersistenceError(
            "Executor failed, but its failure could not be safely persisted",
            {
              cause: new AggregateError(
                [executorError, persistenceError],
                "Executor and persistence failures",
              ),
            },
          );
        }

        throw executorError;
      }

      /*
       * 4. Executor completed successfully.
       *
       * Finalize the decision and execution
       * atomically, outside the executor
       * failure handler.
       */
      try {
        const completion =
          await dependencies.executionRepository
            .completeAtomically(
              execution.id,
              decisionId,
              executionResult.result as Prisma.InputJsonValue,
            );

        if (completion.kind !== "COMPLETED") {
          throw new Error(
            `Cannot finalize execution: ${completion.kind}`,
          );
        }

        return completion.execution;
      } catch (finalizationError) {
        /*
         * Do not automatically redispatch
         * or mark the execution FAILED.
         *
         * The external action may already
         * have happened.
         */
        throw new ExecutionFinalizationError(
          "Action completed, but execution finalization failed",
          {
            cause: finalizationError,
          },
        );
      }
    },
  };
}

/**
 * Production singleton.
 *
 * Existing application imports remain compatible.
 */
export const decisionExecutionOrchestrator =
  createDecisionExecutionOrchestrator();
