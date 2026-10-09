import {
  prisma,
} from "../../lib/prisma.js";

export const decisionHistoryRepository = {
  findRecentExecutedByOpportunity(
    opportunityId: string,
    limit = 10,
  ) {
    return prisma.gTMDecision.findMany({
      where: {
        opportunityId,
        status: "EXECUTED",
      },

      include: {
        executions: {
          where: {
            status: "SUCCEEDED",
          },

          orderBy: {
            executedAt: "desc",
          },

          take: 1,
        },

        outcomes: {
          orderBy: {
            occurredAt: "asc",
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      take: limit,
    });
  },
};