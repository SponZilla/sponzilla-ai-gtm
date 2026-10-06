import type {
  MarketIntelligenceOpportunityInput,
} from "./market-intelligence.schema.js";

export interface MappedMarketIntelligenceOpportunity {
  company: {
    name: string;
    website: string;
    industry: string;
  };

  opportunity: {
    title: string;
    objective: string;
  };

  intelligence: {
    externalOpportunityId: string;
    contractVersion: "v1";

    location: string;

    signals: MarketIntelligenceOpportunityInput["signals"];

    evidence: MarketIntelligenceOpportunityInput["evidence"];

    audience: string[];

    marketingNeed: string;

    interpretation: string;

    inferenceConfidence: number;

    recommendation: string;

    nextActionHint: string;
  };
}

export function mapMarketIntelligenceOpportunity(
  input: MarketIntelligenceOpportunityInput,
): MappedMarketIntelligenceOpportunity {
  return {
    company: {
      name: input.company.name,
      website: input.company.website,
      industry: input.company.industry,
    },

    opportunity: {
      title: input.recommendation.recommendation,

      objective: input.aiInference.marketingNeed,
    },

    intelligence: {
        externalOpportunityId: input.opportunityId,
      contractVersion: input.contractVersion,

      location: input.company.location,

      signals: input.signals,

      evidence: input.evidence,

      audience: input.aiInference.audience,

      marketingNeed: input.aiInference.marketingNeed,

      interpretation: input.aiInference.interpretation,

      inferenceConfidence:
        input.aiInference.confidence,

      recommendation:
        input.recommendation.recommendation,

      nextActionHint:
        input.recommendation.nextActionHint,
    },
  };
}