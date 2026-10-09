import {
  decisionRepository,
} from "./decision.repository.js";

import type {
  ResolveDecisionApprovalInput,
} from "./decision-approval.types.js";

export class DecisionNotFoundError extends Error {
  constructor() {
    super("Decision not found");
    this.name = "DecisionNotFoundError";
  }
}

export class DecisionAlreadyResolvedError extends Error {
  constructor() {
    super(
      "Decision is no longer awaiting approval",
    );

    this.name =
      "DecisionAlreadyResolvedError";
  }
}

type ApprovalOutcome =
  | "APPROVED"
  | "REJECTED";

export const decisionApprovalService = {
  async resolve(
    decisionId: string,
    outcome: ApprovalOutcome,
    input: ResolveDecisionApprovalInput,
  ) {
    const result =
      await decisionRepository.resolveWithApproval(
        decisionId,
        outcome,
        {
          actorId: input.actorId,
          actorName: input.actorName,
          comment: input.comment,
        },
      );

    if (result.kind === "NOT_FOUND") {
      throw new DecisionNotFoundError();
    }

    if (
      result.kind ===
      "ALREADY_RESOLVED"
    ) {
      throw new DecisionAlreadyResolvedError();
    }

    return result.decision;
  },
};