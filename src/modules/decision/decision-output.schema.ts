import { z } from "zod";

/*
 * Evidence supporting a GTM decision.
 *
 * Every decision must be explainable using
 * information already available to the system.
 */
export const decisionEvidenceSchema = z
  .object({
    source: z.enum([
      "COMPANY",
      "OPPORTUNITY",
      "INTERACTION",
      "MARKET_INTELLIGENCE",
    ]),

    description: z
      .string()
      .trim()
      .min(1)
      .max(500),

    reference: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .optional(),
  })
  .strict();

/*
 * Safe representation of what should happen
 * after the decision is approved.
 *
 * These are execution categories, not the
 * actual GTM decision types.
 */
export const proposedActionSchema = z
  .object({
    type: z.enum([
      "RESEARCH",
      "OUTREACH",
      "FOLLOW_UP",
      "PREPARE_PROPOSAL",
      "PREPARE_PRICING",
      "SCHEDULE_MEETING",
      "ESCALATE",
      "WAIT",
      "CLOSE",
      "REQUEST_INFORMATION",
    ]),

    description: z
      .string()
      .trim()
      .min(1)
      .max(1000),

    /*
     * Human approval remains mandatory.
     */
    requiresApproval: z.literal(true),
  })
  .strict();

/*
 * Canonical deterministic GTM decision output.
 *
 * Keep this aligned with Prisma GTMActionType.
 */
export const gtmDecisionOutputSchema = z
  .object({
    action: z.enum([
      "REQUEST_MORE_INFORMATION",
      "RESEARCH_COMPANY",
      "SEND_INTRODUCTION",
      "SEND_CASE_STUDY",
      "SEND_CAMPAIGN_PROPOSAL",
      "SCHEDULE_DISCOVERY_CALL",
      "FOLLOW_UP",
      "PREPARE_PRICING",
      "ESCALATE_TO_SALES",
      "WAIT",
      "CLOSE_OPPORTUNITY",
    ]),

    priority: z.enum([
      "LOW",
      "MEDIUM",
      "HIGH",
    ]),

    summary: z
      .string()
      .trim()
      .min(1)
      .max(500),

    reasoning: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(500),
      )
      .min(1)
      .max(5),

    evidence: z
      .array(decisionEvidenceSchema)
      .min(1)
      .max(10),

    confidence: z
      .number()
      .min(0)
      .max(1),

    proposedAction:
      proposedActionSchema,
  })
  .strict();

export type GTMDecisionOutput =
  z.infer<
    typeof gtmDecisionOutputSchema
  >;