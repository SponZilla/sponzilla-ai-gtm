import {
  safeParseOpportunityV1,
  type OpportunityV1,
} from "@sponzilla/contracts/v1";

import { prisma } from "../../lib/prisma.js";

import {
  ApolloRequestError,
  findEmailWithApollo,
  isApolloConfigured,
} from "./apollo-email.provider.js";

import {
  HunterRequestError,
  findEmailWithHunter,
  isHunterConfigured,
  splitFullName,
  type EmailLookupResult,
} from "./hunter-email.provider.js";

import {
  buildEnrichmentCacheKeys,
} from "./enrichment-cache.keys.js";
import {
  readEnrichmentLookup,
  writeEnrichmentLookup,
  type EnrichmentCacheStats,
} from "./enrichment-cache.service.js";
import { rankTargets, type RankedTarget } from "./persona.ranking.js";

export class OutreachOpportunityNotFoundError extends Error {
  constructor() {
    super("Opportunity not found");
    this.name = "OutreachOpportunityNotFoundError";
  }
}

export interface ContactSummary {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  emailStatus: string;
  linkedinUrl: string | null;
  sourceProvider: string | null;
}

export interface SkippedTarget {
  name: string | null;
  reason:
    | "NO_NAME"
    | "NO_COMPANY_DOMAIN"
    | "PROVIDER_NOT_CONFIGURED"
    | "PROVIDER_ERROR"
    | "EMAIL_NOT_FOUND";
}

export interface EnrichmentReport {
  /** Providers available for this run; addresses are tried in that order. */
  providers: { hunter: boolean; apollo: boolean };
  providerConfigured: boolean;
  targets: RankedTarget[];
  contacts: ContactSummary[];
  skipped: SkippedTarget[];
  /** How many lookups were answered from the cache instead of a provider. */
  cache: EnrichmentCacheStats;
}

export function extractDomain(website: string | null): string | null {
  if (!website) {
    return null;
  }

  try {
    const url = new URL(
      website.startsWith("http") ? website : `https://${website}`,
    );

    return url.hostname.toLowerCase().replace(/^www\./, "").replace(/\/$/, "");
  } catch {
    return null;
  }
}

async function loadTargets(opportunityId: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: { company: true },
  });

  if (!opportunity) {
    throw new OutreachOpportunityNotFoundError();
  }

  const snapshot: OpportunityV1 | null = opportunity.intelligenceSnapshot
    ? (() => {
        const parsed = safeParseOpportunityV1(
          opportunity.intelligenceSnapshot,
        );

        return parsed.success ? parsed.data : null;
      })()
    : null;

  const personaTitles = process.env.ICP_TARGET_TITLES
    ? process.env.ICP_TARGET_TITLES.split(",")
        .map((title) => title.trim())
        .filter(Boolean)
    : undefined;

  return {
    opportunity,
    company: opportunity.company,
    targets: rankTargets(snapshot?.decisionMakers ?? [], { personaTitles }),
  };
}

/**
 * Who we would contact, ranked by persona fit, including LinkedIn URLs.
 * Read-only: spends no enrichment credits.
 */
export async function listOutreachTargets(opportunityId: string) {
  const { company, targets } = await loadTargets(opportunityId);

  const contacts = await prisma.contact.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "asc" },
  });

  return {
    company: {
      id: company.id,
      name: company.name,
      website: company.website,
      domain: extractDomain(company.website),
    },
    targets,
    contacts,
  };
}

/**
 * Turn ranked targets into real Contact rows using Hunter.
 *
 * Only a Hunter "valid" verification is stored as VERIFIED, which is the
 * only status the decision policy accepts as a sendable recipient.
 */
