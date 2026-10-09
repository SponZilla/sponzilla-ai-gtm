import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  GTMDecisionContext,
} from "./decision-context.types.js";

import {
  decisionPolicyService,
} from "./decision-policy.service.js";

/*
 * Creates a minimal valid decision context.
 *
 * Individual tests override only the fields
 * required for that scenario.
 */
function createContext(
  overrides: Partial<GTMDecisionContext> = {},
): GTMDecisionContext {
  const baseContext: GTMDecisionContext = {
    company: {
      id: "company-1",
      name: "Test Company",
      website: "https://example.com",
      industry: "Technology",
    },

    opportunity: {
      id: "opportunity-1",
      title: "Campus Marketing Opportunity",
      source: "INBOUND",
      stage: "NEW",
      estimatedBudget: null,
      objective:
        "Explore a student marketing campaign.",
      lastInteractionAt: null,
      externalId: null,
      origin: null,
    },

    interactions: [],

    intelligence: null,

    marketIntelligence: null,

    history: {
      decisions: [],
      totalDecisions: 0,
      successfulOutcomes: 0,
      negativeOutcomes: 0,
    },
  };

  return {
    ...baseContext,
    ...overrides,

    company: {
      ...baseContext.company,
      ...overrides.company,
    },

    opportunity: {
      ...baseContext.opportunity,
      ...overrides.opportunity,
    },
  };
}

function createInteraction(
  type:
    GTMDecisionContext["interactions"][number]["type"],
): GTMDecisionContext["interactions"][number] {
  return {
    id: `interaction-${type}`,
    type,
    summary: `Test ${type} interaction`,
    occurredAt: new Date(
      "2026-01-01T10:00:00.000Z",
    ),
  };
}

describe(
  "decisionPolicyService.selectAction",
  () => {
    it(
      "selects RESEARCH_COMPANY for a new Market Intelligence opportunity",
      () => {
        const context =
          createContext({
            opportunity: {
              ...createContext().opportunity,
              source:
                "MARKET_INTELLIGENCE",
              stage: "NEW",
            },

            marketIntelligence: {
              contractVersion: "1.0",

              signals: [],

              evidence: [],

              aiInference: {
                audience: [
                  "Students",
                ],

                marketingNeed:
                  "Campus awareness",

                interpretation:
                  "Potential student campaign",

                confidence: 0.8,
              },

              recommendation: {
                recommendation:
                  "Research company",

                nextActionHint:
                  "Identify decision-maker",
              },
            },
          });

        assert.equal(
          decisionPolicyService
            .selectAction(context),

          "RESEARCH_COMPANY",
        );
      },
    );

    it(
      "selects SEND_INTRODUCTION for a new normal opportunity with company context",
      () => {
        const context =
          createContext();

        assert.equal(
          decisionPolicyService
            .selectAction(context),

          "SEND_INTRODUCTION",
        );
      },
    );

    it(
      "selects FOLLOW_UP for a contacted opportunity",
      () => {
        const context =
          createContext({
            opportunity: {
              ...createContext()
                .opportunity,

              stage: "CONTACTED",
            },
          });

        assert.equal(
          decisionPolicyService
            .selectAction(context),

          "FOLLOW_UP",
        );
      },
    );

    it(
      "selects SCHEDULE_DISCOVERY_CALL for an interested opportunity",
      () => {
        const context =
          createContext({
            opportunity: {
              ...createContext()
                .opportunity,

              stage: "INTERESTED",
            },
          });

        assert.equal(
          decisionPolicyService
            .selectAction(context),

          "SCHEDULE_DISCOVERY_CALL",
        );
      },
    );

    it(
      "selects SEND_CAMPAIGN_PROPOSAL when a proposal was requested",
      () => {
        const context =
          createContext({
            interactions: [
              createInteraction(
                "PROPOSAL_REQUESTED",
              ),
            ],
          });

        assert.equal(
          decisionPolicyService
            .selectAction(context),

          "SEND_CAMPAIGN_PROPOSAL",
        );
      },
    );

    it(
      "selects FOLLOW_UP when a proposal was already sent",
      () => {
        const context =
          createContext({
            interactions: [
              createInteraction(
                "PROPOSAL_SENT",
              ),
            ],
          });

        assert.equal(
          decisionPolicyService
            .selectAction(context),

          "FOLLOW_UP",
        );
      },
    );

    it(
      "selects FOLLOW_UP for the proposal stage",
      () => {
        const context =
          createContext({
            opportunity: {
              ...createContext()
                .opportunity,

              stage: "PROPOSAL",
            },
          });

        assert.equal(
          decisionPolicyService
            .selectAction(context),

          "FOLLOW_UP",
        );
      },
    );

    it(
      "selects ESCALATE_TO_SALES for negotiation",
      () => {
        const context =
          createContext({
            opportunity: {
              ...createContext()
                .opportunity,

              stage:
                "NEGOTIATION",
            },
          });

        assert.equal(
          decisionPolicyService
            .selectAction(context),

          "ESCALATE_TO_SALES",
        );
      },
    );

    it(
      "selects CLOSE_OPPORTUNITY for a won opportunity",
      () => {
        const context =
          createContext({
            opportunity: {
              ...createContext()
                .opportunity,

              stage: "WON",
            },
          });

        assert.equal(
          decisionPolicyService
            .selectAction(context),

          "CLOSE_OPPORTUNITY",
        );
      },
    );

    it(
      "selects CLOSE_OPPORTUNITY for a lost opportunity",
      () => {
        const context =
          createContext({
            opportunity: {
              ...createContext()
                .opportunity,

              stage: "LOST",
            },
          });

        assert.equal(
          decisionPolicyService
            .selectAction(context),

          "CLOSE_OPPORTUNITY",
        );
      },
    );

    it(
      "selects REQUEST_MORE_INFORMATION when useful context is missing",
      () => {
        const context =
          createContext({
            company: {
              ...createContext().company,
              website: null,
              industry: null,
            },

            opportunity: {
              ...createContext()
                .opportunity,

              objective: null,
            },
          });

        assert.equal(
          decisionPolicyService
            .selectAction(context),

          "REQUEST_MORE_INFORMATION",
        );
      },
    );

    /*
     * Rule-ordering safety test.
     *
     * PROPOSAL_REQUESTED must beat the generic
     * "has interaction" FOLLOW_UP rule.
     */
    it(
      "prioritizes proposal request over generic interaction follow-up",
      () => {
        const context =
          createContext({
            interactions: [
              createInteraction(
                "EMAIL_SENT",
              ),

              createInteraction(
                "PROPOSAL_REQUESTED",
              ),
            ],
          });

        assert.equal(
          decisionPolicyService
            .selectAction(context),

          "SEND_CAMPAIGN_PROPOSAL",
        );
      },
    );

    /*
     * Terminal state must always win over
     * interaction-based rules.
     */
    it(
      "does not continue GTM progression after opportunity is won",
      () => {
        const context =
          createContext({
            opportunity: {
              ...createContext()
                .opportunity,

              stage: "WON",
            },

            interactions: [
              createInteraction(
                "PROPOSAL_REQUESTED",
              ),
            ],
          });

        assert.equal(
          decisionPolicyService
            .selectAction(context),

          "CLOSE_OPPORTUNITY",
        );
      },
    );
  },
);