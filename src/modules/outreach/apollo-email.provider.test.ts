import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ApolloRequestError,
  findEmailWithApollo,
} from "./apollo-email.provider.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("findEmailWithApollo", () => {
  it("treats an Apollo 'verified' email as VERIFIED", async () => {
    const result = await findEmailWithApollo(
      {
        firstName: "Noel",
        lastName: "Mack",
        domain: "gymshark.com",
        linkedinUrl: "https://www.linkedin.com/in/noelmack",
      },
      {
        apiKey: "test-key",
        fetchImpl: async () =>
          jsonResponse({
            person: {
              email: "noel.mack@gymshark.com",
              email_status: "verified",
              linkedin_url: "https://www.linkedin.com/in/noelmack",
            },
            match_confidence: "high",
          }),
      },
    );

    assert.equal(result?.email, "noel.mack@gymshark.com");
    assert.equal(result?.emailStatus, "VERIFIED");
    assert.equal(result?.provider, "APOLLO");
  });

  it("keeps a guessed address UNVERIFIED so it cannot be sent", async () => {
    const result = await findEmailWithApollo(
      { firstName: "Noel", lastName: "Mack", domain: "gymshark.com" },
      {
        apiKey: "test-key",
        fetchImpl: async () =>
          jsonResponse({
            person: { email: "noel@gymshark.com", email_status: "guessed" },
            match_confidence: "medium",
          }),
      },
    );

    assert.equal(result?.emailStatus, "UNVERIFIED");
  });

  it("discards a low-confidence match instead of attaching a stranger's address", async () => {
    const result = await findEmailWithApollo(
      { firstName: "Noel", lastName: "Mack", domain: "gymshark.com" },
      {
        apiKey: "test-key",
        fetchImpl: async () =>
          jsonResponse({
            person: { email: "other.person@gymshark.com", email_status: "verified" },
            match_confidence: "low",
          }),
      },
    );

    assert.equal(result, null);
  });

  it("matches on the LinkedIn profile and never requests personal emails or phones", async () => {
    let requestedUrl = "";

    await findEmailWithApollo(
      {
        firstName: "Joymarie",
        lastName: "Parker",
        domain: "strava.com",
        linkedinUrl: "https://www.linkedin.com/in/joymarieparker",
      },
      {
        apiKey: "test-key",
        fetchImpl: async (input) => {
          requestedUrl = String(input);
          return jsonResponse({ person: null });
        },
      },
    );

    const params = new URL(requestedUrl).searchParams;

    assert.equal(
      params.get("linkedin_url"),
      "https://www.linkedin.com/in/joymarieparker",
    );
    assert.equal(params.get("reveal_personal_emails"), "false");
    assert.equal(params.get("reveal_phone_number"), "false");
  });

  it("rejects a verified address at a different employer", async () => {
    const result = await findEmailWithApollo(
      { firstName: "Julianne", lastName: "Garry", domain: "strava.com" },
      {
        apiKey: "test-key",
        fetchImpl: async () =>
          jsonResponse({
            person: {
              email: "julianne.garry@genpact.com",
              email_status: "verified",
            },
            match_confidence: "medium",
          }),
      },
    );

    assert.equal(result, null);
  });

  it("rejects a different LinkedIn profile than the one requested", async () => {
    const result = await findEmailWithApollo(
      {
        firstName: "Joymarie",
        lastName: "Parker",
        domain: "strava.com",
        linkedinUrl: "https://www.linkedin.com/in/joymarieparker",
      },
      {
        apiKey: "test-key",
        fetchImpl: async () =>
          jsonResponse({
            person: {
              email: "joy.parker@strava.com",
              email_status: "verified",
              linkedin_url: "https://www.linkedin.com/in/someone-else",
            },
            match_confidence: "high",
          }),
      },
    );

    assert.equal(result, null);
  });

  it("rejects a personal mailbox as a work address", async () => {
    const result = await findEmailWithApollo(
      { firstName: "Noel", lastName: "Mack", domain: "gymshark.com" },
      {
        apiKey: "test-key",
        fetchImpl: async () =>
          jsonResponse({
            person: {
              email: "noelmack@gmail.com",
              email_status: "verified",
            },
            match_confidence: "high",
          }),
      },
    );

    assert.equal(result, null);
  });

  it("returns null when Apollo has no person for the match", async () => {
    const result = await findEmailWithApollo(
      { firstName: "Noel", lastName: "Mack", domain: "gymshark.com" },
      {
        apiKey: "test-key",
        fetchImpl: async () => jsonResponse({ person: null }),
      },
    );

    assert.equal(result, null);
  });

  it("returns null without an API key instead of calling out", async () => {
    let called = false;

    const result = await findEmailWithApollo(
      { firstName: "Noel", lastName: "Mack", domain: "gymshark.com" },
      {
        apiKey: "",
        fetchImpl: async () => {
          called = true;
          return jsonResponse({ person: { email: "noel@gymshark.com" } });
        },
      },
    );

    assert.equal(result, null);
    assert.equal(called, false);
  });

  it("surfaces provider failures instead of inventing a result", async () => {
    await assert.rejects(
      () =>
        findEmailWithApollo(
          { firstName: "Noel", lastName: "Mack", domain: "gymshark.com" },
          {
            apiKey: "test-key",
            fetchImpl: async () =>
              jsonResponse({ error: "invalid api key" }, 403),
          },
        ),
      (error: unknown) =>
        error instanceof ApolloRequestError && error.status === 403,
    );
  });
});
