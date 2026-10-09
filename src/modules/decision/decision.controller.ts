
import type {
  Request,
  Response,
} from "express";

import { z } from "zod";

import {
  decisionService,
  PendingDecisionExistsError,
} from "./decision.service.js";

import {
  DecisionAlreadyResolvedError,
  DecisionNotFoundError,
  decisionApprovalService,
} from "./decision-approval.service.js";

import {
  decisionExecutionOrchestrator,
} from "./decision-execution.orchestrator.js";

import {
  ApprovalNotFoundError,
  DecisionAlreadyExecutedError,
  DecisionNotApprovedError,
  ExecutionDecisionNotFoundError,
} from "./decision-execution.service.js";

import {
  DecisionOpportunityNotFoundError,
} from "./decision-context.service.js";

const opportunityParamsSchema = z.object({
  id: z.string().uuid(),
});

const decisionParamsSchema = z.object({
  id: z.string().uuid(),
});

const decisionApprovalBodySchema = z.object({
  actorId: z.string().min(1),
  actorName: z.string().min(1).optional(),
  comment: z.string().min(1).optional(),
});

export async function generateDecision(
  req: Request,
  res: Response,
) {
  const parsed =
    opportunityParamsSchema.safeParse(
      req.params,
    );

  if (!parsed.success) {
    return res.status(400).json({
      error: "INVALID_OPPORTUNITY_ID",
    });
  }

  try {
    const result =
      await decisionService.generate(
        parsed.data.id,
      );

    return res.status(201).json({
      data: result,
    });
  } catch (error) {
    if (
      error instanceof
      DecisionOpportunityNotFoundError
    ) {
      return res.status(404).json({
        error: "OPPORTUNITY_NOT_FOUND",
      });
    }

    /*
     * Step 7J.3:
     *
     * The repository has detected an existing
     * AWAITING_APPROVAL decision.
     *
     * Return HTTP 409 instead of creating
     * another pending decision.
     */
    if (
      error instanceof
      PendingDecisionExistsError
    ) {
      return res.status(409).json({
        error: "PENDING_DECISION_EXISTS",

        message: error.message,

        decisionId: error.decisionId,
      });
    }

    throw error;
  }
}

export async function approveDecision(
  req: Request,
  res: Response,
) {
  return resolveDecision(
    req,
    res,
    "APPROVED",
  );
}

export async function rejectDecision(
  req: Request,
  res: Response,
) {
  return resolveDecision(
    req,
    res,
    "REJECTED",
  );
}

async function resolveDecision(
  req: Request,
  res: Response,
  outcome: "APPROVED" | "REJECTED",
) {
  const parsedParams =
    decisionParamsSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    return res.status(400).json({
      error: "INVALID_DECISION_ID",
    });
  }

  const parsedBody =
    decisionApprovalBodySchema.safeParse(
      req.body,
    );

  if (!parsedBody.success) {
    return res.status(400).json({
      error: "INVALID_APPROVAL_INPUT",
      details:
        parsedBody.error.flatten(),
    });
  }

  try {
    const decision =
      await decisionApprovalService.resolve(
        parsedParams.data.id,
        outcome,
        parsedBody.data,
      );

    return res.status(200).json({
      data: decision,
    });
  } catch (error) {
    if (
      error instanceof
      DecisionNotFoundError
    ) {
      return res.status(404).json({
        error: "DECISION_NOT_FOUND",
      });
    }

    if (
      error instanceof
      DecisionAlreadyResolvedError
    ) {
      return res.status(409).json({
        error:
          "DECISION_ALREADY_RESOLVED",
      });
    }

    throw error;
  }
}

export async function executeDecision(
  req: Request,
  res: Response,
) {
  const parsed =
    decisionParamsSchema.safeParse(
      req.params,
    );

  if (!parsed.success) {
    return res.status(400).json({
      error: "INVALID_DECISION_ID",
    });
  }

  try {
    const execution =
      await decisionExecutionOrchestrator.execute(
        parsed.data.id,
      );

    return res.status(200).json({
      data: execution,
    });
  } catch (error) {
    if (
      error instanceof
      ExecutionDecisionNotFoundError
    ) {
      return res.status(404).json({
        error: "DECISION_NOT_FOUND",
      });
    }

    if (
      error instanceof
      DecisionNotApprovedError
    ) {
      return res.status(409).json({
        error: "DECISION_NOT_APPROVED",
      });
    }

    if (
      error instanceof
      ApprovalNotFoundError
    ) {
      return res.status(409).json({
        error: "APPROVAL_NOT_FOUND",
      });
    }

    if (
      error instanceof
      DecisionAlreadyExecutedError
    ) {
      return res.status(409).json({
        error:
          "DECISION_ALREADY_EXECUTED",
      });
    }

    throw error;
  }
}
