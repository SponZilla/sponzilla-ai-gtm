import { prisma } from "../../lib/prisma.js";

export const decisionContextRepository = {
  findOpportunityContext(opportunityId: string) {
    return prisma.opportunity.findUnique({
      where: {
        id: opportunityId,
      },

      select: {
        id: true,
        title: true,
        source: true,
        stage: true,
        estimatedBudget: true,
        objective: true,
        lastInteractionAt: true,

        company: {
          select: {
            id: true,
            name: true,
            website: true,
            industry: true,
          },
        },

        interactions: {
          select: {
            id: true,
            type: true,
            summary: true,
            occurredAt: true,
          },

          orderBy: {
            occurredAt: "desc",
          },

          take: 20,
        },
      },
    });
  },
};