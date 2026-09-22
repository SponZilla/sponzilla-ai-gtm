import { Prisma } from "../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";

import type {
  CreateOpportunityInput,
} from "./opportunity.validator.js";

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
};