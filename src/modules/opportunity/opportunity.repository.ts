import {
  Prisma,
  type OpportunitySource,
  type OpportunityStage,
} from "../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";

import type {
  CreateOpportunityInput,
} from "./opportunity.validator.js";

export interface UpsertOpportunityFromIntelligenceInput {
  externalId: string;
  companyId: string;
  title: string;
  source: OpportunitySource;
  stage: OpportunityStage;
  objective: string;
  estimatedBudget: null;
  origin: string;
  intelligenceSnapshot: Prisma.InputJsonValue;
  /// The user whose research produced this card. Null only when the caller
  /// supplied no user; such a row is an ingest gap, not shared work.
  ownerId: string | null;
}

export const opportunityRepository = {
  create(input: CreateOpportunityInput) {
    return prisma.opportunity.create({
      data: {
        companyId: input.companyId,
        title: input.title,
        source: input.source,
        stage: input.stage,

        estimatedBudget:
          input.estimatedBudget !== undefined
            ? new Prisma.Decimal(
                input.estimatedBudget,
              )
            : undefined,

        objective: input.objective,

        lastInteractionAt:
          input.lastInteractionAt,
      },
    });
  },

  findById(id: string) {
    return prisma.opportunity.findUnique({
      where: {
        id,
      },
      include: {
        company: true,
      },
    });
  },

  findAll() {
    return prisma.opportunity.findMany({
      include: {
        company: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  /**
   * The cards this operator created from their own research, and nothing else.
   * Ownership is written at ingest, so there is no cross-user visibility to
   * filter around.
   */
  findOwnedBy(ownerId: string) {
    return prisma.opportunity.findMany({
      where: { ownerId },
      include: {
        company: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  },

  /**
   * The freshest ingestion-created opportunity for a company that the same
   * operator has not worked yet (still NEW). A later research run by that
   * operator refreshes the row instead of adding a duplicate.
   * has not worked yet (still NEW). A later research run refreshes that row
   * instead of adding one duplicate per run.
   */
  findReusableForIntelligence(companyId: string, ownerId: string | null) {
    return prisma.opportunity.findFirst({
      where: {
        companyId,
        ownerId,
        externalId: { not: null },
        stage: "NEW",
      },
      orderBy: { updatedAt: "desc" },
    });
  },

  refreshFromIntelligence(
    id: string,
    input: UpsertOpportunityFromIntelligenceInput,
  ) {
    return prisma.opportunity.update({
      where: { id },
      data: {
        companyId: input.companyId,
        title: input.title,
        objective: input.objective,
        origin: input.origin,
        externalId: input.externalId,
        intelligenceSnapshot: input.intelligenceSnapshot,
        ownerId: input.ownerId ?? undefined,
      },
      include: {
        company: true,
      },
    });
  },

  /**
   * The same research run is one card per user, so the lookup is scoped by
   * owner. Without this, a second user ingesting the same run would silently
   * take over the first user's card.
   */
  findByExternalIdAndOwner(externalId: string, ownerId: string | null) {
    return prisma.opportunity.findFirst({
      where: {
        externalId,
        ownerId,
      },
      include: {
        company: true,
      },
    });
  },

  createFromIntelligence(
    input: UpsertOpportunityFromIntelligenceInput,
  ) {
    return prisma.opportunity.create({
      data: {
        companyId: input.companyId,
        title: input.title,
        source: input.source,
        stage: input.stage,
        objective: input.objective,
        estimatedBudget: input.estimatedBudget,
        externalId: input.externalId,
        origin: input.origin,
        intelligenceSnapshot: input.intelligenceSnapshot,
        ownerId: input.ownerId,
      },
      include: {
        company: true,
      },
    });
  },
};