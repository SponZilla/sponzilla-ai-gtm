import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  decisionRepository,
} from "./decision.repository.js";

import {
  decisionExecutionService,
} from "./decision-execution.service.js";

import {
  decisionExecutionRepository,
} from "./decision-execution.repository.js";

import {
  decisionActionDispatcher,
} from "./decision-action.dispatcher.js";

export const decisionExecutionOrchestrator = {
  async execute(
    decisionId: string,
  ) {
    /*
     * Creates the PENDING execution only
     * after all approval/security checks.
     */
    const execution =
      await decisionExecutionService.prepare(
        decisionId,
      );

    try {
      /*
       * Dispatch only through our explicit
       * GTM action allowlist.
       */
      const executionResult =
        await decisionActionDispatcher.dispatch({
          executionId:
            execution.id,

          decisionId:
            execution.decisionId,

          action:
            execution.action,

          actionSnapshot:
            execution.actionSnapshot,
        });

      /*
       * Persist successful execution result.
       */
      const completedExecution =
        await decisionExecutionRepository
          .markSucceeded(
            execution.id,
            executionResult
              .result as Prisma.InputJsonValue,
          );

      /*
       * Move the decision from
       * APPROVED -> EXECUTED.
       */
      const statusUpdate =
        await decisionRepository
          .markExecutedIfApproved(
            decisionId,
          );

      if (statusUpdate.count !== 1) {
        throw new Error(
          "Failed to transition approved decision to EXECUTED",
        );
      }

      return completedExecution;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown execution error";

      /*
       * Preserve the failure on the
       * execution audit record.
       */
      await decisionExecutionRepository
        .markFailed(
          execution.id,
          errorMessage,
        );

      /*
       * An execution failure moves the
       * approved decision into FAILED.
       */
      await decisionRepository
        .markFailedIfApproved(
          decisionId,
        );

      throw error;
    }
  },
};