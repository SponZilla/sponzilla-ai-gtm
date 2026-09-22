import { prisma } from "../../lib/prisma.js";

import type {
  CreateInteractionInput,
} from "./interaction.validator.js";

export const interactionRepository = {
  create(input: CreateInteractionInput) {
    return prisma.interaction.create({
      data: {
        opportunityId: input.opportunityId,
        type: input.type,
        summary: input.summary,
        occurredAt: input.occurredAt,
      },
    });
  },

  findById(id: string) {
    return prisma.interaction.findUnique({
      where: {
        id,
      },
      include: {
        opportunity: {
          include: {
            company: true,
          },
        },
      },
    });
  },

  findByOpportunityId(opportunityId: string) {
    return prisma.interaction.findMany({
      where: {
        opportunityId,
      },
      orderBy: {
        occurredAt: "desc",
      },
    });
  },
};