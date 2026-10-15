import { z } from "zod";

/*
 * Gemini is permitted to enrich
 * the explanation only.
 *
 * It cannot select actions,
 * approve decisions, or execute them.
 */
export const gtmAIResponseSchema = z
  .object({
    summary: z
      .string()
      .trim()
      .min(1)
      .max(500),

    reasoning: z
      .array(
        z.string()
          .trim()
          .min(1)
          .max(500),
      )
      .min(1)
      .max(5),
  })
  .strict();

export type GTMAIResponse = z.infer<
  typeof gtmAIResponseSchema
>;