import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  InvalidGTMAIResponseError,
  validateGTMAIResponse,
} from "./gtm-ai-response.validator.js";

function validResponse() {
  return {
    summary:
      "Research the company's campus marketing opportunities.",
    reasoning: [
      "The opportunity is new.",
      "Company research should precede outreach.",
    ],
  };
}

describe("GTM AI response validation", () => {
  it("accepts a valid structured response", () => {
    const result = validateGTMAIResponse(
      JSON.stringify(validResponse()),
    );

    assert.equal(
      result.reasoning.length,
      2,
    );
  });

  it("rejects malformed JSON", () => {
    assert.throws(
      () => validateGTMAIResponse("{invalid"),
      InvalidGTMAIResponseError,
    );
  });

  it("rejects empty responses", () => {
    assert.throws(
      () => validateGTMAIResponse(""),
      InvalidGTMAIResponseError,
    );
  });

  it("rejects missing reasoning", () => {
    assert.throws(
      () =>
        validateGTMAIResponse(
          JSON.stringify({
            summary: "Research company",
          }),
        ),
      InvalidGTMAIResponseError,
    );
  });

  it("rejects empty reasoning", () => {
    assert.throws(
      () =>
        validateGTMAIResponse(
          JSON.stringify({
            summary: "Research company",
            reasoning: [],
          }),
        ),
      InvalidGTMAIResponseError,
    );
  });

  it("rejects excessive reasoning entries", () => {
    assert.throws(
      () =>
        validateGTMAIResponse(
          JSON.stringify({
            summary: "Research company",
            reasoning: Array(6).fill(
              "Research required",
            ),
          }),
        ),
      InvalidGTMAIResponseError,
    );
  });

  it("rejects AI attempts to change the action", () => {
    assert.throws(
      () =>
        validateGTMAIResponse(
          JSON.stringify({
            ...validResponse(),
            action: "SEND_CAMPAIGN_PROPOSAL",
          }),
        ),
      InvalidGTMAIResponseError,
    );
  });

  it("rejects AI attempts to approve execution", () => {
    assert.throws(
      () =>
        validateGTMAIResponse(
          JSON.stringify({
            ...validResponse(),
            requiresApproval: false,
          }),
        ),
      InvalidGTMAIResponseError,
    );
  });

  it("rejects fabricated evidence fields", () => {
    assert.throws(
      () =>
        validateGTMAIResponse(
          JSON.stringify({
            ...validResponse(),
            evidence: [
              {
                source: "FAKE",
                description: "Invented evidence",
              },
            ],
          }),
        ),
      InvalidGTMAIResponseError,
    );
  });

  it("rejects oversized responses", () => {
    assert.throws(
      () =>
        validateGTMAIResponse(
          "A".repeat(5001),
        ),
      InvalidGTMAIResponseError,
    );
  });
});