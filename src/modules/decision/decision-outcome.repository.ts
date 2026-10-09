import {
  Prisma,
  type OutcomeType,
} from "../../generated/prisma/client.js";

import {
  prisma,
} from "../../lib/prisma.js";

interface CreateOutcomeInput {
  decisionId: string;

  type: OutcomeType;

  value?: number;

  metadata?: Record<
    string,
    unknown
  >;

  occurredAt: Date;
}

type TerminalOutcomeType =
  | "OPPORTUNITY_WON"
  | "OPPORTUNITY_LOST";

const TERMINAL_OUTCOME_TYPES:
  TerminalOutcomeType[] = [
    "OPPORTUNITY_WON",
    "OPPORTUNITY_LOST",
  ];

function buildOutcomeData(
  input: CreateOutcomeInput,
) {
  return {
    decisionId:
      input.decisionId,

    type:
      input.type,

    value:
      input.value === undefined
        ? null
        : new Prisma.Decimal(
            input.value,
          ),

    metadata:
      input.metadata === undefined
        ? undefined
        : (
            input.metadata as Prisma.InputJsonValue
          ),

    occurredAt:
      input.occurredAt,
  };
}

export const decisionOutcomeRepository = {
  /**
   * Creates a normal outcome.
   *
   * The service decides whether this method
   * is appropriate for the requested outcome.
   */
  create(
    input: CreateOutcomeInput,
  ) {
    return prisma.outcome.create({
      data:
        buildOutcomeData(input),
    });
  },

  /**
   * Creates an outcome while protecting the
   * terminal-outcome lifecycle against
   * concurrent requests.
   *
   * The PostgreSQL advisory transaction lock
   * is scoped to the decision ID.
   *
   * Requests for the same decision are
   * serialized for this transaction.
   */
  async createWithTerminalGuard(
    input: CreateOutcomeInput,
  ) {
    return prisma.$transaction(
      async (tx) => {
        /*
         * Acquire a transaction-level advisory
         * lock based on the decision UUID.
         *
         * hashtext() converts the UUID string
         * into a stable PostgreSQL integer key.
         *
         * The lock is automatically released
         * when this transaction ends.
         */
        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(
            hashtext(${input.decisionId})
          )
        `;

        /*
         * Re-check terminal state AFTER obtaining
         * the lock.
         *
         * This is the important concurrency-safe
         * check.
         */
        const terminalOutcome =
          await tx.outcome.findFirst({
            where: {
              decisionId:
                input.decisionId,

              type: {
                in:
                  TERMINAL_OUTCOME_TYPES,
              },
            },

            orderBy: {
              occurredAt:
                "desc",
            },
          });

        if (terminalOutcome) {
          return {
            kind:
              "TERMINAL_EXISTS" as const,

            outcome:
              terminalOutcome,
          };
        }

        const outcome =
          await tx.outcome.create({
            data:
              buildOutcomeData(
                input,
              ),
          });

        return {
          kind:
            "CREATED" as const,

          outcome,
        };
      },
    );
  },

  /**
   * Returns the complete outcome history
   * for a decision.
   */
  findByDecisionId(
    decisionId: string,
  ) {
    return prisma.outcome.findMany({
      where: {
        decisionId,
      },

      orderBy: {
        occurredAt:
          "desc",
      },
    });
  },

  /**
   * Finds an existing terminal business
   * outcome.
   */
  findTerminalOutcome(
    decisionId: string,
  ) {
    return prisma.outcome.findFirst({
      where: {
        decisionId,

        type: {
          in:
            TERMINAL_OUTCOME_TYPES,
        },
      },

      orderBy: {
        occurredAt:
          "desc",
      },
    });
  },
};