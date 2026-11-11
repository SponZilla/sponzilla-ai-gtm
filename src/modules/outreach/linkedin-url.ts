/**
 * LinkedIn profile URLs, reduced to the one thing every email provider
 * understands: the handle after /in/.
 *
 * The rules follow the ones used by lib-linkedin-url and
 * linkedin-canonical-url rather than a bare regex, because real data is
 * messier than `linkedin.com/in/<slug>`:
 *
 * - the protocol is often missing and the host is often uppercase;
 * - members in some regions get a country subdomain (uk.linkedin.com);
 * - mobile links arrive as /m/in/<slug> or /mwlite/in/<slug>;
 * - query strings, tracking parameters, hashes and trailing slashes are noise;
 * - slugs can be percent-encoded.
 *
 * What this deliberately refuses:
 * - lnkd.in shortlinks, which need a network round trip to resolve;
 * - /company/, /school/ and /pub/ URLs, which are not people
 *   (/pub/ is the retired numeric format and no longer resolves);
 * - anything that is not a LinkedIn host.
 *
 * A handle is editable by its owner, so it is a matching hint, never a
 * primary key: see normalizeLinkedInUrl callers for that distinction.
 */

const LINKEDIN_HOST_PATTERN = /^(?:[a-z]{2,3}\.)?(?:www\.|m\.)?linkedin\.com$/;

/** LinkedIn slugs are 3-100 characters of letters, digits and hyphens. */
const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{1,98}[a-z0-9]$/;

const SHORTLINK_HOST = "lnkd.in";

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function stripScheme(value: string): string {
  return value.replace(/^https?:\/\//, "");
}

/**
 * "https://uk.linkedin.com/in/Jane-Doe-1a2b/?original_referer=x" -> "jane-doe-1a2b"
 * A bare handle ("jane-doe") is returned as-is so callers can pass either.
 */
export function extractLinkedInHandle(
  input: string | null | undefined,
): string | null {
  if (!input) {
    return null;
  }

  const raw = input.trim().toLowerCase();

  if (!raw) {
    return null;
  }

  /* A bare handle, not a URL. LinkedIn slugs cannot contain dots. */
  if (!raw.includes("/") && !raw.includes(".") && !raw.includes(":")) {
    return HANDLE_PATTERN.test(raw) ? raw : null;
  }

  let url: URL;

  try {
    url = new URL(
      /^https?:\/\//.test(raw) ? raw : `https://${stripScheme(raw)}`,
    );
  } catch {
    return null;
  }

  const host = url.hostname.replace(/\.$/, "");

  if (host === SHORTLINK_HOST || host.endsWith(`.${SHORTLINK_HOST}`)) {
    return null;
  }

  if (!LINKEDIN_HOST_PATTERN.test(host)) {
    return null;
  }

  const segments = url.pathname
    .split("/")
    .filter(Boolean)
    .map(safeDecode);

  /*
   * indexOf("in") rather than segments[0] so /m/in/<slug> and
   * /mwlite/in/<slug> work without a special case.
   */
  const inIndex = segments.indexOf("in");
  const handle = inIndex >= 0 ? segments[inIndex + 1] : undefined;

  if (!handle) {
    return null;
  }

  const normalized = handle.toLowerCase();

  return HANDLE_PATTERN.test(normalized) ? normalized : null;
}

/**
 * Canonical profile URL for storage, or null when the input is not a person.
 * Note that this is a *canonical form*, not a stable identifier: the member
 * can change the handle and the old slug can later be claimed by somebody
 * else, so do not use it as a uniqueness key.
 */
export function normalizeLinkedInUrl(
  input: string | null | undefined,
): string | null {
  const handle = extractLinkedInHandle(input);

  return handle ? `https://www.linkedin.com/in/${handle}` : null;
}

/** Same person, ignoring case, host, locale subdomain and query noise. */
export function linkedInHandlesMatch(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const leftHandle = extractLinkedInHandle(left);
  const rightHandle = extractLinkedInHandle(right);

  return Boolean(leftHandle && rightHandle && leftHandle === rightHandle);
}
