import {
  decisionRepository,
} from "./decision.repository.js";

import {
  decisionOutcomeRepository,
} from "./decision-outcome.repository.js";

import type {
  RecordDecisionOutcomeInput,
} from "./decision-outcome.types.js";

export class OutcomeDecisionNotFoundError
  extends Error {
  constructor() {
    super("Decision not found");

    this.name =
      "OutcomeDecisionNotFoundError";
  }
}

export class OutcomeAlreadyTerminalError
  extends Error {
  constructor() {
    super(
      "A terminal outcome has already been recorded for this decision",
    );

    this.name =
      "OutcomeAlreadyTerminalError";
  }
}

export class OutcomeDecisionNotExecutedError
  extends Error {
  constructor() {
    super(
      "Outcome cannot be recorded before the decision is executed",
    );

    this.name =
      "OutcomeDecisionNotExecutedError";
  }
}

export const decisionOutcomeService = {
  async record(
    decisionId: string,
    input: RecordDecisionOutcomeInput,
  ) {
    const decision =
      await decisionRepository.findById(
        decisionId,
      );

    if (!decision) {
      throw new OutcomeDecisionNotFoundError();
    }

    /*
     * For now outcomes belong only to actions
     * that completed the execution pipeline.
     *
     * This prevents outcomes from being attached
     * to rejected/unapproved recommendations.
     */
    if (
      decision.status !==
      "EXECUTED"
    ) {
      throw new OutcomeDecisionNotExecutedError();
    }


    const result =
  await decisionOutcomeRepository
    .createWithTerminalGuard({
      decisionId,

      type:
        input.type,

      ...(input.value !== undefined
        ? {
            value:
              input.value,
          }
        : {}),

      ...(input.metadata !== undefined
        ? {
            metadata:
              input.metadata,
          }
        : {}),

      occurredAt:
        input.occurredAt,
    });

if (
  result.kind ===
  "TERMINAL_EXISTS"
) {
  throw new OutcomeAlreadyTerminalError();
}

return result.outcome;
  },

  async list(
    decisionId: string,
  ) {
    const decision =
      await decisionRepository.findById(
        decisionId,
      );

    if (!decision) {
      throw new OutcomeDecisionNotFoundError();
    }

    return decisionOutcomeRepository
      .findByDecisionId(
        decisionId,
      );
  },
};