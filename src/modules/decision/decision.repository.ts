import {
  Prisma,
  type DecisionPriority,
  type GTMActionType,
} from "../../generated/prisma/client.js";

import {
  prisma,
} from "../../lib/prisma.js";

interface CreateDecisionInput {
  opportunityId: string;

  action: GTMActionType;
  priority: DecisionPriority;

  summary: string;
  reasoning: string[];
  confidence: number;

  inputSnapshot: Prisma.InputJsonValue;
  proposedAction: Prisma.InputJsonValue;

  modelVersion: string;
  promptVersion: string;
  policyVersion: string;
}

interface ApprovalActorInput {
  actorId: string;
  actorName?: string;
  comment?: string;
}

type ApprovalOutcome =
  | "APPROVED"
  | "REJECTED";

function buildDecisionData(
  input: CreateDecisionInput,
) {
  return {
    opportunityId:
      input.opportunityId,

    action:
      input.action,

    priority:
      input.priority,

    summary:
      input.summary,

    reasoning:
      input.reasoning,

    confidence:
      new Prisma.Decimal(
        input.confidence,
      ),

    inputSnapshot:
      input.inputSnapshot,

    proposedAction:
      input.proposedAction,

    modelVersion:
      input.modelVersion,

    promptVersion:
      input.promptVersion,

    policyVersion:
      input.policyVersion,
  };
}

export const decisionRepository = {
  /**
   * Basic decision creation.
   *
   * Retained for compatibility.
   *
   * Normal GTM generation should use
   * createIfNoPendingDecision().
   */
  create(
    input: CreateDecisionInput,
  ) {
    return prisma.gTMDecision.create({
      data:
        buildDecisionData(input),
    });
  },

  /**
   * Concurrency-safe decision creation.
   *
   * The PostgreSQL transaction-level advisory
   * lock serializes decision generation for
   * the same opportunity.
   *
   * This prevents two simultaneous requests
   * from both creating AWAITING_APPROVAL
   * decisions.
   */
  async createIfNoPendingDecision(
    input: CreateDecisionInput,
  ) {
    return prisma.$transaction(
      async (tx) => {
        /*
         * Lock is scoped to this transaction.
         *
         * Requests for different opportunities
         * can still proceed independently.
         */
        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(
            hashtext(${input.opportunityId})
          )
        `;

        const existingDecision =
          await tx.gTMDecision.findFirst({
            where: {
              opportunityId:
                input.opportunityId,

              status:
                "AWAITING_APPROVAL",
            },

            orderBy: {
              createdAt: "desc",
            },
          });

        if (existingDecision) {
          return {
            kind:
              "PENDING_EXISTS" as const,

            decision:
              existingDecision,
          };
        }

        const decision =
          await tx.gTMDecision.create({
            data:
              buildDecisionData(input),
          });

        return {
          kind:
            "CREATED" as const,

          decision,
        };
      },
    );
  },

  findById(
    id: string,
  ) {
    return prisma.gTMDecision.findUnique({
      where: {
        id,
      },
    });
  },

  updateStatusIfAwaitingApproval(
    id: string,
    status: ApprovalOutcome,
  ) {
    return prisma.gTMDecision.updateMany({
      where: {
        id,

        status:
          "AWAITING_APPROVAL",
      },

      data: {
        status,
      },
    });
  },

  async resolveWithApproval(
    decisionId: string,
    outcome: ApprovalOutcome,
    actor: ApprovalActorInput,
  ) {
    return prisma.$transaction(
      async (tx) => {
        const decision =
          await tx.gTMDecision.findUnique({
            where: {
              id: decisionId,
            },
          });

        if (!decision) {
          return {
            kind:
              "NOT_FOUND" as const,
          };
        }

        const update =
          await tx.gTMDecision.updateMany({
            where: {
              id: decisionId,

              status:
                "AWAITING_APPROVAL",
            },

            data: {
              status: outcome,
            },
          });

        if (update.count !== 1) {
          return {
            kind:
              "ALREADY_RESOLVED" as const,
          };
        }

        const approval =
          await tx.approval.create({
            data: {
              decisionId:
                decision.id,

              status:
                outcome,

              actorId:
                actor.actorId,

              actorName:
                actor.actorName ??
                null,

              comment:
                actor.comment ??
                null,

              actionSnapshot:
                decision
                  .proposedAction as Prisma.InputJsonValue,
            },
          });

        const updatedDecision =
          await tx.gTMDecision
            .findUniqueOrThrow({
              where: {
                id:
                  decisionId,
              },
            });

        return {
          kind:
            "RESOLVED" as const,

          decision:
            updatedDecision,

          approval,
        };
      },
    );
  },

  markExecutedIfApproved(
    decisionId: string,
  ) {
    return prisma.gTMDecision.updateMany({
      where: {
        id:
          decisionId,

        status:
          "APPROVED",
      },

      data: {
        status:
          "EXECUTED",
      },
    });
  },

  markFailedIfApproved(
    decisionId: string,
  ) {
    return prisma.gTMDecision.updateMany({
      where: {
        id:
          decisionId,

        status:
          "APPROVED",
      },

      data: {
        status:
          "FAILED",
      },
    });
  },
  findPendingByOpportunityId(
  opportunityId: string,
) {
  return prisma.gTMDecision.findFirst({
    where: {
      opportunityId,
      status: "AWAITING_APPROVAL",
    },
    orderBy: {
      createdAt: "desc",
    },
  });
},
};