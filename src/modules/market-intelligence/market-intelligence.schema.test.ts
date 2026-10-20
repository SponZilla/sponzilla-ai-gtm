import fs from "node:fs";
import path from "node:path";

import {
  parseOpportunityV1,
} from "@sponzilla/contracts/v1";

const fixturePath = path.resolve(
  "tests/fixtures/market-intelligence-opportunity.json",
);

const raw = fs.readFileSync(
  fixturePath,
  "utf8",
);

const payload: unknown = JSON.parse(raw);

const result = parseOpportunityV1(payload);

console.log(
  "✓ Market Intelligence v1 contract valid",
);

console.log(
  `Company: ${result.company.name}`,
);

console.log(
  `Signals: ${result.signals.length}`,
);

console.log(
  `Evidence: ${result.evidence.length}`,
);
