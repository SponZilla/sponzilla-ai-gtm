import { z } from 'zod';
import { SourceVerificationStatusSchema } from './enums';

/**
 * SourceV1 — FACT layer provenance.
 * Immutable once captured. Evidence references sources by id.
 */
export const SourceV1Schema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  title: z.string().min(1),
  publishedDate: z.string().nullable(),
  snippet: z.string(),
  verificationStatus: SourceVerificationStatusSchema,
  capturedAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
});
export type SourceV1 = z.infer<typeof SourceV1Schema>;

/**
 * EvidenceV1 — FACT + light AI annotation, still source-linked.
 *
 * Breaking rename vs MI today:
 *   MI `opportunity` (string pitch on evidence) → `suggestedAngle`
 *   so it never collides with the Opportunity entity.
 *
 * Layers on this object:
 *   claim / fact  → FACT (must be source-backed)
 *   aiInference   → AI INFERENCE (must not invent facts)
 *   suggestedAngle → RECOMMENDATION hint at evidence grain (optional framing)
 */
export const EvidenceV1Schema = z.object({
  id: z.string().min(1),

  /** Short factual claim derived from the source. */
  claim: z.string().min(1),

  /** Normalized fact statement. FACT layer. */
  fact: z.string().min(1),

  /** AI interpretation of the fact. INFERENCE layer — never present as fact. */
  aiInference: z.string().min(1),

  /**
   * Optional sponsorship/GTM angle suggested from this evidence item.
   * RECOMMENDATION grain — not a confirmed opportunity.
   * Renamed from MI field `opportunity` to avoid entity collision.
   */
  suggestedAngle: z.string().nullable(),

  sourceId: z.string().min(1),

  source: z.object({
    title: z.string().min(1),
    url: z.string().url(),
    type: z.string().min(1),
    publishedAt: z.string().nullable(),
    verified: z.boolean(),
  }),

  confidenceScore: z.number().min(0).max(1),
});
export type EvidenceV1 = z.infer<typeof EvidenceV1Schema>;
