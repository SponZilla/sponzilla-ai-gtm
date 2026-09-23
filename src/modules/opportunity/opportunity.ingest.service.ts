import {
  parseOpportunityV1,
  type OpportunityV1,
} from "@sponzilla/contracts/v1";

import { companyRepository } from "../company/company.repository.js";
import { opportunityRepository } from "./opportunity.repository.js";

export class OpportunityNotQualifiedError extends Error {
  constructor() {
    super("Opportunity is not qualified for GTM ingest");
    this.name = "OpportunityNotQualifiedError";
  }
}

export class OpportunityV1ValidationError extends Error {
  readonly details: unknown;

  constructor(details: unknown) {
    super("Invalid OpportunityV1 payload");
    this.name = "OpportunityV1ValidationError";
    this.details = details;
  }
}

function deriveTitle(opp: OpportunityV1): string {
  const fromSignal = opp.signals[0]?.title?.trim();
  const raw =
    fromSignal && fromSignal.length > 0
      ? fromSignal
      : opp.aiInference.summary.trim();
  return raw.slice(0, 200);
}

/**
 * Consumer map: OpportunityV1 → Company + CRM Opportunity + intelligenceSnapshot.
 * No other reshape — contract fields pass through into the snapshot as-is.
 */
export const opportunityIngestService = {
  async ingest(rawBody: unknown) {
    let opportunity: OpportunityV1;

    try {
      opportunity = parseOpportunityV1(rawBody);
    } catch (err) {
      throw new OpportunityV1ValidationError(
        err instanceof Error ? err.message : err,
      );
    }

    if (opportunity.qualificationStatus === "NO_VERIFIED_OPPORTUNITY") {
      throw new OpportunityNotQualifiedError();
    }

    const company = await companyRepository.upsertFromIntelligence({
      name: opportunity.company.name,
      website: opportunity.company.websiteUrl,
      industry: opportunity.company.industry,
    });

    const crmOpportunity =
      await opportunityRepository.upsertFromIntelligence({
        externalId: opportunity.id,
        companyId: company.id,
        title: deriveTitle(opportunity),
        source: "OUTBOUND",
        stage: "NEW",
        objective: opportunity.marketingNeed,
        estimatedBudget: null,
        origin: opportunity.origin,
        intelligenceSnapshot: opportunity,
      });

    return {
      company,
      opportunity: crmOpportunity,
      intelligence: opportunity,
    };
  },
};
