import { z } from "zod";

const signalSchema = z
  .object({
    type: z
      .string()
      .trim()
      .min(1)
      .max(100),

    description: z
      .string()
      .trim()
      .min(1)
      .max(1000),

    detectedAt: z.iso.date(),

    sourceUrl: z
      .url()
      .max(2048),
  })
  .strict();

const evidenceSchema = z
  .object({
    fact: z
      .string()
      .trim()
      .min(1)
      .max(1000),

    sourceUrl: z
      .url()
      .max(2048),

    sourceTitle: z
      .string()
      .trim()
      .min(1)
      .max(300),

    confidence: z
      .number()
      .min(0)
      .max(1),
  })
  .strict();

const companySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(200),

    website: z
      .url()
      .max(2048),

    industry: z
      .string()
      .trim()
      .min(1)
      .max(200),

    location: z
      .string()
      .trim()
      .min(1)
      .max(200),
  })
  .strict();

const aiInferenceSchema = z
  .object({
    audience: z
      .array(
        z.string().trim().min(1).max(100),
      )
      .min(1)
      .max(20),

    marketingNeed: z
      .string()
      .trim()
      .min(1)
      .max(1500),

    interpretation: z
      .string()
      .trim()
      .min(1)
      .max(1500),

    confidence: z
      .number()
      .min(0)
      .max(1),
  })
  .strict();

const recommendationSchema = z
  .object({
    recommendation: z
      .string()
      .trim()
      .min(1)
      .max(1000),

    nextActionHint: z
      .string()
      .trim()
      .min(1)
      .max(1000),
  })
  .strict();

export const marketIntelligenceOpportunitySchema = z
  .object({
    contractVersion: z.literal("v1"),

    opportunityId: z
  .string()
  .trim()
  .min(1)
  .max(200),

    company: companySchema,

    signals: z
      .array(signalSchema)
      .min(1)
      .max(50),

    evidence: z
      .array(evidenceSchema)
      .min(1)
      .max(50),

    aiInference: aiInferenceSchema,

    recommendation: recommendationSchema,
  })
  .strict();

export type MarketIntelligenceOpportunityInput =
  z.infer<
    typeof marketIntelligenceOpportunitySchema
  >;