import type {
  Request,
  Response,
} from "express";

import { interactionService } from "./interaction.service.js";

import {
  createInteractionSchema,
  interactionIdSchema,
  opportunityInteractionsSchema,
} from "./interaction.validator.js";

export async function createInteraction(
  req: Request,
  res: Response,
) {
  const parsed = createInteractionSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "INVALID_INTERACTION_DATA",
      details: parsed.error.flatten(),
    });
  }

  try {
    const interaction =
      await interactionService.createInteraction(parsed.data);

    return res.status(201).json({
      data: interaction,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "OPPORTUNITY_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: "OPPORTUNITY_NOT_FOUND",
      });
    }

    throw error;
  }
}

export async function getInteraction(
  req: Request,
  res: Response,
) {
  const parsed = interactionIdSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(400).json({
      error: "INVALID_INTERACTION_ID",
    });
  }

  const interaction =
    await interactionService.getInteraction(parsed.data.id);

  if (!interaction) {
    return res.status(404).json({
      error: "INTERACTION_NOT_FOUND",
    });
  }

  return res.status(200).json({
    data: interaction,
  });
}

export async function listOpportunityInteractions(
  req: Request,
  res: Response,
) {
  const parsed =
    opportunityInteractionsSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(400).json({
      error: "INVALID_OPPORTUNITY_ID",
    });
  }

  const interactions =
    await interactionService.getOpportunityInteractions(
      parsed.data.opportunityId,
    );

  return res.status(200).json({
    data: interactions,
  });
}