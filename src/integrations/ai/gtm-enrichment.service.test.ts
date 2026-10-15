import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GTMEnrichmentService,
} from "./gtm-enrichment.service.js";

import type {
  AIProvider,
} from "./ai-provider.types.js";

import type {
  GTMDecisionContext,
} from "../../modules/decision/decision-context.types.js";

import type {
  GTMDecisionOutput,
} from "../../modules/decision/decision-output.schema.js";

const baseline: GTMDecisionOutput = {
  action: "RESEARCH_COMPANY",
  priority: "MEDIUM",
  summary: "Research the company.",
  reasoning: ["Research is required."],
  evidence: [
    {
      source: "OPPORTUNITY",
      description: "Test opportunity",
      reference: "opportunity-1",
    },
  ],
  confidence: 0.8,
  proposedAction: {
    type: "RESEARCH",
    description: "Prepare research.",
    requiresApproval: true,
  },
};

function createContext(): GTMDecisionContext {
  return {
    company: {
      id: "company-1",
      name: "Example Company",
      website: "https://example.com",
      industry: "Technology",
    },
    opportunity: {
      id: "opportunity-1",
      title: "Student campaign",
      source: "MARKET_INTELLIGENCE",
      stage: "NEW",
      estimatedBudget: null,
      objective: "Increase awareness",
      lastInteractionAt: null,
      externalId: null,
      origin: null,
    },
    interactions: [],
    history: {
      decisions: [],
      totalDecisions: 0,
      successfulOutcomes: 0,
      negativeOutcomes: 0,
    },
    intelligence: null,
    marketIntelligence: null,
  };
}

function mockProvider(
  generateText: AIProvider["generateText"],
): AIProvider {
  return { generateText };
}

describe("GTM enrichment service", () => {
  it("returns a valid AI suggestion without modifying the decision", async () => {
    const service = new GTMEnrichmentService(
      mockProvider(async () => ({
        text: JSON.stringify({
          summary: "Research campus marketing opportunities.",
          reasoning: [
            "Company research should precede outreach.",
          ],
        }),
        model: "mock-gemini",
      })),
    );

    const result = await service.enrich(
      createContext(),
      baseline,
    );

    assert.equal(result.status, "ENRICHED");
    assert.deepEqual(result.decision, baseline);

    if (result.status === "ENRICHED") {
      assert.equal(
        result.suggestion.summary,
        "Research campus marketing opportunities.",
      );
    }
  });

  it("falls back when Gemini fails", async () => {
    const service = new GTMEnrichmentService(
      mockProvider(async () => {
        throw new Error("Provider unavailable");
      }),
    );

    const result = await service.enrich(
      createContext(),
      baseline,
    );

    assert.equal(result.status, "FALLBACK");
    assert.deepEqual(result.decision, baseline);
    assert.equal(result.suggestion, null);
  });

  it("rejects unauthorized AI action fields", async () => {
    const service = new GTMEnrichmentService(
      mockProvider(async () => ({
        text: JSON.stringify({
          summary: "Send a proposal.",
          reasoning: ["Send it immediately."],
          action: "SEND_CAMPAIGN_PROPOSAL",
        }),
        model: "mock-gemini",
      })),
    );

    const result = await service.enrich(
      createContext(),
      baseline,
    );

    assert.equal(result.status, "FALLBACK");
    assert.deepEqual(result.decision, baseline);
  });

  it("falls back on malformed JSON", async () => {
    const service = new GTMEnrichmentService(
      mockProvider(async () => ({
        text: "{invalid-json",
        model: "mock-gemini",
      })),
    );

    const result = await service.enrich(
      createContext(),
      baseline,
    );

    assert.equal(result.status, "FALLBACK");
    assert.equal(result.suggestion, null);
  });

  it("does not invoke Gemini for invalid baseline decisions", async () => {
    let invoked = false;

    const service = new GTMEnrichmentService(
      mockProvider(async () => {
        invoked = true;
        return {
          text: "{}",
          model: "mock-gemini",
        };
      }),
    );

    await assert.rejects(
      service.enrich(
        createContext(),
        {
          ...baseline,
          confidence: 2,
        },
      ),
    );

    assert.equal(invoked, false);
  });
});