import {
  Prisma,
  type DecisionPriority,
  type GTMActionType,
} from "../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";

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

export const decisionRepository = {
  /**
   * Create a new GTM decision.
   */
  create(input: CreateDecisionInput) {
    return prisma.gTMDecision.create({
      data: {
        opportunityId:
          input.opportunityId,

        action: input.action,
        priority: input.priority,

        summary: input.summary,
        reasoning: input.reasoning,

        confidence: new Prisma.Decimal(
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
      },
    });
  },

  /**
   * Find a decision by ID.
   */
  findById(id: string) {
    return prisma.gTMDecision.findUnique({
      where: {
        id,
      },
    });
  },

  /**
   * Update the decision only when it is still
   * waiting for human approval.
   *
   * Kept for compatibility with the previous
   * approval implementation.
   */
  updateStatusIfAwaitingApproval(
    id: string,
    status: ApprovalOutcome,
  ) {
    return prisma.gTMDecision.updateMany({
      where: {
        id,
        status: "AWAITING_APPROVAL",
      },

      data: {
        status,
      },
    });
  },

  /**
   * Atomically resolve a decision and create
   * the corresponding Approval audit record.
   */
  async resolveWithApproval(
    decisionId: string,
    outcome: ApprovalOutcome,
    actor: ApprovalActorInput,
  ) {
    return prisma.$transaction(
      async (tx) => {
        /*
         * Read the decision first because we need
         * proposedAction for the immutable approval
         * snapshot.
         */
        const decision =
          await tx.gTMDecision.findUnique({
            where: {
              id: decisionId,
            },
          });

        if (!decision) {
          return {
            kind: "NOT_FOUND" as const,
          };
        }

        /*
         * updateMany gives us a safe conditional
         * update:
         *
         * AWAITING_APPROVAL -> APPROVED/REJECTED
         *
         * If another request already resolved it,
         * count will be 0.
         */
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

        /*
         * Record who approved/rejected the
         * decision and exactly what action they
         * reviewed.
         */
        const approval =
          await tx.approval.create({
            data: {
              decisionId:
                decision.id,

              status: outcome,

              actorId:
                actor.actorId,

              actorName:
                actor.actorName ??
                null,

              comment:
                actor.comment ??
                null,

             actionSnapshot:
  decision.proposedAction as Prisma.InputJsonValue,
            },
        });

        /*
         * Return the final decision state.
         */
        const updatedDecision =
          await tx.gTMDecision.findUniqueOrThrow(
            {
              where: {
                id: decisionId,
              },
            },
          );

        return {
          kind: "RESOLVED" as const,

          decision:
            updatedDecision,

          approval,
        };
      },
    );
  },
};