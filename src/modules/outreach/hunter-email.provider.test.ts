import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  HunterRequestError,
  findEmailWithHunter,
  splitFullName,
} from "./hunter-email.provider.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("splitFullName", () => {
  it("splits a multi-token name into first name and the rest", () => {
    assert.deepEqual(splitFullName("Jane van der Berg"), {
      firstName: "Jane",
      lastName: "van der Berg",
    });
  });

  it("handles a single-token name without inventing a surname", () => {
    assert.deepEqual(splitFullName("Cher"), { firstName: "Cher", lastName: "" });
  });
});

describe("findEmailWithHunter", () => {
  it("treats a Hunter 'valid' verification as VERIFIED", async () => {
    const result = await findEmailWithHunter(
      { firstName: "Jane", lastName: "Doe", domain: "example.com" },
      {
        apiKey: "test-key",
        fetchImpl: async () =>
          jsonResponse({
            data: {
              email: "jane.doe@example.com",
              score: 97,
              verification: { status: "valid" },
              sources: [{ uri: "https://example.com/team" }],
            },
          }),
      },
    );

    assert.equal(result?.email, "jane.doe@example.com");
    assert.equal(result?.emailStatus, "VERIFIED");
    assert.equal(result?.provider, "HUNTER");
    assert.equal(result?.sourceUrl, "https://example.com/team");
  });

  it("never upgrades an accept_all address to VERIFIED", async () => {
    const result = await findEmailWithHunter(
      { firstName: "Jane", lastName: "Doe", domain: "example.com" },
      {
        apiKey: "test-key",
        fetchImpl: async () =>
          jsonResponse({
            data: {
              email: "jane@example.com",
              score: 60,
              verification: { status: "accept_all" },
            },
          }),
      },
    );

    assert.equal(result?.emailStatus, "UNVERIFIED");
  });

  it("returns null when Hunter found no address", async () => {
    const result = await findEmailWithHunter(
      { firstName: "Jane", lastName: "Doe", domain: "example.com" },
      {
        apiKey: "test-key",
        fetchImpl: async () => jsonResponse({ data: { email: null } }),
      },
    );

    assert.equal(result, null);
  });

  it("returns null without an API key instead of calling out", async () => {
    let called = false;

    const result = await findEmailWithHunter(
      { firstName: "Jane", lastName: "Doe", domain: "example.com" },
      {
        apiKey: "",
        fetchImpl: async () => {
          called = true;
          return jsonResponse({ data: { email: "jane@example.com" } });
        },
      },
    );

    assert.equal(result, null);
    assert.equal(called, false);
  });

  it("surfaces provider failures instead of silently inventing a result", async () => {
    await assert.rejects(
      () =>
        findEmailWithHunter(
          { firstName: "Jane", lastName: "Doe", domain: "example.com" },
          {
            apiKey: "test-key",
            fetchImpl: async () =>
              jsonResponse({ errors: [{ details: "bad key" }] }, 401),
          },
        ),
      (error: unknown) =>
        error instanceof HunterRequestError && error.status === 401,
    );
  });
});
