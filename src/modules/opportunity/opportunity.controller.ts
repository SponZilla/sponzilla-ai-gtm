import type { Request, Response } from "express";

import {
  CompanyNotFoundError,
  opportunityService,
} from "./opportunity.service.js";

import {
  createOpportunitySchema,
  opportunityIdSchema,
} from "./opportunity.validator.js";

export async function createOpportunity(
  req: Request,
  res: Response,
) {
  const parsed = createOpportunitySchema.safeParse(
    req.body,
  );

  if (!parsed.success) {
    return res.status(400).json({
      error: "INVALID_REQUEST",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const opportunity =
      await opportunityService.createOpportunity(
        parsed.data,
      );

    return res.status(201).json({
      data: opportunity,
    });
  } catch (error) {
    if (error instanceof CompanyNotFoundError) {
      return res.status(404).json({
        error: "COMPANY_NOT_FOUND",
      });
    }

    throw error;
  }
}

export async function getOpportunity(
  req: Request,
  res: Response,
) {
  const parsed = opportunityIdSchema.safeParse(
    req.params,
  );

  if (!parsed.success) {
    return res.status(400).json({
      error: "INVALID_OPPORTUNITY_ID",
    });
  }

  const opportunity =
    await opportunityService.getOpportunity(
      parsed.data.id,
    );

  if (!opportunity) {
    return res.status(404).json({
      error: "OPPORTUNITY_NOT_FOUND",
    });
  }

  return res.status(200).json({
    data: opportunity,
  });
}

export async function listOpportunities(
  _req: Request,
  res: Response,
) {
  const opportunities =
    await opportunityService.listOpportunities();

  return res.status(200).json({
    data: opportunities,
  });
}