import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  DraftGenerationFailedError,
  DraftGenerationUnavailableError,
  generateOutreachDraft,
} from "./email-draft.generator.js";

const baseInput = {
  company: {
    name: "Gymshark",
    website: "https://gymshark.com",
    industry: "fitness apparel",
  },
  contact: { name: "Jane Doe", title: "Head of Partnerships" },
  opportunity: {
    title: "Campus activation partnership",
    objective: "Reach Gen Z student athletes",
  },
  evidence: [
    {
      fact: "Gymshark opened a store in Mumbai.",
      sourceUrl: "https://gymshark.com/news/mumbai",
    },
  ],
  signals: [
    {
      type: "regional_expansion",
      title: "Regional expansion",
      summary: "New market entry in India.",
    },
  ],
  recommendation: "Offer a campus-led activation.",
  nextActionHint: "Introduce the campus programme.",
  brief: "We run campus ambassador programmes for fitness brands.",
};

function geminiEnvelope(content: string): Response {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: content }] } }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("generateOutreachDraft", () => {
  it("parses a JSON draft and reports the model version", async () => {
    const draft = await generateOutreachDraft(baseInput, {
      apiKey: "test-key",
      fetchImpl: async () =>
        geminiEnvelope(
          JSON.stringify({
            subject: "Campus partnership idea for Gymshark",
            body: "Hi Jane, ".repeat(20),
          }),
        ),
    });

    assert.equal(draft.subject, "Campus partnership idea for Gymshark");
    assert.ok(draft.body.length > 80);
    assert.equal(draft.promptVersion, "outreach-draft-v1");
  });

  it("sends only the supplied facts to the model", async () => {
    let sentBody = "";

    await generateOutreachDraft(baseInput, {
      apiKey: "test-key",
      fetchImpl: async (_url, init) => {
        sentBody = String(init?.body ?? "");
        return geminiEnvelope(
          JSON.stringify({ subject: "Campus idea", body: "Hi Jane, ".repeat(20) }),
        );
      },
    });

    assert.ok(sentBody.includes("Gymshark opened a store in Mumbai."));
    assert.ok(sentBody.includes("campus ambassador programmes"));
    assert.ok(
      sentBody.includes("Never invent numbers"),
      "the no-invention rule must be in the prompt",
    );
  });

  it("refuses to run without a key rather than inventing copy", async () => {
    await assert.rejects(
      () => generateOutreachDraft(baseInput, { apiKey: "" }),
      (error: unknown) => error instanceof DraftGenerationUnavailableError,
    );
  });

  it("rejects a draft that is not valid JSON", async () => {
    await assert.rejects(
      () =>
        generateOutreachDraft(baseInput, {
          apiKey: "test-key",
          fetchImpl: async () => geminiEnvelope("Happy to help! Here is an email…"),
        }),
      (error: unknown) => error instanceof DraftGenerationFailedError,
    );
  });

  it("rejects an unusable body length", async () => {
    await assert.rejects(
      () =>
        generateOutreachDraft(baseInput, {
          apiKey: "test-key",
          fetchImpl: async () =>
            geminiEnvelope(JSON.stringify({ subject: "Hi there", body: "too short" })),
        }),
      (error: unknown) => error instanceof DraftGenerationFailedError,
    );
  });
});
