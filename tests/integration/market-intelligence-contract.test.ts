import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import http from "node:http";

import {
  parseOpportunityV1,
} from "@sponzilla/contracts/v1";

import {
  mapMarketIntelligenceOpportunity,
} from "../../src/modules/market-intelligence/market-intelligence.mapper.js";

const fixturePath = path.resolve(
  "tests/fixtures/market-intelligence-opportunity.json",
);

const payload = parseOpportunityV1(
  JSON.parse(fs.readFileSync(fixturePath, "utf8")),
);

test("canonical OpportunityV1 maps to GTM persistence fields", () => {
  const mapped = mapMarketIntelligenceOpportunity(payload);

  assert.equal(mapped.company.website, payload.company.websiteUrl);
  assert.equal(mapped.opportunity.title, payload.recommendation);
  assert.equal(mapped.opportunity.objective, payload.marketingNeed);
  assert.equal(mapped.intelligence.externalOpportunityId, payload.id);
  assert.deepEqual(mapped.intelligence.audience, [payload.audience]);
  assert.equal(
    mapped.intelligence.interpretation,
    payload.aiInference.groundedReasoning,
  );
  assert.equal(mapped.intelligence.inferenceConfidence, 0.65);
  assert.deepEqual(mapped.intelligence.signals, payload.signals);
  assert.deepEqual(mapped.intelligence.evidence, payload.evidence);
});

test("canonical parser rejects the former legacy handoff shape", () => {
  const legacyPayload = {
    contractVersion: "v1",
    opportunityId: "legacy-1",
  };

  assert.throws(() => parseOpportunityV1(legacyPayload));
});

test(
  "OpportunityV1 crosses the authenticated HTTP handoff into GTM",
  { skip: process.env.RUN_GTM_HTTP_E2E !== "true" },
  async () => {
    const key = process.env.INTERNAL_ADMIN_API_KEY;
    assert.ok(key, "INTERNAL_ADMIN_API_KEY is required for HTTP handoff tests");
    const { app } = await import("../../src/app.js");

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    };

    try {
      const ingestResponse = await fetch(
        `${baseUrl}/api/v1/market-intelligence/opportunities`,
        { method: "POST", headers, body: JSON.stringify(payload) },
      );
      assert.equal(ingestResponse.status, 201);
      const ingestBody = (await ingestResponse.json()) as {
        data: { opportunity: { id: string } };
      };
      assert.ok(ingestBody.data.opportunity.id);

      const contextResponse = await fetch(
        `${baseUrl}/api/v1/opportunities/${ingestBody.data.opportunity.id}/decision-context`,
        { headers },
      );
      assert.equal(contextResponse.status, 200);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  },
);
