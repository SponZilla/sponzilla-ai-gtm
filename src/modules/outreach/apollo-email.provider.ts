import { env } from "../../config/env.js";

import type { EmailLookupInput, EmailLookupResult } from "./hunter-email.provider.js";

export const APOLLO_PEOPLE_MATCH_ENDPOINT =
  "https://api.apollo.io/api/v1/people/match";

export interface ApolloLookupInput extends EmailLookupInput {
  /** Profile we already hold from research; Apollo matches this exactly. */
  linkedinUrl?: string | null;
  companyName?: string | null;
}

export class ApolloRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApolloRequestError";
  }
}

export function isApolloConfigured(): boolean {
  return (
    Boolean(env.APOLLO_API_KEY) &&
    env.APOLLO_ENRICHMENT_ENABLED.trim().toLowerCase() === "true"
  );
}

/**
 * A personal mailbox is not a work address: it tells us nothing about the
 * employer, so it can neither confirm the person nor be used for outreach.
 */
const FREE_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "gmx.com",
  "mail.com",
  "yandex.com",
]);

function isFreeMailDomain(domain: string): boolean {
  return FREE_MAIL_DOMAINS.has(domain);
}

function normalizeLinkedIn(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

/**
 * Apollo's own verification vocabulary. Only "verified" is a sendable address;
 * "guessed" and "likely to engage" are patterns, not confirmations.
 */
function toEmailStatus(status: string | null | undefined): "VERIFIED" | "UNVERIFIED" {
  return status === "verified" ? "VERIFIED" : "UNVERIFIED";
}

/**
 * Resolve one work email with Apollo People Enrichment (fallback after Hunter).
 *
 * Matches on the LinkedIn profile when we have it, because a name plus domain
 * alone can match the wrong person. A low-confidence match or a name-only
 * partial is discarded rather than stored: attaching a stranger's verified
 * address to our target is worse than having no address.
 *
 * Costs one credit only when Apollo returns data; personal emails and phone
 * numbers are never requested.
 */
export async function findEmailWithApollo(
  input: ApolloLookupInput,
  dependencies: { apiKey?: string; fetchImpl?: typeof fetch } = {},
): Promise<EmailLookupResult | null> {
  const apiKey = dependencies.apiKey ?? env.APOLLO_API_KEY;

  if (!apiKey || (!input.firstName && !input.linkedinUrl)) {
    return null;
  }

  const fetchImpl = dependencies.fetchImpl ?? fetch;

  const params = new URLSearchParams();

  if (input.firstName) params.set("first_name", input.firstName);
  if (input.lastName) params.set("last_name", input.lastName);
  if (input.domain) {
    params.set("domain", input.domain);
  }
  if (input.companyName) params.set("organization_name", input.companyName);
  if (input.linkedinUrl) params.set("linkedin_url", input.linkedinUrl);

  params.set("reveal_personal_emails", "false");
  params.set("reveal_phone_number", "false");

  const response = await fetchImpl(
    `${APOLLO_PEOPLE_MATCH_ENDPOINT}?${params.toString()}`,
    {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(20_000),
    },
  );

  const text = await response.text();

  if (!response.ok) {
    throw new ApolloRequestError(
      `Apollo people/match failed [${response.status}]: ${text.slice(0, 200)}`,
      response.status,
    );
  }

  let payload: {
    person?: {
      email?: string | null;
      email_status?: string | null;
      linkedin_url?: string | null;
      organization?: {
        name?: string | null;
        primary_domain?: string | null;
      } | null;
    } | null;
    match_confidence?: string | null;
  };

  try {
    payload = JSON.parse(text);
  } catch {
    throw new ApolloRequestError(
      "Apollo people/match returned non-JSON content",
      response.status,
    );
  }

  const person = payload.person ?? null;
  const email = person?.email ?? null;

  if (!person || !email) {
    return null;
  }

  if ((payload.match_confidence ?? "").toLowerCase() === "low") {
    return null;
  }

  /*
   * Apollo answers a name-only lookup with somebody else when it has nobody at
   * the company: a live run returned a Genpact address for a Strava target.
   * A verified address at the wrong employer is worse than no address, so the
   * result must be the person we asked for, at the domain we asked about.
   */
  if (
    input.linkedinUrl &&
    person.linkedin_url &&
    normalizeLinkedIn(person.linkedin_url) !== normalizeLinkedIn(input.linkedinUrl)
  ) {
    return null;
  }

  const emailDomain = (email.split("@")[1] ?? "").toLowerCase();
  const targetDomain = (input.domain ?? "").toLowerCase();

  if (!emailDomain || isFreeMailDomain(emailDomain)) {
    return null;
  }

  if (targetDomain && emailDomain !== targetDomain) {
    return null;
  }

  const employerDomain = (person.organization?.primary_domain ?? "").toLowerCase();

  if (employerDomain && targetDomain && employerDomain !== targetDomain) {
    return null;
  }

  return {
    email,
    emailStatus: toEmailStatus(person.email_status),
    confidence: null,
    provider: "APOLLO",
    sourceUrl: person.linkedin_url ?? input.linkedinUrl ?? null,
  };
}
