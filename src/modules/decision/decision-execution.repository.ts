import {
  Prisma,
  type GTMActionType,
} from "../../generated/prisma/client.js";

import {
  adminAuditRepository,
} from "../audit/admin-audit.repository.js";

import {
  prisma,
} from "../../lib/prisma.js";

interface CreateExecutionInput {
  decisionId: string;
  approvalId: string;
  action: GTMActionType;
  actionSnapshot: Prisma.JsonObject;
}

function isJsonObject(
  value: Prisma.JsonValue,
): value is Prisma.JsonObject {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function jsonEquals(
  left: Prisma.JsonValue,
  right: Prisma.JsonValue,
): boolean {
  if (left === right) return true;

  if (left === null || right === null) {
    return false;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }

    return (
      left.length === right.length &&
      left.every((value, index) =>
        jsonEquals(value, right[index]!)
      )
    );
  }

  if (
    typeof left === "object" &&
    typeof right === "object"
  ) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) =>
          Object.prototype.hasOwnProperty.call(right, key) &&
          jsonEquals(left[key]!, right[key]!)
      )
    );
  }

  return false;
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

          /*
 * Verify the decision and approval
 * within the same database transaction.
 */
const decision =
  await tx.gTMDecision.findUnique({
    where: {
      id: input.decisionId,
    },
    select: {
      id: true,
      status: true,
      action: true,
      proposedAction: true,
    },
  });

if (!decision || decision.status !== "APPROVED") {
  return {
    kind: "INVALID_DECISION_STATE" as const,
  };
}

if (decision.action !== input.action) {
  return {
    kind: "ACTION_MISMATCH" as const,
  };
}

const approval =
  await tx.approval.findFirst({
    where: {
      id: input.approvalId,
      decisionId: input.decisionId,
      status: "APPROVED",
    },
    select: {
  id: true,
  actionSnapshot: true,
},
  });

if (!approval) {
  return {
    kind: "INVALID_APPROVAL" as const,
  };
}

/*
 * Ensure the approved payload has not
 * diverged from the decision proposal.
 */
if (
  !isJsonObject(decision.proposedAction) ||
  !isJsonObject(approval.actionSnapshot) ||
  !jsonEquals(
    decision.proposedAction,
    approval.actionSnapshot,
  )
) {
  return {
    kind: "INVALID_ACTION_SNAPSHOT" as const,
  };
}

/*
 * Validate caller-provided JSON before comparison.
 *
 * JSON serialization normalizes Prisma input JSON
 * into the same representation used for comparison.
 */
if (
  !jsonEquals(
    approval.actionSnapshot,
    JSON.parse(
      JSON.stringify(input.actionSnapshot),
    ) as Prisma.JsonValue,
  )
) {
  return {
    kind: "INVALID_ACTION_SNAPSHOT" as const,
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
  approval.actionSnapshot as Prisma.InputJsonValue,
              },
            });

            /*
 * Record the creation of a pending execution
 * inside the existing transaction.
 *
 * No duplicate audit is created when
 * an execution already exists.
 */
await adminAuditRepository.create(
  {
    action: "DECISION_EXECUTION_REQUESTED",
    resourceType: "EXECUTION",
    resourceId: execution.id,
    actorType: "INTERNAL_SERVICE",
    outcome: "SUCCESS",
    metadata: {
      executionStatus: "PENDING",
    },
  },
  tx,
);

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


