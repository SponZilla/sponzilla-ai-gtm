import type { Request, Response } from "express";

import { z } from "zod";

import {
  OutreachOpportunityNotFoundError,
  enrichOutreachContacts,
  listOutreachTargets,
} from "./contact-enrichment.service.js";

import {
  DraftGenerationFailedError,
  DraftGenerationUnavailableError,
} from "./email-draft.generator.js";

import {
  DraftContactNotFoundError,
  DraftNotFoundError,
  DraftNotPendingError,
  RecipientNotSendableError,
  outreachDraftService,
} from "./outreach-draft.service.js";

import { opportunityOwnershipService } from "./opportunity-ownership.service.js";

interface OperatorLocals {
  operator: { id: string; name: string };
}

const opportunityParamsSchema = z.object({ id: z.string().uuid() });
const draftParamsSchema = z.object({ id: z.string().uuid() });

const enrichBodySchema = z
  .object({ limit: z.number().int().min(1).max(10).optional() })
  .strict();

const createDraftBodySchema = z
  .object({
    contactId: z.string().uuid(),
    brief: z.string().min(1).max(4000).optional(),
    action: z
      .enum([
        "SEND_INTRODUCTION",
        "SEND_CASE_STUDY",
        "SEND_CAMPAIGN_PROPOSAL",
        "FOLLOW_UP",
      ])
      .optional(),
  })
  .strict();

/**
 * The operator's own cards: the ones generated from their research requests.
 * Scoped in the query, so another user's card is not merely hidden in the
 * browser — it is never sent to this user at all.
 */
export async function listMyOpportunities(_req: Request, res: Response) {
  const { operator } = res.locals as OperatorLocals;

  const opportunities = await opportunityOwnershipService.listForOperator(
    operator.id,
  );

  return res.status(200).json({ data: opportunities });
}

export async function getOutreachTargets(req: Request, res: Response) {
  const parsed = opportunityParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_OPPORTUNITY_ID" });
  }

  try {
    const result = await listOutreachTargets(parsed.data.id);
    return res.status(200).json({ data: result });
  } catch (error) {
    if (error instanceof OutreachOpportunityNotFoundError) {
      return res.status(404).json({ error: "OPPORTUNITY_NOT_FOUND" });
    }

    throw error;
  }
}

export async function enrichContacts(req: Request, res: Response) {
  const parsedParams = opportunityParamsSchema.safeParse(req.params);
  const parsedBody = enrichBodySchema.safeParse(req.body ?? {});

  if (!parsedParams.success) {
    return res.status(400).json({ error: "INVALID_OPPORTUNITY_ID" });
  }

  if (!parsedBody.success) {
    return res.status(400).json({ error: "INVALID_ENRICHMENT_REQUEST" });
  }

  try {
    const result = await enrichOutreachContacts(parsedParams.data.id, {
      limit: parsedBody.data.limit,
    });

    return res.status(200).json({ data: result });
  } catch (error) {
    if (error instanceof OutreachOpportunityNotFoundError) {
      return res.status(404).json({ error: "OPPORTUNITY_NOT_FOUND" });
    }

    throw error;
  }
}

export async function createOutreachDraft(req: Request, res: Response) {
  const parsedParams = opportunityParamsSchema.safeParse(req.params);
  const parsedBody = createDraftBodySchema.safeParse(req.body ?? {});

  if (!parsedParams.success) {
    return res.status(400).json({ error: "INVALID_OPPORTUNITY_ID" });
  }

  if (!parsedBody.success) {
    return res.status(400).json({ error: "INVALID_DRAFT_REQUEST" });
  }

  try {
    const draft = await outreachDraftService.create(
      parsedParams.data.id,
      parsedBody.data,
    );

    return res.status(201).json({ data: draft });
  } catch (error) {
    if (error instanceof OutreachOpportunityNotFoundError) {
      return res.status(404).json({ error: "OPPORTUNITY_NOT_FOUND" });
    }

    if (error instanceof DraftContactNotFoundError) {
      return res.status(404).json({ error: "CONTACT_NOT_FOUND" });
    }

    if (error instanceof RecipientNotSendableError) {
      return res.status(409).json({
        error: "RECIPIENT_NOT_SENDABLE",
        message: error.message,
      });
    }

    if (error instanceof DraftGenerationUnavailableError) {
      return res.status(503).json({
        error: "DRAFT_PROVIDER_NOT_CONFIGURED",
        message: error.message,
      });
    }

    if (error instanceof DraftGenerationFailedError) {
      return res.status(502).json({
        error: "DRAFT_GENERATION_FAILED",
        message: error.message,
      });
    }

    throw error;
  }
}

export async function listOutreachDrafts(req: Request, res: Response) {
  const parsed = opportunityParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_OPPORTUNITY_ID" });
  }

  const drafts = await outreachDraftService.list(parsed.data.id);

  return res.status(200).json({ data: drafts });
}

export async function approveOutreachDraft(req: Request, res: Response) {
  const parsed = draftParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_DRAFT_ID" });
  }

  try {
    const draft = await outreachDraftService.approve(
      parsed.data.id,
      res.locals.operator,
    );

    return res.status(200).json({ data: draft });
  } catch (error) {
    if (error instanceof DraftNotFoundError) {
      return res.status(404).json({ error: "DRAFT_NOT_FOUND" });
    }

    if (error instanceof DraftNotPendingError) {
      return res.status(409).json({
        error: "DRAFT_NOT_PENDING",
        status: error.status,
      });
    }

    throw error;
  }
}

export async function rejectOutreachDraft(req: Request, res: Response) {
  const parsed = draftParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_DRAFT_ID" });
  }

  try {
    const draft = await outreachDraftService.reject(
      parsed.data.id,
      res.locals.operator,
    );

    return res.status(200).json({ data: draft });
  } catch (error) {
    if (error instanceof DraftNotFoundError) {
      return res.status(404).json({ error: "DRAFT_NOT_FOUND" });
    }

    if (error instanceof DraftNotPendingError) {
      return res.status(409).json({
        error: "DRAFT_NOT_PENDING",
        status: error.status,
      });
    }

    throw error;
  }
}
