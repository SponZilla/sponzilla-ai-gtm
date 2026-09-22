import { z } from "zod";

import { OpportunitySource } from "../../generated/prisma/client.js";

export const createOpportunitySchema = z.object({
  companyId: z.string().uuid(),

  title: z
    .string()
    .trim()
    .min(1)
    .max(200),

  source: z.nativeEnum(OpportunitySource),

  stage: z.enum([
    "NEW",
    "CONTACTED",
    "INTERESTED",
    "NEGOTIATION",
    "WON",
    "LOST",
  ]).default("NEW"),

  estimatedBudget: z.coerce
    .number()
    .positive()
    .max(9_999_999_999.99)
    .optional(),

  objective: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .optional(),

  lastInteractionAt: z.coerce
    .date()
    .optional(),
});

export const opportunityIdSchema = z.object({
  id: z.string().uuid(),
});

export type CreateOpportunityInput = z.infer<
  typeof createOpportunitySchema
>;