export async function enrichOutreachContacts(
  opportunityId: string,
  options: { limit?: number; fetchImpl?: typeof fetch } = {},
): Promise<EnrichmentReport> {
  const limit = Math.min(Math.max(options.limit ?? 3, 1), 10);

  const { company, targets } = await loadTargets(opportunityId);
  const domain = extractDomain(company.website);
  const hunterConfigured = isHunterConfigured();
  const apolloConfigured = isApolloConfigured();
  const providerConfigured = hunterConfigured || apolloConfigured;

  const existingContacts = await prisma.contact.findMany({
    where: { companyId: company.id },
  });

  const byLinkedIn = new Map<string, (typeof existingContacts)[number]>();
  const byEmail = new Map<string, (typeof existingContacts)[number]>();

  for (const contact of existingContacts) {
    if (contact.linkedinUrl) {
      byLinkedIn.set(contact.linkedinUrl.toLowerCase(), contact);
    }

    if (contact.email) {
      byEmail.set(contact.email.toLowerCase(), contact);
    }
  }

  const skipped: SkippedTarget[] = [];
  const saved: ContactSummary[] = [];
  const cache: EnrichmentCacheStats = { hits: 0, misses: 0 };

  for (const target of targets.slice(0, limit)) {
    if (!target.name) {
      skipped.push({ name: null, reason: "NO_NAME" });
      continue;
    }

    if (!providerConfigured) {
      skipped.push({ name: target.name, reason: "PROVIDER_NOT_CONFIGURED" });
      continue;
    }

    if (!domain) {
      skipped.push({ name: target.name, reason: "NO_COMPANY_DOMAIN" });
      continue;
    }

    const existing = target.linkedinUrl
      ? byLinkedIn.get(target.linkedinUrl.toLowerCase())
      : undefined;

    /*
     * Never spend a credit on somebody we already have a verified address for.
     */
    if (existing?.email && existing.emailStatus === "VERIFIED") {
      continue;
    }

    const { firstName, lastName } = splitFullName(target.name);

    /*
     * Ask the cache before any provider. The same person shows up across
     * opportunities, and their address does not change because our opportunity
     * did, so a second question must not cost a second credit.
     */
    const cacheKeys = buildEnrichmentCacheKeys({
      name: target.name,
      domain,
      linkedinUrl: target.linkedinUrl,
    });

    let lookup: EmailLookupResult | null = await readEnrichmentLookup(cacheKeys);
    const servedFromCache = Boolean(lookup);

    if (servedFromCache) {
      cache.hits += 1;
    } else {
      cache.misses += 1;
    }

    let providerFailed = false;

    if (!servedFromCache && hunterConfigured) {
      try {
        lookup = await findEmailWithHunter(
          {
            firstName,
            lastName,
            domain,
            linkedinUrl: target.linkedinUrl,
          },
          { fetchImpl: options.fetchImpl },
        );
      } catch (error) {
        if (error instanceof HunterRequestError) {
          providerFailed = true;
        } else {
          throw error;
        }
      }
    }

    /*
     * Apollo is a fallback, not a second opinion: it is only asked when Hunter
     * found nothing or could not confirm it, so a confirmed address never
     * costs two credits.
     */
    if (
      !servedFromCache &&
      apolloConfigured &&
      (!lookup || lookup.emailStatus !== "VERIFIED")
    ) {
      try {
        const apolloLookup = await findEmailWithApollo(
          {
            firstName,
            lastName,
            domain,
            linkedinUrl: target.linkedinUrl,
            companyName: company.name,
          },
          { fetchImpl: options.fetchImpl },
        );

        if (
          apolloLookup &&
          (!lookup || apolloLookup.emailStatus === "VERIFIED")
        ) {
          lookup = apolloLookup;
        }
      } catch (error) {
        if (error instanceof ApolloRequestError) {
          providerFailed = true;
        } else {
          throw error;
        }
      }
    }

    /*
     * A cached answer already reflects both providers. A provider error is not
     * cached, or one bad afternoon would look like a permanent miss.
     */
    if (!servedFromCache && !providerFailed) {
      await writeEnrichmentLookup(cacheKeys, lookup);
    }

    if (!lookup) {
      skipped.push({
        name: target.name,
        reason: providerFailed ? "PROVIDER_ERROR" : "EMAIL_NOT_FOUND",
      });

      if (!existing) {
        const created = await prisma.contact.create({
          data: {
            companyId: company.id,
            name: target.name,
            title: target.title,
            linkedinUrl: target.linkedinUrl,
            sourceProvider: "LINKEDIN",
            sourceUrl: target.sourceUrl ?? target.linkedinUrl,
            emailStatus: "UNVERIFIED",
          },
        });

        saved.push({
          id: created.id,
          name: created.name,
          title: created.title,
          email: created.email,
          emailStatus: created.emailStatus,
          linkedinUrl: created.linkedinUrl,
          sourceProvider: created.sourceProvider,
        });
      }

      continue;
    }

    const conflicting = byEmail.get(lookup.email.toLowerCase());

    const data = {
      name: target.name,
      title: target.title,
      email: lookup.email,
      emailStatus: lookup.emailStatus,
      linkedinUrl: target.linkedinUrl,
      sourceProvider: lookup.provider,
      sourceUrl: lookup.sourceUrl ?? target.linkedinUrl,
      verifiedAt: lookup.emailStatus === "VERIFIED" ? new Date() : null,
    };

    const contact = existing
      ? await prisma.contact.update({ where: { id: existing.id }, data })
      : conflicting
        ? await prisma.contact.update({
            where: { id: conflicting.id },
            data,
          })
        : await prisma.contact.create({
            data: { companyId: company.id, ...data },
          });

    if (contact.linkedinUrl) {
      byLinkedIn.set(contact.linkedinUrl.toLowerCase(), contact);
    }

    byEmail.set(contact.email!.toLowerCase(), contact);

    saved.push({
      id: contact.id,
      name: contact.name,
      title: contact.title,
      email: contact.email,
      emailStatus: contact.emailStatus,
      linkedinUrl: contact.linkedinUrl,
      sourceProvider: contact.sourceProvider,
    });
  }

  return {
    providers: { hunter: hunterConfigured, apollo: apolloConfigured },
    providerConfigured,
    targets,
    contacts: saved,
    skipped,
    cache,
  };
}
