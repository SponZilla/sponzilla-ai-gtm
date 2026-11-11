import { prisma } from "../../lib/prisma.js";

import { cacheExpiryFor, type EnrichmentCacheKey } from "./enrichment-cache.keys.js";
import type { EmailLookupResult } from "./hunter-email.provider.js";

/**
 * Read-through cache in front of the enrichment providers.
 *
 * Without it, the same decision-maker is paid for again every time an
 * opportunity is re-enriched, and again when a related opportunity turns out
 * to involve the same person. With it, the second question is free.
 */

export interface EnrichmentCacheStats {
  /** Answered from an earlier lookup, without a provider call. */
  hits: number;
  /** Had to ask a provider, and was stored for next time. */
  misses: number;
}

export interface CacheDependencies {
  now?: Date;
}

function toLookupResult(entry: {
  email: string | null;
  emailStatus: string | null;
  confidence: number | null;
  provider: string;
  sourceUrl: string | null;
  linkedinUrl: string | null;
}): EmailLookupResult | null {
  if (!entry.email) {
    return null;
  }

  return {
    email: entry.email,
    emailStatus: entry.emailStatus === "VERIFIED" ? "VERIFIED" : "UNVERIFIED",
    confidence: entry.confidence,
    provider: entry.provider === "APOLLO" ? "APOLLO" : "HUNTER",
    sourceUrl: entry.sourceUrl,
    matchedVia: "CACHE",
    linkedinUrl: entry.linkedinUrl,
  };
}

/**
 * First unexpired entry for any of the keys, best key first: the LinkedIn
 * handle wins over a name, because a handle identifies one member while a name
 * identifies whoever shares it.
 */
export async function readEnrichmentLookup(
  keys: EnrichmentCacheKey[],
  dependencies: CacheDependencies = {},
): Promise<EmailLookupResult | null> {
  if (keys.length === 0) {
    return null;
  }

  const now = dependencies.now ?? new Date();

  const entry = await prisma.enrichmentLookup.findFirst({
    where: {
      OR: keys.map((key) => ({
        keyType: key.keyType,
        keyHash: key.keyHash,
      })),
      expiresAt: { gt: now },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!entry || !entry.hit) {
    return null;
  }

  return toLookupResult(entry);
}

/**
 * Store the answer for every key that identifies this person, including a
 * miss. Misses are recorded because a repeat miss costs latency on every run,
 * and because some providers charge for calls that find nothing.
 *
 * The provider on a miss is CHAIN: both providers were asked and neither had
 * an address, so attributing the miss to one of them would be a lie.
 */
export async function writeEnrichmentLookup(
  keys: EnrichmentCacheKey[],
  result: EmailLookupResult | null,
  dependencies: CacheDependencies = {},
): Promise<void> {
  if (keys.length === 0) {
    return;
  }

  const now = dependencies.now ?? new Date();
  const hit = Boolean(result?.email);

  const data = {
    hit,
    email: result?.email ?? null,
    emailStatus: result?.emailStatus ?? null,
    confidence: result?.confidence ?? null,
    sourceUrl: result?.sourceUrl ?? null,
    linkedinUrl: result?.linkedinUrl ?? null,
    creditsUsed: hit ? 1 : 0,
    expiresAt: cacheExpiryFor(hit, now),
  };

  const provider = result?.provider ?? "CHAIN";

  for (const key of keys) {
    await prisma.enrichmentLookup.upsert({
      where: {
        provider_keyType_keyHash: {
          provider,
          keyType: key.keyType,
          keyHash: key.keyHash,
        },
      },
      create: {
        provider,
        keyType: key.keyType,
        keyHash: key.keyHash,
        lookupKey: key.lookupKey,
        ...data,
      },
      update: {
        hit: data.hit,
        email: data.email,
        emailStatus: data.emailStatus,
        confidence: data.confidence,
        sourceUrl: data.sourceUrl,
        linkedinUrl: data.linkedinUrl,
        creditsUsed: data.creditsUsed,
        expiresAt: data.expiresAt,
      },
    });
  }
}