async claimForExecution(
  executionId: string,
  decisionId: string,
) {
  return prisma.$transaction(async (tx) => {
    const decision =
      await tx.gTMDecision.findFirst({
        where: {
          id: decisionId,
          status: "APPROVED",
        },
        select: {
          id: true,
        },
      });

    if (!decision) {
      return {
        kind: "INVALID_DECISION_STATE" as const,
      };
    }

    const now = new Date();

    const claim =
      await tx.execution.updateMany({
        where: {
          id: executionId,
          decisionId,
          status: "PENDING",
          startedAt: null,
        },
        data: {
          startedAt: now,
          lastHeartbeatAt: now,
        },
      });

    if (claim.count !== 1) {
      return {
        kind: "ALREADY_CLAIMED_OR_INVALID" as const,
      };
    }

    const execution =
      await tx.execution.findUniqueOrThrow({
        where: {
          id: executionId,
        },
      });

    return {
      kind: "CLAIMED" as const,
      execution,
    };
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

/**
 * Atomically completes a prepared execution.
 *
 * Both the Execution and GTMDecision must
 * be in their expected states.
 *
 * Either both updates commit, or neither does.
 */
async completeAtomically(
  executionId: string,
  decisionId: string,
  result: Prisma.InputJsonValue,
) {
  return prisma.$transaction(async (tx) => {
    /*
     * 1. Verify that the execution belongs
     * to this decision and is still PENDING.
     */
    const execution =
      await tx.execution.findFirst({
        where: {
          id: executionId,
          decisionId,
          status: "PENDING",
        },
      });

    if (!execution) {
      return {
        kind: "INVALID_EXECUTION_STATE" as const,
      };
    }

    /*
     * 2. Transition the decision first.
     *
     * The conditional update prevents
     * unexpected status changes.
     */
    const decisionUpdate =
      await tx.gTMDecision.updateMany({
        where: {
          id: decisionId,
          status: "APPROVED",
        },
        data: {
          status: "EXECUTED",
        },
      });

    if (decisionUpdate.count !== 1) {
      return {
        kind: "INVALID_DECISION_STATE" as const,
      };
    }

    /*
     * 3. Transition execution to SUCCEEDED.
     *
     * Only a PENDING execution may succeed.
     */
    const executionUpdate =
      await tx.execution.updateMany({
        where: {
          id: executionId,
          decisionId,
          status: "PENDING",
        },
        data: {
          status: "SUCCEEDED",
          result,
          errorMessage: null,
          executedAt: new Date(),
        },
      });

    if (executionUpdate.count !== 1) {
      /*
       * Throwing is essential here:
       * returning would commit the earlier
       * decision status update.
       */
      throw new Error(
        "Execution state changed during atomic completion",
      );
    }

    /*
 * Persist successful execution audit
 * in the same database transaction.
 *
 * If the audit insert fails, both
 * status transitions roll back.
 */
await adminAuditRepository.create(
  {
    action: "DECISION_EXECUTED",
    resourceType: "EXECUTION",
    resourceId: executionId,
    actorType: "INTERNAL_SERVICE",
    outcome: "SUCCESS",
    metadata: {
      executionStatus: "SUCCEEDED",
    },
  },
  tx,
);

    const completedExecution =
      await tx.execution.findUniqueOrThrow({
        where: {
          id: executionId,
        },
      });

    return {
      kind: "COMPLETED" as const,
      execution: completedExecution,
    };
  });
},


/**
 * Atomically records an executor failure.
 *
 * Only PENDING executions belonging to
 * APPROVED decisions can transition to FAILED.
 *
 * Both records are updated together.
 */
async failAtomically(
  executionId: string,
  decisionId: string,
  errorMessage: string,
) {
  return prisma.$transaction(async (tx) => {
    /*
     * 1. Confirm execution is still PENDING.
     */
    const execution =
      await tx.execution.findFirst({
        where: {
          id: executionId,
          decisionId,
          status: "PENDING",
        },
      });

    if (!execution) {
      return {
        kind: "INVALID_EXECUTION_STATE" as const,
      };
    }

    /*
     * 2. Transition the decision.
     */
    const decisionUpdate =
      await tx.gTMDecision.updateMany({
        where: {
          id: decisionId,
          status: "APPROVED",
        },
        data: {
          status: "FAILED",
        },
      });

    if (decisionUpdate.count !== 1) {
      return {
        kind: "INVALID_DECISION_STATE" as const,
      };
    }

    /*
     * 3. Transition the execution.
     *
     * Guard against overwriting an
     * already completed execution.
     */
    const executionUpdate =
      await tx.execution.updateMany({
        where: {
          id: executionId,
          decisionId,
          status: "PENDING",
        },
        data: {
          status: "FAILED",
          errorMessage:
            errorMessage.slice(0, 2000),
          executedAt: new Date(),
        },
      });

    if (executionUpdate.count !== 1) {
      /*
       * Roll back the decision update.
       */
      throw new Error(
        "Execution state changed during atomic failure transition",
      );
    }

    /*
 * Persist failed execution audit
 * in the same transaction as both
 * FAILED status transitions.
 *
 * Do not include raw error messages
 * or potentially sensitive payloads.
 */
await adminAuditRepository.create(
  {
    action: "DECISION_EXECUTION_FAILED",
    resourceType: "EXECUTION",
    resourceId: executionId,
    actorType: "INTERNAL_SERVICE",
    outcome: "FAILURE",
    metadata: {
      executionStatus: "FAILED",
    },
  },
  tx,
);

    const failedExecution =
      await tx.execution.findUniqueOrThrow({
        where: {
          id: executionId,
        },
      });

    return {
      kind: "FAILED" as const,
      execution: failedExecution,
    };
  });
},


/**
 * Find pending executions that have
 * never been claimed.
 *
 * Read-only: no status changes.
 */
findUnclaimedExecutions(
  limit: number = 50,
) {
  const safeLimit = Math.max(
    1,
    Math.min(
      100,
      Number.isFinite(limit)
        ? Math.trunc(limit)
        : 50,
    ),
  );

  return prisma.execution.findMany({
    where: {
      status: "PENDING",
      startedAt: null,
    },
    orderBy: [
      { createdAt: "asc" },
      { id: "asc" },
    ],
    take: safeLimit,
  });
},

/**
 * Find claimed PENDING executions whose
 * last recorded activity may be stale.
 *
 * A stale execution is NOT automatically
 * considered failed.
 */
findPotentiallyStaleExecutions(
  staleBefore: Date,
  limit: number = 50,
) {
  if (
    Number.isNaN(staleBefore.getTime())
  ) {
    throw new Error(
      "staleBefore must be a valid Date",
    );
  }

  const safeLimit = Math.max(
    1,
    Math.min(
      100,
      Number.isFinite(limit)
        ? Math.trunc(limit)
        : 50,
    ),
  );

  return prisma.execution.findMany({
    where: {
      status: "PENDING",
      startedAt: {
        not: null,
      },
      OR: [
        {
          lastHeartbeatAt: {
            lt: staleBefore,
          },
        },
        {
          lastHeartbeatAt: null,
          startedAt: {
            lt: staleBefore,
          },
        },
      ],
    },
    orderBy: [
      { createdAt: "asc" },
      { id: "asc" },
    ],
    take: safeLimit,
  });
},



};