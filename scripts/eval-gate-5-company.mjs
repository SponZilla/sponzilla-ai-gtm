/**
 * SponZilla 5-Company Evaluation Gate — cross-repo harness.
 *
 * Drives the documented operator loop over HTTP:
 *   Market Intelligence research
 *   → auto-handoff into AutoGTM ingest
 *   → decision context + deterministic decision
 *   → pre-approval execution probe (must be refused)
 *   → operator approval
 *   → execution
 *   → closed-loop stage / interaction verification
 *
 * It never fabricates data: every value it asserts on comes from the two
 * running services. Results are written to eval-gate-results.json.
 *
 * Prerequisites:
 *   - AutoGTM running on GTM_BASE_URL with SPONZILLA_AUTH_API_URL pointed at
 *     the eval auth stub, and INTERNAL_ADMIN_API_KEY configured.
 *   - Market Intelligence running on MI_BASE_URL with RESEARCH_API_KEY and
 *     INTERNAL_ADMIN_API_KEY matching AutoGTM.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
const gtmRoot = path.resolve(here, "..");

const gtmEnv = dotenv.parse(fs.readFileSync(path.join(gtmRoot, ".env")));
const miEnv = dotenv.parse(
  fs.readFileSync(path.resolve(gtmRoot, "../sponzilla-market-intelligence/.env")),
);

const GTM_BASE = process.env.GTM_BASE_URL ?? "http://127.0.0.1:3000";
const MI_BASE = process.env.MI_BASE_URL ?? "http://127.0.0.1:3001";
const INTERNAL_ADMIN_API_KEY =
  process.env.INTERNAL_ADMIN_API_KEY ?? gtmEnv.INTERNAL_ADMIN_API_KEY;
const RESEARCH_API_KEY = process.env.RESEARCH_API_KEY ?? miEnv.RESEARCH_API_KEY;
const OPERATOR_TOKEN = process.env.EVAL_OPERATOR_TOKEN ?? "eval-operator-token";

if (!INTERNAL_ADMIN_API_KEY) throw new Error("INTERNAL_ADMIN_API_KEY missing");
if (!RESEARCH_API_KEY) throw new Error("RESEARCH_API_KEY missing");

const COMPANIES = [
  { key: "gymshark", companyName: "Gymshark", websiteUrl: "https://gymshark.com", category: "apparel / fitness", targetSignal: "store opening / regional retail expansion" },
  { key: "redbull", companyName: "Red Bull", websiteUrl: "https://redbull.com", category: "energy drinks / events", targetSignal: "event sponsorship / extreme sports activation" },
  { key: "liquiddeath", companyName: "Liquid Death", websiteUrl: "https://liquiddeath.com", category: "beverage / lifestyle", targetSignal: "influencer campaign / festival sponsorship" },
  { key: "duolingo", companyName: "Duolingo", websiteUrl: "https://duolingo.com", category: "consumer software / education", targetSignal: "youth / campus marketing and social campaign" },
  { key: "strava", companyName: "Strava", websiteUrl: "https://strava.com", category: "fitness software / community", targetSignal: "partner / brand challenge expansion" },
];

const internalHeaders = {
  "content-type": "application/json",
  authorization: `Bearer ${INTERNAL_ADMIN_API_KEY}`,
};

const operatorHeaders = {
  "content-type": "application/json",
  authorization: `Bearer ${OPERATOR_TOKEN}`,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Admin routes allow 30 requests per minute per IP. The gate issues several
 * per company, so back off when the limiter fires instead of recording a
 * false failure.
 */
async function request(url, init = {}, timeoutMs = 180_000, attempts = 4) {
  let last = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text.slice(0, 500) };
    }

    last = { status: res.status, ok: res.ok, body };

    if (res.status !== 429 || attempt === attempts) return last;

    const retryAfter = Number(res.headers.get("retry-after"));
    const reset = Number(res.headers.get("ratelimit-reset"));
    const waitMs = Math.min(
      70_000,
      (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 0) ||
        (Number.isFinite(reset) && reset > 0 ? reset * 1000 : 15_000),
    );

    console.log(`  rate limited (429), retrying in ${Math.round(waitMs / 1000)}s`);
    await sleep(waitMs);
  }

  return last;
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

