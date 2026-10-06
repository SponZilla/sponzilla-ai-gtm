import { z } from "zod";

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

export const proposedActionSchema = z
  .object({
    type: z.enum([
      "RESEARCH",
      "OUTREACH",
      "FOLLOW_UP",
      "PREPARE_PROPOSAL",
      "REQUEST_INFORMATION",
    ]),

    description: z
      .string()
      .trim()
      .min(1)
      .max(1000),

    requiresApproval: z.literal(true),
  })
  .strict();

export const gtmDecisionOutputSchema = z
  .object({
    action: z.enum([
      "REQUEST_MORE_INFORMATION",
      "RESEARCH_COMPANY",
      "SEND_INTRODUCTION",
      "SEND_CASE_STUDY",
      "SEND_CAMPAIGN_PROPOSAL",
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
        z.string().trim().min(1).max(500),
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

    proposedAction: proposedActionSchema,
  })
  .strict();

export type GTMDecisionOutput = z.infer<
  typeof gtmDecisionOutputSchema
>;