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
  /**
   * `ownerId` is the user whose research request produced this payload. The
   * card belongs to them from the moment it exists; there is no later claim.
   */
  async ingest(rawBody: unknown, ownerId: string | null = null) {
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

    const snapshotInput = {
      externalId: opportunity.id,
      companyId: company.id,
      title: deriveTitle(opportunity),
      source: "OUTBOUND" as const,
      stage: "NEW" as const,
      objective: opportunity.marketingNeed,
      estimatedBudget: null,
      origin: opportunity.origin,
      intelligenceSnapshot: opportunity,
      ownerId,
    };

    /*
     * One unworked opportunity per company. Keying only on the research run id
     * created a new opportunity (with its own empty contact list) on every
     * run, so previously enriched contacts and drafts stayed attached to a row
     * nobody was looking at any more.
     */
    const reusable = await opportunityRepository.findReusableForIntelligence(
      company.id,
      ownerId,
    );

    const crmOpportunity =
      reusable && reusable.externalId !== opportunity.id
        ? await opportunityRepository.refreshFromIntelligence(
            reusable.id,
            snapshotInput,
          )
        : await (async () => {
            const existing =
              await opportunityRepository.findByExternalIdAndOwner(
                opportunity.id,
                ownerId,
              );

            return existing
              ? opportunityRepository.refreshFromIntelligence(
                  existing.id,
                  snapshotInput,
                )
              : opportunityRepository.createFromIntelligence(snapshotInput);
          })();

    return {
      company,
      opportunity: crmOpportunity,
      intelligence: opportunity,
    };
  },
};
