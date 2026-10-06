import {
  decisionContextService,
} from "./decision-context.service.js";

import {
  decisionEngineService,
} from "./decision-engine.service.js";

const opportunityId =
  process.argv[2];

if (!opportunityId) {
  throw new Error(
    "Provide an opportunity ID as the first argument.",
  );
}

const context =
  await decisionContextService.build(
    opportunityId,
  );

const decision =
  decisionEngineService.decide(
    context,
  );

console.log(
  JSON.stringify(
    {
      company: context.company.name,
      source: context.opportunity.source,
      marketIntelligence:
        context.marketIntelligence !== null,
      decision,
    },
    null,
    2,
  ),
);