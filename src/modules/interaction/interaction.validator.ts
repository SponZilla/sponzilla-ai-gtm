import { z } from "zod";

import { InteractionType } from "../../generated/prisma/client.js";

export const createInteractionSchema = z.object({
  opportunityId: z.string().uuid(),

  type: z.enum(InteractionType),

  summary: z
    .string()
    .trim()
    .min(1)
    .max(2000),

  occurredAt: z.coerce.date(),
});

export const interactionIdSchema = z.object({
  id: z.string().uuid(),
});

export const opportunityInteractionsSchema = z.object({
  opportunityId: z.string().uuid(),
});

export type CreateInteractionInput = z.infer<
  typeof createInteractionSchema
>;