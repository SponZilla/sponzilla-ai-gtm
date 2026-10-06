import type {
  Request,
  Response,
} from "express";

import { z } from "zod";

import {
  decisionService,
} from "./decision.service.js";

import {
  DecisionAlreadyResolvedError,
  DecisionNotFoundError,
  decisionApprovalService,
} from "./decision-approval.service.js";

import {
  DecisionOpportunityNotFoundError,
} from "./decision-context.service.js";

const opportunityParamsSchema = z.object({
  id: z.string().uuid(),
});

const decisionParamsSchema = z.object({
  id: z.string().uuid(),
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
    const decision =
      await decisionApprovalService.resolve(
        parsed.data.id,
        outcome,
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
        error: "DECISION_ALREADY_RESOLVED",
      });
    }

    throw error;
  }
}