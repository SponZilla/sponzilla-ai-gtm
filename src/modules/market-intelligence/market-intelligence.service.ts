import { Prisma } from "../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";

import {
  marketIntelligenceOpportunitySchema,
} from "./market-intelligence.schema.js";

import {
  mapMarketIntelligenceOpportunity,
} from "./market-intelligence.mapper.js";

import {
  marketIntelligenceRepository,
} from "./market-intelligence.repository.js";

export async function ingestMarketIntelligenceOpportunity(
  payload: unknown,
) {
  /*
   * Never trust incoming service data.
   */
  const validated =
    marketIntelligenceOpportunitySchema.parse(payload);

  const mapped =
    mapMarketIntelligenceOpportunity(validated);

  return prisma.$transaction(async (tx) => {
    /*
     * Idempotency check.
     */
    const existing =
      await marketIntelligenceRepository
        .findByExternalOpportunityId(
          tx,
          mapped.intelligence.externalOpportunityId,
        );

    if (existing) {
      return {
        created: false,
        opportunity: existing.opportunity,
        intelligence: existing,
      };
    }

    /*
     * Company matching strategy:
     *
     * 1. Website is stronger than company name.
     * 2. Fall back to case-insensitive name.
     */
    let company =
      await marketIntelligenceRepository
        .findCompanyByWebsite(
          tx,
          mapped.company.website,
        );

    if (!company) {
      company =
        await marketIntelligenceRepository
          .findCompanyByName(
            tx,
            mapped.company.name,
          );
    }

    /*
     * Company doesn't exist -> create it.
     */
    if (!company) {
      company = await tx.company.create({
        data: {
          name: mapped.company.name,
          website: mapped.company.website,
          industry: mapped.company.industry,
        },
      });
    }

    /*
     * Create the internal GTM opportunity.
     *
     * NEW is an internal workflow state, not a
     * Market Intelligence claim.
     */
    const opportunity = await tx.opportunity.create({
      data: {
        companyId: company.id,

        title: mapped.opportunity.title,

      source: "MARKET_INTELLIGENCE",
      
        stage: "NEW",

        objective: mapped.opportunity.objective,
      },
    });

    /*
     * Preserve the original intelligence/provenance.
     */
    const intelligence =
      await tx.marketIntelligenceOpportunity.create({
        data: {
          externalOpportunityId:
            mapped.intelligence.externalOpportunityId,

          contractVersion:
            mapped.intelligence.contractVersion,

          opportunityId: opportunity.id,

          location:
            mapped.intelligence.location,

          audience:
            mapped.intelligence.audience,

          marketingNeed:
            mapped.intelligence.marketingNeed,

          interpretation:
            mapped.intelligence.interpretation,

          inferenceConfidence:
            new Prisma.Decimal(
              mapped.intelligence.inferenceConfidence,
            ),

          recommendation:
            mapped.intelligence.recommendation,

          nextActionHint:
            mapped.intelligence.nextActionHint,

          signals:
            mapped.intelligence.signals,

          evidence:
            mapped.intelligence.evidence,
        },
      });

    return {
      created: true,
      opportunity: {
        ...opportunity,
        company,
      },
      intelligence,
    };
  });
}