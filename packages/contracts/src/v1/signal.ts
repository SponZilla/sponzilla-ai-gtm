import { z } from 'zod';
import { SignalTypeSchema } from './enums';

/**
 * SignalV1 — structured business/marketing signal.
 * Must reference one or more Evidence ids. INFERENCE over facts, not free invention.
 */
export const SignalV1Schema = z.object({
  id: z.string().min(1),
  type: SignalTypeSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)).min(1),
  sourceUrl: z.string().url().nullable(),
  sourceTitle: z.string().nullable(),
  detectedAt: z.string().min(1),
});
export type SignalV1 = z.infer<typeof SignalV1Schema>;
