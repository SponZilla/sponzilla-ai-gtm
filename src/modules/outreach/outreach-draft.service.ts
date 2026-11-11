import { safeParseOpportunityV1 } from "@sponzilla/contracts/v1";

import type { GTMActionType } from "../../generated/prisma/client.js";

import { env } from "../../config/env.js";

import { prisma } from "../../lib/prisma.js";

import { generateOutreachDraft } from "./email-draft.generator.js";

import { OutreachOpportunityNotFoundError } from "./contact-enrichment.service.js";

export class DraftContactNotFoundError extends Error {
  constructor() {
    super("Contact not found for this opportunity's company");
    this.name = "DraftContactNotFoundError";
  }
}

/**
 * A draft is only worth writing for a recipient we can actually send to.
 * Anything else would be a convincing artifact with no legal destination.
 */
export class RecipientNotSendableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecipientNotSendableError";
  }
}

export class DraftNotFoundError extends Error {
  constructor() {
    super("Outreach draft not found");
    this.name = "DraftNotFoundError";
  }
}

export class DraftNotPendingError extends Error {
  constructor(public readonly status: string) {
    super(`Draft is already ${status}`);
    this.name = "DraftNotPendingError";
  }
}

export const outreachDraftService = {
  async create(
    opportunityId: string,
    input: {
      contactId: string;
      brief?: string;
      action?: GTMActionType;
    },
  ) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { company: true },
    });

    if (!opportunity) {
      throw new OutreachOpportunityNotFoundError();
    }

    const contact = await prisma.contact.findUnique({
      where: { id: input.contactId },
    });

    if (!contact || contact.companyId !== opportunity.companyId) {
      throw new DraftContactNotFoundError();
    }

    if (!contact.email) {
      throw new RecipientNotSendableError(
        "Contact has no email address; enrich the contact first",
      );
    }

    if (contact.emailStatus !== "VERIFIED") {
      throw new RecipientNotSendableError(
        `Contact email is ${contact.emailStatus}; only VERIFIED recipients get outreach drafts`,
      );
    }

    const parsed = opportunity.intelligenceSnapshot
      ? safeParseOpportunityV1(opportunity.intelligenceSnapshot)
      : null;

    const snapshot = parsed?.success ? parsed.data : null;

    const brief = (input.brief ?? env.GTM_OFFERING_BRIEF).trim();

    const generated = await generateOutreachDraft({
      company: {
        name: opportunity.company.name,
        website: opportunity.company.website,
        industry: opportunity.company.industry,
      },
      contact: {
        name: contact.name,
        title: contact.title,
      },
      opportunity: {
        title: opportunity.title,
        objective: opportunity.objective,
      },
      evidence: snapshot?.evidence ?? [],
      signals: snapshot?.signals ?? [],
      recommendation: snapshot?.recommendation ?? null,
      nextActionHint: snapshot?.nextActionHint ?? null,
      brief,
    });

    return prisma.outreachDraft.create({
      data: {
        opportunityId: opportunity.id,
        contactId: contact.id,
        action: input.action ?? "SEND_INTRODUCTION",
        subject: generated.subject,
        body: generated.body,
        modelVersion: generated.modelVersion,
        promptVersion: generated.promptVersion,
        inputSnapshot: {
          brief,
          contactId: contact.id,
          evidenceCount: snapshot?.evidence.length ?? 0,
          signalTypes: (snapshot?.signals ?? []).map((signal) => signal.type),
          model: generated.modelVersion,
          promptVersion: generated.promptVersion,
        },
      },
      include: { contact: true },
    });
  },

  async list(opportunityId: string) {
    return prisma.outreachDraft.findMany({
      where: { opportunityId },
      orderBy: { createdAt: "desc" },
      include: { contact: true },
    });
  },

  /**
   * Approve a draft for sending.
   *
   * This records a human decision and nothing else: no email provider is
   * called, so the status is a review outcome, not a delivery receipt.
   */
  async approve(id: string, operator: { id: string; name: string | null }) {
    const draft = await prisma.outreachDraft.findUnique({ where: { id } });

    if (!draft) {
      throw new DraftNotFoundError();
    }

    if (draft.status !== "DRAFT") {
      throw new DraftNotPendingError(draft.status);
    }

    return prisma.outreachDraft.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: operator.name
          ? `${operator.name} (${operator.id})`
          : operator.id,
      },
      include: { contact: true },
    });
  },

  async reject(id: string, operator: { id: string; name: string | null }) {
    const draft = await prisma.outreachDraft.findUnique({ where: { id } });

    if (!draft) {
      throw new DraftNotFoundError();
    }

    if (draft.status !== "DRAFT") {
      throw new DraftNotPendingError(draft.status);
    }

    return prisma.outreachDraft.update({
      where: { id },
      data: {
        status: "REJECTED",
        approvedBy: operator.name
          ? `${operator.name} (${operator.id})`
          : operator.id,
      },
      include: { contact: true },
    });
  },
};
