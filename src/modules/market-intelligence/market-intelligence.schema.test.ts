import fs from "node:fs";
import path from "node:path";

import {
  marketIntelligenceOpportunitySchema,
} from "./market-intelligence.schema.js";

const fixturePath = path.resolve(
  "tests/fixtures/market-intelligence-opportunity.json",
);

const raw = fs.readFileSync(
  fixturePath,
  "utf8",
);

const payload: unknown = JSON.parse(raw);

const result =
  marketIntelligenceOpportunitySchema.safeParse(
    payload,
  );

if (!result.success) {
  console.error(
    result.error.flatten(),
  );

  process.exit(1);
}

console.log(
  "✓ Market Intelligence v1 contract valid",
);

console.log(
  `Company: ${result.data.company.name}`,
);

console.log(
  `Signals: ${result.data.signals.length}`,
);

console.log(
  `Evidence: ${result.data.evidence.length}`,
);