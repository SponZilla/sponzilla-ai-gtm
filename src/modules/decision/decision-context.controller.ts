import type {
  Request,
  Response,
} from "express";

import {
  DecisionOpportunityNotFoundError,
  decisionContextService,
} from "./decision-context.service.js";

import { z } from "zod";

const decisionContextParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function getDecisionContext(
  req: Request,
  res: Response,
) {
  const parsed = decisionContextParamsSchema.safeParse(
    req.params,
  );

  if (!parsed.success) {
    return res.status(400).json({
      error: "INVALID_OPPORTUNITY_ID",
    });
  }

  try {
    const context = await decisionContextService.build(
      parsed.data.id,
    );

    return res.status(200).json({
      data: context,
    });
  } catch (error) {
    if (
      error instanceof DecisionOpportunityNotFoundError
    ) {
      return res.status(404).json({
        error: "OPPORTUNITY_NOT_FOUND",
      });
    }

    throw error;
  }
}