import { z } from 'zod';

/**
 * CompanyV1 — shared company identity at the contract boundary.
 *
 * Maps from:
 *   MI: Opportunity.company { name, websiteUrl, location, category }
 *   GTM Prisma: Company { name, website, industry }
 *
 * Persistence IDs stay local to each system. contractId is stable across handoff.
 */
export const CompanyV1Schema = z.object({
  /** Stable cross-system identity (e.g. slug or MI-generated id). Not a DB PK. */
  contractId: z.string().min(1),

  name: z.string().min(1),

  /** Canonical website URL. Always include protocol. */
  websiteUrl: z.string().url(),

  /** Geographic focus if known. null = unknown. */
  location: z.string().nullable(),

  /**
   * Industry / category label.
   * MI today: `category`. GTM today: `industry`. Contract uses one name.
   */
  industry: z.string().nullable(),
});
export type CompanyV1 = z.infer<typeof CompanyV1Schema>;
