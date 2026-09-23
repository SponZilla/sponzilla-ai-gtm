/**
 * Gymshark smoke: OpportunityV1 example → GTM ingest → decision context.
 * Uses the canonical contracts example — no invented contacts/budgets.
 *
 * Prerequisite: API running (`npm run dev`) and contracts built once
 * (`npm run build --workspace=@sponzilla/contracts`).
 * Do NOT rebuild contracts while tsx watch is running — it restarts the API mid-smoke.
 */
import { parseOpportunityV1 } from "@sponzilla/contracts/v1";
import { gymsharkOpportunityV1Example } from "../packages/contracts/examples/gymshark-opportunity-v1.ts";

const GTM_BASE = process.env.GTM_BASE_URL ?? "http://127.0.0.1:3000";

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(
  url: string,
  init?: RequestInit,
  attempts = 8,
): Promise<{ res: Response; body: unknown }> {
  let lastError: unknown;

  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, init);
      const body = await res.json();
      return { res, body };
    } catch (err) {
      lastError = err;
      const delay = 250 * i;
      console.warn(
        `  retry ${i}/${attempts} ${init?.method ?? "GET"} ${url} in ${delay}ms`,
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

async function waitForHealth() {
  console.log(`0) Waiting for API at ${GTM_BASE}/health ...`);
  const { res, body } = await fetchJson(`${GTM_BASE}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status} ${JSON.stringify(body)}`);
  }
  console.log("0) API healthy", body);
}

async function main() {
  await waitForHealth();

  const validated = parseOpportunityV1(gymsharkOpportunityV1Example);
  console.log("1) OpportunityV1 ok", {
    id: validated.id,
    contractVersion: validated.contractVersion,
    qualificationStatus: validated.qualificationStatus,
    decisionMakers: validated.decisionMakers.length,
  });

  const { res: ingestRes, body: ingestBody } = await fetchJson(
    `${GTM_BASE}/api/v1/opportunities/ingest`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validated),
    },
  );

  if (!ingestRes.ok) {
    console.error("2) Ingest FAILED", ingestRes.status, ingestBody);
    process.exit(1);
  }

  const data = ingestBody as {
    data: {
      company: { id: string };
      opportunity: {
        id: string;
        externalId: string | null;
        estimatedBudget: string | null;
      };
    };
  };

  const crmId = data.data.opportunity.id;
  console.log("2) Ingest ok", {
    companyId: data.data.company.id,
    crmOpportunityId: crmId,
    externalId: data.data.opportunity.externalId,
    estimatedBudget: data.data.opportunity.estimatedBudget,
  });

  const { res: ctxRes, body: ctxBodyRaw } = await fetchJson(
    `${GTM_BASE}/api/v1/opportunities/${crmId}/decision-context`,
  );
  const ctxBody = ctxBodyRaw as {
    data: {
      opportunity: { estimatedBudget: string | null };
      intelligence: {
        id: string;
        signals: unknown[];
        evidence: Array<{ source?: { url?: string } }>;
        decisionMakers: unknown[];
      } | null;
    };
  };

  if (!ctxRes.ok) {
    console.error("3) Decision context FAILED", ctxRes.status, ctxBody);
    process.exit(1);
  }

  const intel = ctxBody.data.intelligence;
  console.log("3) Decision context ok", {
    intelligenceId: intel?.id,
    signals: intel?.signals?.length,
    evidence: intel?.evidence?.length,
    decisionMakers: intel?.decisionMakers,
    hasOutcome: intel
      ? Object.prototype.hasOwnProperty.call(intel, "outcome")
      : null,
  });

  if (intel?.id !== validated.id) {
    console.error("FAIL: intelligence id mismatch");
    process.exit(1);
  }
  if (!intel?.evidence?.[0]?.source?.url?.match(/^https?:\/\//)) {
    console.error("FAIL: evidence source url missing");
    process.exit(1);
  }
  if ((intel?.decisionMakers?.length ?? -1) !== 0) {
    console.error("FAIL: decisionMakers should be empty");
    process.exit(1);
  }
  if (ctxBody.data.opportunity.estimatedBudget != null) {
    console.error("FAIL: budget must stay null (not invented)");
    process.exit(1);
  }

  console.log("\n✅ Gymshark MI→GTM handoff smoke PASSED");
}

main().catch((err) => {
  console.error(err);
  console.error(
    "\nHint: keep `npm run dev` running. Do not rebuild contracts while the API is watched.",
  );
  process.exit(1);
});
