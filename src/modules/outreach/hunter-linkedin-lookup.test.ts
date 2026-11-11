import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { findEmailWithHunter } from "./hunter-email.provider.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function recordingFetch(
  body: unknown,
): { fetchImpl: typeof fetch; calls: string[] } {
  const calls: string[] = [];

  return {
    calls,
    fetchImpl: (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return jsonResponse(body);
    }) as typeof fetch,
  };
}

describe("findEmailWithHunter with a LinkedIn profile", () => {
  it("looks up by handle alone, without a name or domain", async () => {
    const { fetchImpl, calls } = recordingFetch({
      data: {
        email: "joymarie.parker@strava.com",
        score: 95,
        verification: { status: "valid" },
        linkedin_url: "https://www.linkedin.com/in/joymarieparker",
      },
    });

    const result = await findEmailWithHunter(
      { linkedinUrl: "https://uk.linkedin.com/in/JoymarieParker/?trk=abc" },
      { apiKey: "test-key", fetchImpl },
    );

    const request = calls[0] ?? "";

    assert.match(request, /linkedin_handle=joymarieparker/);
    assert.ok(!request.includes("first_name"), "no name should be sent");
    assert.ok(!request.includes("domain="), "no domain should be sent");
    assert.equal(result?.matchedVia, "LINKEDIN");
    assert.equal(result?.emailStatus, "VERIFIED");
    assert.equal(result?.linkedinUrl, "https://www.linkedin.com/in/joymarieparker");
  });

  it("discards an answer about somebody else", async () => {
    const { fetchImpl } = recordingFetch({
      data: {
        email: "someone@strava.com",
        verification: { status: "valid" },
        linkedin_url: "https://www.linkedin.com/in/a-different-person",
      },
    });

    const result = await findEmailWithHunter(
      { linkedinUrl: "https://www.linkedin.com/in/joymarieparker" },
      { apiKey: "test-key", fetchImpl },
    );

    assert.equal(result, null);
  });

  it("accepts the same profile written a different way", async () => {
    const { fetchImpl } = recordingFetch({
      data: {
        email: "holly.clancey@strava.com",
        verification: { status: "valid" },
        linkedin_url: "https://uk.linkedin.com/in/Holly-Clancey/?trk=x",
      },
    });

    const result = await findEmailWithHunter(
      { linkedinUrl: "https://www.linkedin.com/in/holly-clancey" },
      { apiKey: "test-key", fetchImpl },
    );

    assert.equal(result?.email, "holly.clancey@strava.com");
  });

  it("falls back to name and domain when the profile cannot be parsed", async () => {
    const { fetchImpl, calls } = recordingFetch({
      data: { email: "jane@example.com", verification: { status: "valid" } },
    });

    const result = await findEmailWithHunter(
      {
        firstName: "Jane",
        lastName: "Doe",
        domain: "example.com",
        linkedinUrl: "https://lnkd.in/abc123",
      },
      { apiKey: "test-key", fetchImpl },
    );

    const request = calls[0] ?? "";

    assert.match(request, /first_name=Jane/);
    assert.match(request, /domain=example\.com/);
    assert.ok(!request.includes("linkedin_handle"));
    assert.equal(result?.matchedVia, "NAME");
  });
});
