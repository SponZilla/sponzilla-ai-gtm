import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  extractLinkedInHandle,
  linkedInHandlesMatch,
  normalizeLinkedInUrl,
} from "./linkedin-url.js";

describe("extractLinkedInHandle", () => {
  const extractable: Array<[string, string]> = [
    ["https://www.linkedin.com/in/JoymarieParker", "joymarieparker"],
    ["linkedin.com/in/joymarieparker/", "joymarieparker"],
    [
      "https://uk.linkedin.com/in/joymarie-parker-1a2b/?original_referer=x#top",
      "joymarie-parker-1a2b",
    ],
    ["https://m.linkedin.com/m/in/holly-clancey", "holly-clancey"],
    ["https://www.linkedin.com/mwlite/in/amy-jackson-9f", "amy-jackson-9f"],
    ["LINKEDIN.COM/in/francesca-halter", "francesca-halter"],
    ["https://www.linkedin.com/in/jane%2Ddoe", "jane-doe"],
    ["joymarieparker", "joymarieparker"],
  ];

  for (const [input, expected] of extractable) {
    it(`reads ${input} as ${expected}`, () => {
      assert.equal(extractLinkedInHandle(input), expected);
    });
  }

  const notAPerson: Array<[string | null, string]> = [
    ["https://www.linkedin.com/in/", ""],
    ["https://www.linkedin.com/company/strava", ""],
    ["https://www.linkedin.com/pub/krzysztof-marzec/a7/576/b50", ""],
    ["https://lnkd.in/abc123", ""],
    ["https://www.facebook.com/in/jane-doe", ""],
    ["https://www.linkedin.com/in/a b", ""],
    ["in", ""],
    ["https://www.linkedin.com/in/ab", ""],
    [null, ""],
  ];

  for (const [input, _label] of notAPerson) {
    it(`returns null for ${String(input)}`, () => {
      assert.equal(extractLinkedInHandle(input), null);
    });
  }
});

describe("normalizeLinkedInUrl", () => {
  it("builds one canonical form from every localized variant", () => {
    assert.equal(
      normalizeLinkedInUrl("https://fr.linkedin.com/in/Jane-Doe-1a2b/?trk=1"),
      "https://www.linkedin.com/in/jane-doe-1a2b",
    );
  });

  it("returns null instead of inventing a profile", () => {
    assert.equal(normalizeLinkedInUrl("https://lnkd.in/abc123"), null);
  });
});

describe("linkedInHandlesMatch", () => {
  it("matches across locale, case and tracking noise", () => {
    assert.equal(
      linkedInHandlesMatch(
        "https://uk.linkedin.com/in/Holly-Clancey/?trk=profile",
        "holly-clancey",
      ),
      true,
    );
  });

  it("rejects a different person", () => {
    assert.equal(
      linkedInHandlesMatch(
        "https://www.linkedin.com/in/julianne-garry",
        "holly-clancey",
      ),
      false,
    );
  });

  it("rejects an unparseable side rather than assuming a match", () => {
    assert.equal(linkedInHandlesMatch("https://lnkd.in/abc123", "holly-clancey"), false);
  });
});
