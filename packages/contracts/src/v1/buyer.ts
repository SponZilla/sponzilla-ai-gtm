import { z } from 'zod';
import { IcpFitSchema } from './enums';

/**
 * ICPAssessmentV1 — PLANNED / PARTIALLY stubbed.
 * Not produced by MI today. Optional on OpportunityV1; send null until implemented.
 */
export const ICPAssessmentV1Schema = z.object({
  fit: IcpFitSchema,
  /** Free-text reasons; keep short. */
  reasons: z.array(z.string()).default([]),
  /** Optional numeric score 0–1 when a scorer exists. */
  score: z.number().min(0).max(1).nullable().default(null),
  assessedAt: z.string().nullable().default(null),
});
export type ICPAssessmentV1 = z.infer<typeof ICPAssessmentV1Schema>;

/**
 * BuyerPersonaV1 — PLANNED.
 * Closest MI field today is free-text `audience`. Until personas exist, keep optional.
 */
export const BuyerPersonaV1Schema = z.object({
  label: z.string().min(1),
  description: z.string().nullable().default(null),
  /** e.g. campus_gen_z, fitness_urban — free taxonomy for v1 */
  segment: z.string().nullable().default(null),
});
export type BuyerPersonaV1 = z.infer<typeof BuyerPersonaV1Schema>;

/**
 * DecisionMakerV1 — PLANNED.
 * MI must NOT invent contacts. Only include when source-backed or human-entered.
 */
export const DecisionMakerV1Schema = z.object({
  name: z.string().nullable().default(null),
  title: z.string().nullable().default(null),
  linkedinUrl: z.string().url().nullable().default(null),
  email: z.string().email().nullable().default(null),
  /** How we know this person — FACT provenance. */
  sourceUrl: z.string().url().nullable().default(null),
  verified: z.boolean().default(false),
});
export type DecisionMakerV1 = z.infer<typeof DecisionMakerV1Schema>;
