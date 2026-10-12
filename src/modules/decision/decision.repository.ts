
import {
  Prisma,
  type DecisionPriority,
  type GTMActionType,
} from "../../generated/prisma/client.js";

import {
  prisma,
} from "../../lib/prisma.js";

import {
  adminAuditRepository,
} from "../audit/admin-audit.repository.js";

/**
 * Input required to create a GTM decision.
 */
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

/**
 * Actor information supplied to the
 * existing approval workflow.
 */
interface ApprovalActorInput {
  actorId: string;
  actorName?: string;
  comment?: string;
}

type ApprovalOutcome =
  | "APPROVED"
  | "REJECTED";

/**
 * Build decision creation data.
 *
 * Centralizing this mapping keeps
 * both creation methods consistent.
 */
function buildDecisionData(
  input: CreateDecisionInput,
): Prisma.GTMDecisionUncheckedCreateInput {
  return {
    opportunityId: input.opportunityId,

    action: input.action,
    priority: input.priority,

    summary: input.summary,
    reasoning: input.reasoning,

    confidence: new Prisma.Decimal(
      input.confidence,
    ),

    inputSnapshot: input.inputSnapshot,
    proposedAction: input.proposedAction,

    modelVersion: input.modelVersion,
    promptVersion: input.promptVersion,
    policyVersion: input.policyVersion,
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
  create(input: CreateDecisionInput) {
    return prisma.gTMDecision.create({
      data: buildDecisionData(input),
    });
  },

  /**
   * Concurrency-safe decision creation.
   *
   * A PostgreSQL transaction-level advisory
   * lock serializes generation requests for
   * the same opportunity.
   *
   * Existing partial unique-index protection
   * remains unchanged.
   */
  async createIfNoPendingDecision(
    input: CreateDecisionInput,
  ) {
    return prisma.$transaction(
      async (tx) => {
        /*
         * Step 1: Acquire transaction-scoped lock.
         */
        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(
            hashtext(${input.opportunityId})
          )
        `;

        /*
         * Step 2: Check for an existing
         * decision awaiting approval.
         */
        const existingDecision =
          await tx.gTMDecision.findFirst({
            where: {
              opportunityId:
                input.opportunityId,

              status: "AWAITING_APPROVAL",
            },

            orderBy: {
              createdAt: "desc",
            },
          });

        if (existingDecision) {
          return {
            kind: "PENDING_EXISTS" as const,
            decision: existingDecision,
          };
        }

        /*
         * Step 3: Create a new decision.
         */
        const decision =
          await tx.gTMDecision.create({
            data: buildDecisionData(input),
          });

        return {
          kind: "CREATED" as const,
          decision,
        };
      },
    );
  },

  /**
   * Find a decision by its unique ID.
   */
  findById(id: string) {
    return prisma.gTMDecision.findUnique({
      where: { id },
    });
  },

  /**
   * Conditional status update.
   *
   * Retained for compatibility with
   * existing services.
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
   * Atomically resolve a GTM decision.
   *
   * The following operations occur
   * inside one Prisma transaction:
   *
   * 1. Find decision.
   * 2. Conditionally update status.
   * 3. Create approval record.
   * 4. Create administrative audit record.
   * 5. Return updated decision.
   *
   * If any database write fails,
   * the entire transaction rolls back.
   */
  async resolveWithApproval(
    decisionId: string,
    outcome: ApprovalOutcome,
    actor: ApprovalActorInput,
  ) {
    return prisma.$transaction(
      async (tx) => {
        /*
         * Step 1: Find the decision.
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
         * Step 2: Conditional status update.
         *
         * Only AWAITING_APPROVAL decisions
         * can transition to APPROVED/REJECTED.
         *
         * updateMany prevents a second
         * concurrent request from resolving
         * the same decision successfully.
         */
        const update =
          await tx.gTMDecision.updateMany({
            where: {
              id: decisionId,
              status: "AWAITING_APPROVAL",
            },

            data: {
              status: outcome,
            },
          });

        if (update.count !== 1) {
          return {
            kind: "ALREADY_RESOLVED" as const,
          };
        }

        /*
         * Step 3: Create approval record.
         */
        const approval =
          await tx.approval.create({
            data: {
              decisionId: decision.id,

              status: outcome,

              actorId: actor.actorId,

              actorName:
                actor.actorName ?? null,

              comment:
                actor.comment ?? null,

              actionSnapshot:
  decision.proposedAction === null
    ? Prisma.JsonNull
    : (decision.proposedAction as Prisma.InputJsonValue),
            },
          });

        /*
         * Step 4: Create audit record.
         *
         * IMPORTANT:
         * Pass the existing transaction client.
         *
         * Do not create a separate transaction
         * or use the standalone Prisma client.
         */
        await adminAuditRepository.create(
          {
            action:
              outcome === "APPROVED"
                ? "DECISION_APPROVED"
                : "DECISION_REJECTED",

            resourceType: "GTM_DECISION",

            resourceId: decision.id,

            actorType: "INTERNAL_SERVICE",

            actorId: actor.actorId,

            outcome: "SUCCESS",
          },
          tx,
        );

        /*
         * Step 5: Retrieve updated decision.
         *
         * The transaction commits only
         * after this operation succeeds.
         */
        const updatedDecision =
          await tx.gTMDecision.findUniqueOrThrow({
            where: {
              id: decisionId,
            },
          });

        return {
          kind: "RESOLVED" as const,

          decision: updatedDecision,

          approval,
        };
      },
    );
  },

  /**
   * Mark an approved decision as executed.
   *
   * Retained for compatibility.
   *
   * Execution orchestration should continue
   * using its existing atomic repository
   * methods rather than this legacy helper.
   */
  markExecutedIfApproved(
    decisionId: string,
  ) {
    return prisma.gTMDecision.updateMany({
      where: {
        id: decisionId,
        status: "APPROVED",
      },

      data: {
        status: "EXECUTED",
      },
    });
  },

  /**
   * Mark an approved decision as failed.
   *
   * Retained for compatibility.
   */
  markFailedIfApproved(
    decisionId: string,
  ) {
    return prisma.gTMDecision.updateMany({
      where: {
        id: decisionId,
        status: "APPROVED",
      },

      data: {
        status: "FAILED",
      },
    });
  },

  /**
   * Find the latest pending decision
   * for an opportunity.
   */
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
