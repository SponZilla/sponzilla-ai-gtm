import { z } from 'zod';
import { CompanyV1Schema } from './company';
import { EvidenceV1Schema } from './evidence';
import { SignalV1Schema } from './signal';
import {
  BuyerPersonaV1Schema,
  DecisionMakerV1Schema,
  ICPAssessmentV1Schema,
} from './buyer';
import {
  ConfidenceLevelSchema,
  OpportunityOriginSchema,
  QualificationStatusSchema,
} from './enums';

/**
 * AIInferenceV1 — INFERENCE layer only.
 * Must never be treated as verified fact by GTM.
 */
export const AIInferenceV1Schema = z.object({
  summary: z.string().min(1),
  groundedReasoning: z.string().min(1),
  assumptions: z.array(z.string()).default([]),
  unsupportedClaimsWarning: z.string().nullable().default(null),
});
export type AIInferenceV1 = z.infer<typeof AIInferenceV1Schema>;

/**
 * OpportunityV1 — THE canonical MI → GTM handoff object.
 *
 * Layer map (never mix):
 *   FACT / EVIDENCE  → company, evidence[], signals[].evidenceIds, sources (via evidence)
 *   AI INFERENCE     → aiInference, confidence*, audience, marketingNeed
 *   RECOMMENDATION   → recommendation, nextActionHint
 *   HUMAN DECISION   → (not on this object — lives in GTM Approval)
 *   ACTION           → (not on this object — lives in GTM Execution)
 *   OUTCOME          → (not on this object — lives in GTM Outcome)
 *
 * Intentionally REMOVED vs MI Opportunity today:
 *   - outcome          → GTM-owned
 *   - status REVIEWED/ACTIONED/ARCHIVED → GTM pipeline stages, not MI qualification
 *
 * Renames vs MI today:
 *   - status → qualificationStatus (QUALIFIED | NO_VERIFIED_OPPORTUNITY)
 *   - nextAction → nextActionHint (recommendation, not a committed action)
 *   - company.category → company.industry
 *   - company.websiteUrl kept (GTM maps to website on persist)
 */
export const OpportunityV1Schema = z.object({
  contractVersion: z.literal('v1'),

  /** MI-generated opportunity id (e.g. opp_…). GTM stores as external ref. */
  id: z.string().min(1),

  origin: OpportunityOriginSchema.default('MARKET_INTELLIGENCE'),

  company: CompanyV1Schema,

  /** FACT/EVIDENCE-backed signals. Empty only when qualificationStatus = NO_VERIFIED. */
  signals: z.array(SignalV1Schema),

  /** Source-linked evidence items. */
  evidence: z.array(EvidenceV1Schema),

  /**
   * Target audience description.
   * IMPLEMENTED in MI as free-text. Prefer buyerPersonas when available.
   */
  audience: z.string().min(1),

  /** Why this company needs marketing/sponsorship help — INFERENCE from signals. */
  marketingNeed: z.string().min(1),

  aiInference: AIInferenceV1Schema,

  confidence: ConfidenceLevelSchema,
  confidenceReason: z.string().nullable().default(null),

  /** RECOMMENDATION — what SponZilla should pitch. Not a human decision. */
  recommendation: z.string().min(1),

  /**
   * RECOMMENDATION hint for GTM (e.g. "Send campus deck…").
   * GTM Decision Engine may override. Not an executed action.
   */
  nextActionHint: z.string().min(1),

  qualificationStatus: QualificationStatusSchema,

  // ── PLANNED / optional until MI implements ──────────────────────────
  icpAssessment: ICPAssessmentV1Schema.nullable().default(null),
  buyerPersonas: z.array(BuyerPersonaV1Schema).default([]),
  decisionMakers: z.array(DecisionMakerV1Schema).default([]),

  /** ISO timestamp when MI produced this opportunity. */
  producedAt: z.string().min(1),
});
export type OpportunityV1 = z.infer<typeof OpportunityV1Schema>;

/** Runtime validate before MI sends / after GTM receives. */
export function parseOpportunityV1(data: unknown): OpportunityV1 {
  return OpportunityV1Schema.parse(data);
}

export function safeParseOpportunityV1(data: unknown) {
  return OpportunityV1Schema.safeParse(data);
}