function summarizeRun(run) {
  const opp = run?.opportunity ?? null;
  const signals = opp?.signals ?? [];
  const evidence = opp?.evidence ?? [];
  const decisionMakers = opp?.decisionMakers ?? [];

  return {
    researchRunId: run?.id ?? null,
    researchStatus: run?.status ?? null,
    researchError: run?.error ?? null,
    sourceCount: Array.isArray(run?.sources) ? run.sources.length : 0,
    evidenceCount: evidence.length,
    signalCount: signals.length,
    signalTypes: signals.map((s) => s.type),
    evidenceUrlsValid: evidence.every((e) => isHttpUrl(e?.source?.url)),
    decisionMakers: decisionMakers.length,
    decisionMakerEmails: decisionMakers.filter((d) => d?.email != null).length,
    decisionMakerLinksValid: decisionMakers.every((d) => isHttpUrl(d?.linkedinUrl)),
    qualificationStatus: opp?.qualificationStatus ?? null,
    confidence: opp?.confidence ?? null,
    estimatedBudget: opp?.budget?.estimated ?? null, // must stay null
    opportunityId: opp?.id ?? null,
    handoff: run?.gtmHandoff
      ? {
          status: run.gtmHandoff.status ?? null,
          gtmOpportunityId: run.gtmHandoff.gtmOpportunityId ?? null,
          error: run.gtmHandoff.error ?? null,
        }
      : null,
  };
}

