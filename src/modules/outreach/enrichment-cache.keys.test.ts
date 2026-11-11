import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  CACHE_TTL,
  buildEnrichmentCacheKeys,
  cacheExpiryFor,
  hashLookupKey,
  normalizeNameForLookup,
} from "./enrichment-cache.keys.js";

describe("buildEnrichmentCacheKeys", () => {
  it("keys a known person by handle and by name plus domain", () => {
    const keys = buildEnrichmentCacheKeys({
      name: "Holly Clancey",
      domain: "strava.com",
      linkedinUrl: "https://uk.linkedin.com/in/Holly-Clancey/?trk=1",
    });

    assert.deepEqual(
      keys.map((key) => key.keyType),
      ["LINKEDIN_HANDLE", "NAME_DOMAIN"],
    );
    assert.equal(keys[0]?.lookupKey, "linkedin:holly-clancey");
    assert.equal(keys[1]?.lookupKey, "name:holly clancey@strava.com");
  });

  it("skips the handle key when the URL is a shortlink", () => {
    const keys = buildEnrichmentCacheKeys({
      name: "Holly Clancey",
      domain: "strava.com",
      linkedinUrl: "https://lnkd.in/abc123",
    });

    assert.deepEqual(
      keys.map((key) => key.keyType),
      ["NAME_DOMAIN"],
    );
  });

  it("skips the name key without a domain rather than guessing one", () => {
    const keys = buildEnrichmentCacheKeys({
      name: "Holly Clancey",
      domain: null,
      linkedinUrl: "https://www.linkedin.com/in/holly-clancey",
    });

    assert.deepEqual(
      keys.map((key) => key.keyType),
      ["LINKEDIN_HANDLE"],
    );
  });
});

describe("normalizeNameForLookup", () => {
  it("collapses case, spacing and punctuation so one person is one key", () => {
    const variants = ["Holly Clancey", "HOLLY  CLANCEY", "holly clancey.", " Holly Clancey "];

    const normalized = new Set(variants.map(normalizeNameForLookup));

    assert.equal(normalized.size, 1);
    assert.equal([...normalized][0], "holly clancey");
  });
});

describe("hashLookupKey", () => {
  it("is stable and keeps different people apart", () => {
    assert.equal(
      hashLookupKey("linkedin:holly-clancey"),
      hashLookupKey("linkedin:holly-clancey"),
    );
    assert.notEqual(
      hashLookupKey("linkedin:holly-clancey"),
      hashLookupKey("linkedin:joymarieparker"),
    );
  });
});

describe("cacheExpiryFor", () => {
  const now = new Date("2026-11-11T00:00:00.000Z");

  it("trusts a hit far longer than a miss", () => {
    assert.equal(cacheExpiryFor(true, now).getTime() - now.getTime(), CACHE_TTL.hitMs);
    assert.equal(cacheExpiryFor(false, now).getTime() - now.getTime(), CACHE_TTL.missMs);
    assert.ok(CACHE_TTL.hitMs > CACHE_TTL.missMs);
  });
});
