import type {
  Request,
  Response,
} from "express";

import {
  decisionOutcomeService,
  OutcomeDecisionNotExecutedError,
  OutcomeDecisionNotFoundError,
  OutcomeAlreadyTerminalError,
} from "./decision-outcome.service.js";

import {
  decisionOutcomeParamsSchema,
  recordDecisionOutcomeBodySchema,
} from "./decision-outcome.validator.js";

/**
 * POST /decisions/:id/outcomes
 *
 * Records a new outcome for an executed
 * GTM decision.
 */
export async function recordDecisionOutcome(
  req: Request,
  res: Response,
) {
  const parsedParams =
    decisionOutcomeParamsSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    return res.status(400).json({
      error: "INVALID_DECISION_ID",

      details:
        parsedParams.error.flatten(),
    });
  }

  const parsedBody =
    recordDecisionOutcomeBodySchema.safeParse(
      req.body,
    );

  if (!parsedBody.success) {
    return res.status(400).json({
      error:
        "INVALID_OUTCOME_INPUT",

      details:
        parsedBody.error.flatten(),
    });
  }

  try {
    const outcome =
      await decisionOutcomeService.record(
        parsedParams.data.id,
        parsedBody.data,
      );

    return res.status(201).json({
      data: outcome,
    });
  } catch (error) {
    if (
      error instanceof
      OutcomeDecisionNotFoundError
    ) {
      return res.status(404).json({
        error:
          "DECISION_NOT_FOUND",
      });
    }

    if (
  error instanceof
  OutcomeAlreadyTerminalError
) {
  return res.status(409).json({
    error:
      "OUTCOME_ALREADY_TERMINAL",
  });
}

    if (
      error instanceof
      OutcomeDecisionNotExecutedError
    ) {
      return res.status(409).json({
        error:
          "DECISION_NOT_EXECUTED",
      });
    }

    throw error;
  }
}

/**
 * GET /decisions/:id/outcomes
 *
 * Returns all recorded outcomes for
 * a decision.
 */
export async function listDecisionOutcomes(
  req: Request,
  res: Response,
) {
  const parsedParams =
    decisionOutcomeParamsSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    return res.status(400).json({
      error: "INVALID_DECISION_ID",

      details:
        parsedParams.error.flatten(),
    });
  }

  try {
    const outcomes =
      await decisionOutcomeService.list(
        parsedParams.data.id,
      );

    return res.status(200).json({
      data: outcomes,
    });
  } catch (error) {
    if (
      error instanceof
      OutcomeDecisionNotFoundError
    ) {
      return res.status(404).json({
        error:
          "DECISION_NOT_FOUND",
      });
    }

    throw error;
  }
}