async function runOne(company) {
  const record = { company: company.companyName, websiteUrl: company.websiteUrl, targetSignal: company.targetSignal, steps: {}, checks: {} };

  console.log(`\n=== ${company.companyName} (${company.websiteUrl}) ===`);

  // 1. Market Intelligence research
  const research = await request(`${MI_BASE}/api/v1/research`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${RESEARCH_API_KEY}` },
    body: JSON.stringify({
      companyName: company.companyName,
      websiteUrl: company.websiteUrl,
      category: company.category,
    }),
  });

  if (!research.ok || !research.body?.id) {
    record.steps.research = { status: research.status, body: research.body };
    record.checks.researchCompleted = false;
    console.log(`  research FAILED (HTTP ${research.status})`);
    return record;
  }

  const summary = summarizeRun(research.body);
  record.intelligence = summary;
  record.checks.researchCompleted = summary.researchStatus === "COMPLETED";
  record.checks.groundedSources = summary.sourceCount > 0 && summary.evidenceCount > 0 && summary.evidenceUrlsValid;
  record.checks.noInventedBudget = summary.estimatedBudget == null;
  record.checks.noInventedEmails = summary.decisionMakerEmails === 0;
  console.log(
    `  research ${summary.researchStatus}: sources=${summary.sourceCount} evidence=${summary.evidenceCount} signals=${summary.signalCount} [${summary.signalTypes.join(",")}] qualification=${summary.qualificationStatus} handoff=${summary.handoff?.status ?? "none"}`,
  );

  const gtmOpportunityId = summary.handoff?.gtmOpportunityId ?? null;
  if (!gtmOpportunityId) {
    record.checks.handoff = summary.handoff?.status === "SKIPPED" || summary.qualificationStatus === "NO_VERIFIED_OPPORTUNITY";
    return record;
  }
  record.checks.handoff = summary.handoff.status === "SUCCESS";

  // 2. Decision context
  const context = await request(`${GTM_BASE}/api/v1/opportunities/${gtmOpportunityId}/decision-context`, {
    headers: internalHeaders,
  });
  if (!context.ok) {
    record.steps.context = { status: context.status, body: context.body };
    record.checks.contextLoaded = false;
    console.log(`  decision-context FAILED (HTTP ${context.status})`);
    return record;
  }

  const ctx = context.body.data;
  record.context = {
    stage: ctx.opportunity?.stage ?? null,
    contacts: ctx.company?.contacts?.map((c) => ({ emailStatus: c.emailStatus, hasEmail: typeof c.email === "string" && c.email.length > 0 })) ?? [],
    intelligenceIdMatches: ctx.intelligence?.id === summary.opportunityId,
    intelligenceEvidence: ctx.intelligence?.evidence?.length ?? null,
    intelligenceDecisionMakers: ctx.intelligence?.decisionMakers?.length ?? null,
  };
  record.checks.contextLoadsSnapshot = record.context.intelligenceIdMatches === true;
  console.log(
    `  context: stage=${record.context.stage} contacts=${record.context.contacts.length} snapshotMatch=${record.context.intelligenceIdMatches}`,
  );

  // 3. Deterministic decision
  const decision = await request(`${GTM_BASE}/api/v1/opportunities/${gtmOpportunityId}/decisions`, {
    method: "POST",
    headers: internalHeaders,
    body: JSON.stringify({}),
  });

  if (!decision.ok || !decision.body?.data?.decision?.id) {
    record.steps.decision = { status: decision.status, body: decision.body };
    record.checks.decisionGenerated = false;
    console.log(`  decision FAILED (HTTP ${decision.status}) ${JSON.stringify(decision.body)}`);
    return record;
  }

  const dec = decision.body.data.decision;
  const decisionId = dec.id;
  record.decision = {
    id: decisionId,
    action: dec.action,
    priority: dec.priority,
    status: dec.status,
    confidence: dec.confidence != null ? String(dec.confidence) : null,
    policyVersion: dec.policyVersion ?? null,
    modelVersion: dec.modelVersion ?? null,
    reasoning: (decision.body.data.reasoning ?? dec.reasoning ?? "").slice(0, 400) || null,
  };
  record.checks.decisionGenerated = dec.status === "AWAITING_APPROVAL";
  console.log(`  decision: action=${dec.action} priority=${dec.priority} status=${dec.status}`);

  // 4. Pre-approval execution probe: the gate must refuse.
  const premature = await request(`${GTM_BASE}/api/v1/decisions/${decisionId}/execute`, {
    method: "POST",
    headers: internalHeaders,
    body: JSON.stringify({}),
  });
  record.checks.executionBlockedBeforeApproval = premature.status === 409;
  console.log(`  pre-approval execute: HTTP ${premature.status} ${premature.body?.error ?? ""}`);

  // 5. Operator approval through the real middleware + stubbed identity.
  const approval = await request(`${GTM_BASE}/api/v1/decisions/${decisionId}/approve`, {
    method: "POST",
    headers: operatorHeaders,
    body: JSON.stringify({ comment: "5-company eval gate approval" }),
  });
  record.approval = { status: approval.status, decisionStatus: approval.body?.data?.status ?? null, error: approval.body?.error ?? null };
  record.checks.operatorApproved = approval.ok && approval.body?.data?.status === "APPROVED";
  console.log(`  approval: HTTP ${approval.status} status=${record.approval.decisionStatus ?? record.approval.error}`);

  if (!approval.ok) return record;

  // 6. Execution
  const execution = await request(`${GTM_BASE}/api/v1/decisions/${decisionId}/execute`, {
    method: "POST",
    headers: internalHeaders,
    body: JSON.stringify({}),
  });
  const exec = execution.body?.data ?? null;
  record.execution = {
    status: execution.status,
    executionStatus: exec?.status ?? null,
    mode: exec?.result?.mode ?? null,
    messageId: exec?.result?.messageId ?? null,
    error: execution.body?.error ?? null,
  };
  record.checks.executed = execution.ok && exec?.status === "SUCCEEDED";
  console.log(`  execute: HTTP ${execution.status} status=${record.execution.executionStatus} mode=${record.execution.mode}`);

  // 7. Closed-loop feedback
  const after = await request(`${GTM_BASE}/api/v1/opportunities/${gtmOpportunityId}`, { headers: internalHeaders });
  const history = await request(`${GTM_BASE}/api/interactions/opportunity/${gtmOpportunityId}/history`, { headers: internalHeaders });

  record.feedback = {
    stage: after.body?.data?.stage ?? null,
    lastInteractionAt: after.body?.data?.lastInteractionAt ?? null,
    interactionTypes: Array.isArray(history.body?.data) ? history.body.data.map((i) => i.type) : [],
  };
  const realExecution = record.execution.mode === "REAL_EXECUTION";
  record.feedback.expectedNoOp = !realExecution;

  /*
   * A preparation-only execution is the honest outcome when no verified
   * contact exists: nothing was sent, so the CRM must NOT move. Only a real
   * execution is expected to advance the stage and log an interaction.
   */
  if (realExecution) {
    record.checks.stageAdvanced = record.feedback.stage !== record.context.stage;
    record.checks.interactionRecorded = record.feedback.interactionTypes.length > 0;
    record.checks.closedLoopHonest =
      record.checks.stageAdvanced && record.checks.interactionRecorded;
  } else {
    record.checks.closedLoopHonest =
      record.feedback.stage === record.context.stage &&
      record.feedback.interactionTypes.length === 0;
  }
  console.log(
    `  feedback: stage ${record.context.stage} → ${record.feedback.stage} interactions=[${record.feedback.interactionTypes.join(",")}]`,
  );

  return record;
}

async function main() {
  // EVAL_ONLY=gymshark,strava limits the run to the named companies (wiring checks).
  const only = (process.env.EVAL_ONLY ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const selected = only.length ? COMPANIES.filter((c) => only.includes(c.key)) : COMPANIES;

  const results = [];
  for (const company of selected) {
    try {
      results.push(await runOne(company));
    } catch (err) {
      results.push({ company: company.companyName, error: err?.message ?? String(err), checks: {} });
      console.error(`  ${company.companyName} threw:`, err?.message ?? err);
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    gtmBase: GTM_BASE,
    miBase: MI_BASE,
    note: "Operator identity for approvals was provided by the local eval auth stub; the real requireSponzillaAdmin middleware executed unchanged.",
    results,
  };

  const outPath = path.join(gtmRoot, "eval-gate-results.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log("\n=== SUMMARY ===");
  for (const r of results) {
    const c = r.checks ?? {};
    const failed = Object.entries(c).filter(([, v]) => v === false).map(([k]) => k);
    console.log(
      `${r.company}: qualification=${r.intelligence?.qualificationStatus ?? "-"} action=${r.decision?.action ?? "-"} mode=${r.execution?.mode ?? "-"} stage=${r.feedback?.stage ?? "-"} ${failed.length ? "FAILED:" + failed.join(",") : "ALL CHECKS PASSED"}`,
    );
  }
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
