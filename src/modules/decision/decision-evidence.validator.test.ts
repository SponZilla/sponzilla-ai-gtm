import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  GTMDecisionContext,
} from "./decision-context.types.js";

import type {
  GTMDecisionOutput,
} from "./decision-output.schema.js";

import {
  DecisionEvidenceValidationError,
  validateDecisionEvidence,
} from "./decision-evidence.validator.js";

const context = {
  company: {
    id: "company-1",
  },

  opportunity: {
    id: "opportunity-1",
  },

  interactions: [
    {
      id: "interaction-1",
      summary: "Customer requested a proposal.",
    },
  ],

  marketIntelligence: {
    evidence: [
      {
        fact: "Company launched a new product.",
        sourceTitle: "Official announcement",
        sourceUrl: "https://example.com/announcement",
      },
    ],
  },
} as GTMDecisionContext;

function createOutput(
  evidence: GTMDecisionOutput["evidence"],
): GTMDecisionOutput {
  return {
    action: "RESEARCH_COMPANY",
    priority: "MEDIUM",
    summary: "Research the company.",
    reasoning: ["Research is required."],
    confidence: 0.8,
    evidence,
    proposedAction: {
      type: "RESEARCH",
      description: "Prepare company research.",
      requiresApproval: true,
    },
  };
}

describe(
  "Decision evidence grounding",
  () => {
    it(
      "accepts valid opportunity evidence",
      () => {
        const output = createOutput([
          {
            source: "OPPORTUNITY",
            description: "Valid opportunity",
            reference: "opportunity-1",
          },
        ]);

        assert.doesNotThrow(() =>
          validateDecisionEvidence(
            context,
            output,
          ),
        );
      },
    );

    it(
      "rejects fabricated opportunity references",
      () => {
        const output = createOutput([
          {
            source: "OPPORTUNITY",
            description: "Invalid opportunity",
            reference: "fake-opportunity",
          },
        ]);

        assert.throws(
          () =>
            validateDecisionEvidence(
              context,
              output,
            ),
          DecisionEvidenceValidationError,
        );
      },
    );

    it(
      "accepts valid interaction evidence",
      () => {
        const output = createOutput([
          {
            source: "INTERACTION",
            description:
              "Customer requested a proposal.",
            reference: "interaction-1",
          },
        ]);

        assert.doesNotThrow(() =>
          validateDecisionEvidence(
            context,
            output,
          ),
        );
      },
    );

    it(
      "rejects fabricated interaction IDs",
      () => {
        const output = createOutput([
          {
            source: "INTERACTION",
            description:
              "Customer requested a proposal.",
            reference: "fake-interaction",
          },
        ]);

        assert.throws(
          () =>
            validateDecisionEvidence(
              context,
              output,
            ),
          DecisionEvidenceValidationError,
        );
      },
    );

    it(
      "rejects modified interaction descriptions",
      () => {
        const output = createOutput([
          {
            source: "INTERACTION",
            description:
              "Customer signed the contract.",
            reference: "interaction-1",
          },
        ]);

        assert.throws(
          () =>
            validateDecisionEvidence(
              context,
              output,
            ),
          DecisionEvidenceValidationError,
        );
      },
    );

    it(
      "accepts valid market intelligence evidence",
      () => {
        const output = createOutput([
          {
            source: "MARKET_INTELLIGENCE",
            description:
              "Company launched a new product.",
            reference: "Official announcement",
          },
        ]);

        assert.doesNotThrow(() =>
          validateDecisionEvidence(
            context,
            output,
          ),
        );
      },
    );

    it(
      "rejects fabricated market intelligence evidence",
      () => {
        const output = createOutput([
          {
            source: "MARKET_INTELLIGENCE",
            description:
              "Company raised $100 million.",
            reference: "Official announcement",
          },
        ]);

        assert.throws(
          () =>
            validateDecisionEvidence(
              context,
              output,
            ),
          DecisionEvidenceValidationError,
        );
      },
    );

    it(
      "rejects unsupported market intelligence references",
      () => {
        const output = createOutput([
          {
            source: "MARKET_INTELLIGENCE",
            description:
              "Company launched a new product.",
            reference: "Unknown source",
          },
        ]);

        assert.throws(
          () =>
            validateDecisionEvidence(
              context,
              output,
            ),
          DecisionEvidenceValidationError,
        );
      },
    );
  },
);