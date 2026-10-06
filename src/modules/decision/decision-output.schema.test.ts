import {
  gtmDecisionOutputSchema,
} from "./decision-output.schema.js";

const validDecision = {
  action: "RESEARCH_COMPANY",

  priority: "HIGH",

  summary:
    "Research the relevant ASUS India marketing decision-maker before outreach.",

  reasoning: [
    "A gaming product launch was detected.",
    "Students and gamers are relevant audiences.",
    "No previous GTM interaction is available.",
  ],

  evidence: [
    {
      source: "MARKET_INTELLIGENCE",
      description:
        "ASUS launched a new gaming product in India.",
      reference: "PRODUCT_LAUNCH",
    },
  ],

  confidence: 0.84,

  proposedAction: {
    type: "RESEARCH",
    description:
      "Identify the relevant ASUS India marketing decision-maker.",
    requiresApproval: true,
  },
};

const result =
  gtmDecisionOutputSchema.safeParse(
    validDecision,
  );

if (!result.success) {
  console.error(result.error.flatten());
  process.exit(1);
}

console.log("✓ GTM decision output contract valid");

console.log(
  JSON.stringify(result.data, null, 2),
);

const unsafeDecision = {
  ...validDecision,

  proposedAction: {
    ...validDecision.proposedAction,
    requiresApproval: false,
  },
};

const unsafeResult =
  gtmDecisionOutputSchema.safeParse(
    unsafeDecision,
  );

if (unsafeResult.success) {
  throw new Error(
    "Unsafe decision was incorrectly accepted.",
  );
}

console.log(
  "✓ Approval bypass correctly rejected",
);