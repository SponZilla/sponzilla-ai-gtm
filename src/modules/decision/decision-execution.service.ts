import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  decisionRepository,
} from "./decision.repository.js";

import {
  decisionExecutionRepository,
} from "./decision-execution.repository.js";

export class ExecutionDecisionNotFoundError
  extends Error {
  constructor() {
    super("Decision not found");

    this.name =
      "ExecutionDecisionNotFoundError";
  }
}

export class DecisionNotApprovedError
  extends Error {
  constructor() {
    super(
      "Decision must be approved before execution",
    );

    this.name =
      "DecisionNotApprovedError";
  }
}

export class ApprovalNotFoundError
  extends Error {
  constructor() {
    super(
      "Approved decision does not have a valid approval record",
    );

    this.name =
      "ApprovalNotFoundError";
  }
}

export class DecisionAlreadyExecutedError
  extends Error {
  constructor() {
    super(
      "Decision already has an execution",
    );

    this.name =
      "DecisionAlreadyExecutedError";
  }
}

export const decisionExecutionService = {
  async prepare(
    decisionId: string,
  ) {
    /*
     * Step 1:
     * The decision itself must exist.
     */
    const decision =
      await decisionRepository.findById(
        decisionId,
      );

    if (!decision) {
      throw new ExecutionDecisionNotFoundError();
    }

    /*
     * Step 2:
     * Check for an existing execution BEFORE
     * checking the current decision status.
     *
     * This gives us the correct semantic error
     * after an already-executed decision moves
     * from APPROVED -> EXECUTED.
     */
    const existingExecution =
      await decisionExecutionRepository
        .findByDecisionId(
          decisionId,
        );

    if (existingExecution) {
      throw new DecisionAlreadyExecutedError();
    }

    /*
     * Step 3:
     * Only APPROVED decisions may create
     * their first execution.
     */
    if (
      decision.status !==
      "APPROVED"
    ) {
      throw new DecisionNotApprovedError();
    }

    /*
     * Step 4:
     * Load the approved decision together
     * with its human approval record.
     */
    const approvedDecision =
      await decisionExecutionRepository
        .findApprovedDecision(
          decisionId,
        );

    if (!approvedDecision) {
      throw new DecisionNotApprovedError();
    }

    const approval =
      approvedDecision.approvals[0];

    if (!approval) {
      throw new ApprovalNotFoundError();
    }

    /*
     * Step 5:
     * Database uniqueness remains the final
     * concurrency protection.
     *
     * Even if two requests passed the earlier
     * lookup simultaneously, only one can
     * create the Execution row.
     */
    const result =
      await decisionExecutionRepository
        .createPendingIfAbsent({
          decisionId:
            approvedDecision.id,

          approvalId:
            approval.id,

          action:
            approvedDecision.action,

          actionSnapshot:
            approvedDecision
              .proposedAction as Prisma.InputJsonValue,
        });

    if (
      result.kind ===
      "ALREADY_EXISTS"
    ) {
      throw new DecisionAlreadyExecutedError();
    }

    return result.execution;
  },
};