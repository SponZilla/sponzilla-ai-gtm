
import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  decisionRepository,
} from "./decision.repository.js";

import {
  decisionExecutionRepository,
} from "./decision-execution.repository.js";

/**
 * Decision does not exist.
 */
export class ExecutionDecisionNotFoundError
  extends Error {
  constructor() {
    super("Decision not found");

    this.name =
      "ExecutionDecisionNotFoundError";
  }
}

/**
 * Decision is not approved for execution.
 */
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

/**
 * No valid approved approval record exists.
 */
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

/**
 * An execution already exists for this decision.
 */
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

/**
 * The requested action does not match
 * the approved decision action.
 */
export class ExecutionActionMismatchError
  extends Error {
  constructor() {
    super(
      "Execution action does not match the approved decision",
    );

    this.name =
      "ExecutionActionMismatchError";
  }
}

/**
 * The approved decision does not contain
 * a valid executable action snapshot.
 */
export class InvalidExecutionActionSnapshotError
  extends Error {
  constructor() {
    super(
      "Approved decision has no valid action snapshot",
    );

    this.name =
      "InvalidExecutionActionSnapshotError";
  }
}

export const decisionExecutionService = {
  async prepare(
    decisionId: string,
  ) {
    /*
     * Step 1:
     * Verify that the decision exists.
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
     * Check for an existing execution first.
     *
     * Preserve the existing semantic error
     * even if the decision has already moved
     * from APPROVED to EXECUTED.
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
     * Only APPROVED decisions may proceed.
     */
    if (decision.status !== "APPROVED") {
      throw new DecisionNotApprovedError();
    }

    /*
     * Step 4:
     * Retrieve the approved decision
     * together with its approval record.
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
     * Validate the action snapshot.
     *
     * GTM execution requires a structured
     * JSON object, not null or an array.
     */
    const proposedAction =
      approvedDecision.proposedAction;

    if (
      proposedAction === null ||
      typeof proposedAction !== "object" ||
      Array.isArray(proposedAction)
    ) {
      throw new InvalidExecutionActionSnapshotError();
    }

    /*
     * Step 6:
     * Create the pending execution.
     *
     * Repository-level validation provides
     * additional authorization protection.
     *
     * The database UNIQUE constraint on
     * decisionId prevents duplicate executions.
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

          actionSnapshot: proposedAction,
        });

    /*
     * Step 7:
     * Explicitly handle every repository
     * outcome with type-safe branching.
     */
    switch (result.kind) {
      case "CREATED":
        return result.execution;

        case "INVALID_ACTION_SNAPSHOT":
  throw new InvalidExecutionActionSnapshotError();

      case "ALREADY_EXISTS":
        throw new DecisionAlreadyExecutedError();

      case "INVALID_DECISION_STATE":
        throw new DecisionNotApprovedError();

      case "INVALID_APPROVAL":
        throw new ApprovalNotFoundError();

      case "ACTION_MISMATCH":
        throw new ExecutionActionMismatchError();

      default: {
        /*
         * Compile-time exhaustiveness check.
         *
         * If the repository introduces a new
         * result kind, TypeScript requires
         * this switch to handle it.
         */
        const exhaustiveCheck: never = result;

        return exhaustiveCheck;
      }
    }
  },
};
