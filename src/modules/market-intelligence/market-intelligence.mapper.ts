import type {
  OpportunityV1,
} from "@sponzilla/contracts/v1";

export interface MappedMarketIntelligenceOpportunity {
  company: {
    name: string;
    website: string;
    industry: string | null;
  };

  opportunity: {
    title: string;
    objective: string;
  };

  intelligence: {
    externalOpportunityId: string;
    contractVersion: "v1";

    location: string;

    signals: OpportunityV1["signals"];

    evidence: OpportunityV1["evidence"];

    audience: string[];

    marketingNeed: string;

    interpretation: string;

    inferenceConfidence: number;

    recommendation: string;

    nextActionHint: string;
  };
}

function confidenceScore(
  confidence: OpportunityV1["confidence"],
): number {
  switch (confidence) {
    case "HIGH":
      return 0.85;
    case "MEDIUM":
      return 0.65;
    case "LOW":
      return 0.35;
  }
}

export function mapMarketIntelligenceOpportunity(
  input: OpportunityV1,
): MappedMarketIntelligenceOpportunity {
  return {
    company: {
      name: input.company.name,
      website: input.company.websiteUrl,
      industry: input.company.industry,
    },

    opportunity: {
      title: input.recommendation,

      objective: input.marketingNeed,
    },

    intelligence: {
      externalOpportunityId: input.id,
      contractVersion: input.contractVersion,

      location: input.company.location ?? "Unknown",

      signals: input.signals,

      evidence: input.evidence,

      audience: [input.audience],

      marketingNeed: input.marketingNeed,

      interpretation: input.aiInference.groundedReasoning,

      inferenceConfidence: confidenceScore(input.confidence),

      recommendation: input.recommendation,

      nextActionHint: input.nextActionHint,
    },
  };
}
