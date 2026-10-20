import fs from "node:fs";
import path from "node:path";

import {
  parseOpportunityV1,
} from "@sponzilla/contracts/v1";

import {
  mapMarketIntelligenceOpportunity,
} from "./market-intelligence.mapper.js";

const fixturePath = path.resolve(
  "tests/fixtures/market-intelligence-opportunity.json",
);

const raw = fs.readFileSync(
  fixturePath,
  "utf8",
);

const payload: unknown = JSON.parse(raw);

const validated = parseOpportunityV1(payload);

const mapped =
  mapMarketIntelligenceOpportunity(validated);

console.log(
  JSON.stringify(mapped, null, 2),
);
