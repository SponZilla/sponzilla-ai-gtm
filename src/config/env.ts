import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1),

  // Calls SponZilla's protected /api/auth/me to verify application JWTs.
  SPONZILLA_AUTH_API_URL: z.string().url().optional(),
  CORS_ALLOWED_ORIGINS: z.string().default(""),

  /*
   * Person/email enrichment. Without the key, enrichment is
   * skipped and reported as unconfigured — never faked.
   */
  HUNTER_API_KEY: z.string().min(1).optional(),

  /*
   * Apollo fallback for the addresses Hunter cannot confirm. Only its own
   * "verified" status is treated as sendable.
   *
   * Off unless explicitly enabled: its people/match endpoint silently answers
   * a name-only lookup with somebody else at another company, so it stays
   * paused until we decide it earns its credits.
   */
  APOLLO_API_KEY: z.string().min(1).optional(),
  APOLLO_ENRICHMENT_ENABLED: z.string().default("false"),

  /*
   * Owner written onto a card when the ingest caller supplies no user. Used by
   * a single-operator pilot so a generated card is not orphaned; in multi-user
   * operation the research request carries the real operator id instead.
   */
  GTM_DEFAULT_OWNER_ID: z.string().min(1).optional(),

  /*
   * Outreach drafting. Without the key, draft generation fails
   * with an explicit 503 instead of producing generic copy.
   */
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().default("gemini-3.8-flash"),

  /// Default offering context used when a draft request omits a brief.
  GTM_OFFERING_BRIEF: z.string().default(""),

  /// Comma-separated persona titles, highest priority first.
  ICP_TARGET_TITLES: z.string().default(""),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Invalid environment variables:",
    result.error.flatten().fieldErrors,
  );

  process.exit(1);
}

export const env = result.data;
