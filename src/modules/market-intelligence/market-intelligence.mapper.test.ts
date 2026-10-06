import fs from "node:fs";
import path from "node:path";

import {
  marketIntelligenceOpportunitySchema,
} from "./market-intelligence.schema.js";

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

const validated =
  marketIntelligenceOpportunitySchema.parse(payload);

const mapped =
  mapMarketIntelligenceOpportunity(validated);

console.log(
  JSON.stringify(mapped, null, 2),
);