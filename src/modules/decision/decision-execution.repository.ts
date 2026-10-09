import {
  Prisma,
  type GTMActionType,
} from "../../generated/prisma/client.js";

import {
  prisma,
} from "../../lib/prisma.js";

interface CreateExecutionInput {
  decisionId: string;
  approvalId: string;
  action: GTMActionType;
  actionSnapshot: Prisma.InputJsonValue;
}

export const decisionExecutionRepository = {
  /**
   * Finds an APPROVED decision together with
   * its latest APPROVED approval record.
   */
  findApprovedDecision(
    decisionId: string,
  ) {
    return prisma.gTMDecision.findFirst({
      where: {
        id: decisionId,
        status: "APPROVED",
      },

      include: {
        approvals: {
          where: {
            status: "APPROVED",
          },

          orderBy: {
            createdAt: "desc",
          },

          take: 1,
        },
      },
    });
  },

  findByDecisionId(
  decisionId: string,
) {
  return prisma.execution.findUnique({
    where: {
      decisionId,
    },
  });
},

  /**
   * Creates a single PENDING execution for
   * an approved decision.
   *
   * The database UNIQUE constraint on
   * decisionId is the final protection
   * against concurrent duplicate requests.
   */
  async createPendingIfAbsent(
    input: CreateExecutionInput,
  ) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existing =
            await tx.execution.findUnique({
              where: {
                decisionId:
                  input.decisionId,
              },
            });

          if (existing) {
            return {
              kind:
                "ALREADY_EXISTS" as const,
              execution: existing,
            };
          }

          const execution =
            await tx.execution.create({
              data: {
                decisionId:
                  input.decisionId,

                approvalId:
                  input.approvalId,

                action:
                  input.action,

                status: "PENDING",

                actionSnapshot:
                  input.actionSnapshot,
              },
            });

          return {
            kind: "CREATED" as const,
            execution,
          };
        },
      );
    } catch (error) {
      /*
       * Two concurrent transactions could
       * both observe that no execution exists.
       *
       * The DB unique constraint prevents
       * the second INSERT. Prisma reports
       * that conflict as P2002.
       */
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing =
          await prisma.execution.findUnique({
            where: {
              decisionId:
                input.decisionId,
            },
          });

        if (!existing) {
          /*
           * Extremely defensive fallback:
           * a P2002 was received but the
           * conflicting execution could not
           * subsequently be retrieved.
           */
          throw error;
        }

        return {
          kind:
            "ALREADY_EXISTS" as const,
          execution: existing,
        };
      }

      throw error;
    }
  },

  /**
   * Retrieves an execution by its primary ID.
   */
  findById(
    executionId: string,
  ) {
    return prisma.execution.findUnique({
      where: {
        id: executionId,
      },
    });
  },

  /**
   * Marks a completed action as successful
   * and stores its execution result.
   */
  markSucceeded(
    executionId: string,
    result: Prisma.InputJsonValue,
  ) {
    return prisma.execution.update({
      where: {
        id: executionId,
      },

      data: {
        status: "SUCCEEDED",
        result,
        errorMessage: null,
        executedAt: new Date(),
      },
    });
  },

  /**
   * Marks an execution as failed while
   * preserving the failure reason.
   */
  markFailed(
    executionId: string,
    errorMessage: string,
  ) {
    return prisma.execution.update({
      where: {
        id: executionId,
      },

      data: {
        status: "FAILED",
        errorMessage,
        executedAt: new Date(),
      },
    });
  },
};