import {
  decisionRepository,
} from "./decision.repository.js";

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
  ) {
    const existing =
      await decisionRepository.findById(
        decisionId,
      );

    if (!existing) {
      throw new DecisionNotFoundError();
    }

    if (
      existing.status !==
      "AWAITING_APPROVAL"
    ) {
      throw new DecisionAlreadyResolvedError();
    }

    const result =
      await decisionRepository
        .updateStatusIfAwaitingApproval(
          decisionId,
          outcome,
        );

    /*
     * Another request may have resolved the
     * decision between our read and update.
     */
    if (result.count !== 1) {
      throw new DecisionAlreadyResolvedError();
    }

    const updated =
      await decisionRepository.findById(
        decisionId,
      );

    if (!updated) {
      throw new DecisionNotFoundError();
    }

    return updated;
  },
};