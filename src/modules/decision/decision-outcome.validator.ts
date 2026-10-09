import {
  z,
} from "zod";

export const decisionOutcomeParamsSchema =
  z.object({
    id: z.string().uuid(),
  });

export const recordDecisionOutcomeBodySchema =
  z.object({
    type: z.enum([
      "EMAIL_OPENED",
      "REPLIED",
      "MEETING_BOOKED",
      "PROPOSAL_ACCEPTED",
      "PROPOSAL_REJECTED",
      "OPPORTUNITY_WON",
      "OPPORTUNITY_LOST",
    ]),

    value: z
      .number()
      .finite()
      .optional(),

    metadata: z
      .record(
        z.string(),
        z.unknown(),
      )
      .optional(),

    occurredAt: z.coerce.date(),
  });