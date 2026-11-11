import { createHash } from "node:crypto";

import { extractLinkedInHandle } from "./linkedin-url.js";

/**
 * Cache keys for enrichment lookups.
 *
 * Kept free of Prisma so the key and TTL rules can be tested without a
 * database connection.
 *
 * The point of the cache: a client is charged per successful find, so asking
 * the same question twice is money burnt. Someone already researched for one
 * opportunity is the same person for the next one, and their address does not
 * change because our opportunity changed.
 */

export type EnrichmentKeyType = "LINKEDIN_HANDLE" | "NAME_DOMAIN";

export interface EnrichmentCacheKey {
  keyType: EnrichmentKeyType;
  keyHash: string;
  /** Readable form, for debugging a cache row by eye. */
  lookupKey: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * An address can change with a job move, so a hit is trusted for half a year
 * and re-checked by the decision layer before anything is sent. A miss is
 * short-lived: Hunter's index grows, and today's unknown is next month's find.
 */
export const CACHE_TTL = {
  hitMs: 180 * DAY_MS,
  missMs: 30 * DAY_MS,
} as const;

export function hashLookupKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Only names are normalized, not emails: "Holly Clancey", "HOLLY CLANCEY" and
 * "holly  clancey" are one lookup, while punctuation differences in an address
 * change who receives the mail.
 */
export function normalizeNameForLookup(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,]/g, "")
    .trim();
}

export function buildEnrichmentCacheKeys(input: {
  name: string;
  domain: string | null;
  linkedinUrl?: string | null;
}): EnrichmentCacheKey[] {
  const keys: EnrichmentCacheKey[] = [];
  const handle = extractLinkedInHandle(input.linkedinUrl);

  if (handle) {
    const lookupKey = `linkedin:${handle}`;

    keys.push({
      keyType: "LINKEDIN_HANDLE",
      lookupKey,
      keyHash: hashLookupKey(lookupKey),
    });
  }

  const name = normalizeNameForLookup(input.name);
  const domain = (input.domain ?? "").trim().toLowerCase();

  if (name && domain) {
    const lookupKey = `name:${name}@${domain}`;

    keys.push({
      keyType: "NAME_DOMAIN",
      lookupKey,
      keyHash: hashLookupKey(lookupKey),
    });
  }

  return keys;
}

export function cacheExpiryFor(hit: boolean, now: Date = new Date()): Date {
  return new Date(now.getTime() + (hit ? CACHE_TTL.hitMs : CACHE_TTL.missMs));
}
