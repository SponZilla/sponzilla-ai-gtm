import { env } from "../../config/env.js";

import { extractLinkedInHandle, linkedInHandlesMatch } from "./linkedin-url.js";

export const HUNTER_EMAIL_FINDER_ENDPOINT =
  "https://api.hunter.io/v2/email-finder";

export interface EmailLookupInput {
  firstName?: string;
  lastName?: string;
  /** Company web domain, for example gymshark.com */
  domain?: string;
  /**
   * Profile we already hold from research. Hunter accepts a LinkedIn handle on
   * its own, which is more reliable than a name: handles are unique while
   * "Holly Clancey" is not, and a name mismatch silently returns a colleague.
   */
  linkedinUrl?: string | null;
}

export interface EmailLookupResult {
  email: string;
  emailStatus: "VERIFIED" | "UNVERIFIED";
  confidence: number | null;
  provider: "HUNTER" | "APOLLO";
  /** Page Hunter reports as the source of the address, when present. */
  sourceUrl: string | null;
  /** How the person was identified. LINKEDIN is the exact-match path. */
  matchedVia?: "LINKEDIN" | "NAME" | "CACHE";
  /** Profile the provider echoed back, used to catch a wrong-person match. */
  linkedinUrl?: string | null;
}

export class HunterRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "HunterRequestError";
  }
}

export function isHunterConfigured(): boolean {
  return Boolean(env.HUNTER_API_KEY);
}

/**
 * "Jane van der Berg" -> first name "Jane", last name "van der Berg".
 * A single-token name becomes the first name only.
 */
export function splitFullName(
  fullName: string,
): { firstName: string; lastName: string } {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Look up one work email with Hunter's Email Finder.
 *
 * When we hold a LinkedIn profile the lookup is done by handle alone: Hunter
 * requires a name only when no handle is supplied. Only a Hunter "valid"
 * verification becomes VERIFIED; everything else stays UNVERIFIED so the
 * decision layer will not treat it as a sendable recipient.
 *
 * Returns null when nothing was found, when no key is configured, or when the
 * profile Hunter answered with is not the profile we asked about.
 */
export async function findEmailWithHunter(
  input: EmailLookupInput,
  dependencies: { apiKey?: string; fetchImpl?: typeof fetch } = {},
): Promise<EmailLookupResult | null> {
  const apiKey = dependencies.apiKey ?? env.HUNTER_API_KEY;
  const handle = extractLinkedInHandle(input.linkedinUrl);

  if (!apiKey) {
    return null;
  }

  if (!handle && !input.firstName) {
    return null;
  }

  const fetchImpl = dependencies.fetchImpl ?? fetch;

  const params = new URLSearchParams({ api_key: apiKey });

  if (handle) {
    params.set("linkedin_handle", handle);
  } else {
    if (input.domain) {
      params.set("domain", input.domain);
    }

    if (input.firstName) {
      params.set("first_name", input.firstName);
    }

    if (input.lastName) {
      params.set("last_name", input.lastName);
    }
  }

  const response = await fetchImpl(
    `${HUNTER_EMAIL_FINDER_ENDPOINT}?${params.toString()}`,
    { signal: AbortSignal.timeout(15_000) },
  );

  const text = await response.text();

  if (!response.ok) {
    throw new HunterRequestError(
      `Hunter email-finder failed [${response.status}]: ${text.slice(0, 200)}`,
      response.status,
    );
  }

  let payload: {
    data?: {
      email?: string | null;
      score?: number | null;
      verification?: { status?: string | null } | null;
      sources?: Array<{ uri?: string | null }> | null;
      linkedin_url?: string | null;
    };
  };

  try {
    payload = JSON.parse(text);
  } catch {
    throw new HunterRequestError(
      "Hunter email-finder returned non-JSON content",
      response.status,
    );
  }

  const email = payload.data?.email ?? null;

  if (!email) {
    return null;
  }

  const returnedProfile = payload.data?.linkedin_url ?? null;

  /*
   * A verified address at the wrong person is worse than no address. Only
   * check when Hunter echoed a profile: an answer without one cannot be
   * compared, and the company-domain guard still applies downstream.
   */
  if (handle && returnedProfile && !linkedInHandlesMatch(returnedProfile, handle)) {
    return null;
  }

  const verificationStatus = payload.data?.verification?.status ?? null;

  return {
    email,
    emailStatus: verificationStatus === "valid" ? "VERIFIED" : "UNVERIFIED",
    confidence:
      typeof payload.data?.score === "number" ? payload.data.score : null,
    provider: "HUNTER",
    sourceUrl: payload.data?.sources?.[0]?.uri ?? null,
    matchedVia: handle ? "LINKEDIN" : "NAME",
    linkedinUrl: returnedProfile,
  };
}
