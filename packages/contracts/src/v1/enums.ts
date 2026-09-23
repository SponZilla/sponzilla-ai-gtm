import { z } from 'zod';

/** Provenance of a qualified opportunity at the MI → GTM boundary. */
export const OpportunityOriginSchema = z.enum([
  'MARKET_INTELLIGENCE',
  'MANUAL',
  'INBOUND',
  'REFERRAL',
  'PARTNER',
]);
export type OpportunityOrigin = z.infer<typeof OpportunityOriginSchema>;

/**
 * Qualification status — produced by Market Intelligence.
 * Do NOT put GTM pipeline stages (CONTACTED, WON, LOST) here.
 */
export const QualificationStatusSchema = z.enum([
  'QUALIFIED',
  'NO_VERIFIED_OPPORTUNITY',
]);
export type QualificationStatus = z.infer<typeof QualificationStatusSchema>;

export const ConfidenceLevelSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export const SourceVerificationStatusSchema = z.enum([
  'VERIFIED_LIVE',
  'UNVERIFIED',
  'FAILED_REACHABILITY',
]);
export type SourceVerificationStatus = z.infer<
  typeof SourceVerificationStatusSchema
>;

/**
 * Preserved from MI SignalTypeEnum — IMPLEMENTED.
 * Do not invent new signal types without updating the MI detector.
 */
export const SignalTypeSchema = z.enum([
  'product_launch',
  'store_opening',
  'regional_expansion',
  'local_expansion',
  'marketing_campaign',
  'youth_campus_campaign',
  'sponsorship_announcement',
  'event_sponsorship',
  'marketing_hiring',
  'new_location',
  'influencer_campaign',
  'college_event_activity',
  'general_growth',
]);
export type SignalType = z.infer<typeof SignalTypeSchema>;

/** ICP fit — PLANNED fields; optional on OpportunityV1 until MI implements scoring. */
export const IcpFitSchema = z.enum(['STRONG', 'MODERATE', 'WEAK', 'UNKNOWN']);
export type IcpFit = z.infer<typeof IcpFitSchema>;
