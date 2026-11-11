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
   * The freshest ingestion-created opportunity for a company that an operator
   * has not worked yet (still NEW). A later research run refreshes that row
   * instead of adding one duplicate per run.
   */
  findReusableForIntelligence(companyId: string) {
    return prisma.opportunity.findFirst({
      where: {
        companyId,
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
      },
      include: {
        company: true,
      },
    });
  },

  upsertFromIntelligence(
    input: UpsertOpportunityFromIntelligenceInput,
  ) {
    return prisma.opportunity.upsert({
      where: {
        externalId: input.externalId,
      },
      create: {
        companyId: input.companyId,
        title: input.title,
        source: input.source,
        stage: input.stage,
        objective: input.objective,
        estimatedBudget: input.estimatedBudget,
        externalId: input.externalId,
        origin: input.origin,
        intelligenceSnapshot: input.intelligenceSnapshot,
      },
      update: {
        companyId: input.companyId,
        title: input.title,
        objective: input.objective,
        origin: input.origin,
        intelligenceSnapshot: input.intelligenceSnapshot,
      },
      include: {
        company: true,
      },
    });
  },
};