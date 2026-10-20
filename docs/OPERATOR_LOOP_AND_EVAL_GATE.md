# SponZilla GTM: Operator Loop & 5-Company Eval Gate

## 1. Executive Summary & Purpose

This document specifies the operational lifecycle ("Operator Loop") and the pre-deployment trust/quality evaluation criteria ("5-Company Eval Gate") across **SponZilla Market Intelligence (MI)** and **SponZilla AI-GTM**.

The system bridges raw external market signals to verified GTM execution through a strict separation between **FACT**, **EVIDENCE**, **AI INFERENCE**, **DETERMINISTIC POLICY**, and **HUMAN OPERATOR APPROVAL**.

---

## 2. The 6-Stage Operator Loop

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SPONZILLA OPERATOR LOOP                                │
└────────────────────────────────────────────────────────────────────────────────────────┘

 [1. Discovery & Research] (MI)
   │  - Query web search provider (Tavily / Brave / DDG)
   │  - Filter & verify HTTP 200 live sources
   │  - Extract strict evidence items bound to source URLs
   │  - Detect marketing signals (launches, campaigns, sponsorships)
   │  - Synthesize grounded OpportunityV1 payload (no invented facts/budgets)
   ▼
 [2. Automated Handoff] (MI → GTM)
   │  - Auto-POST OpportunityV1 to GTM Ingest endpoint (`/api/v1/opportunities/ingest`)
   │  - Authenticated via SHA-256 constant-time administrative Bearer token
   │  - Unqualified payloads (`NO_VERIFIED_OPPORTUNITY`) are skipped
   │  - Idempotent upsert of Company and CRM Opportunity
   ▼
 [3. Decision Generation & Enrichment] (GTM Engine)
   │  - Build trusted `GTMDecisionContext` from DB snapshot & interaction history
   │  - Deterministic Policy evaluates authoritative action & priority
   │  - Optional Gemini AI enrichment adds tailored reasoning & outreach summary
   │  - Fail-safe fallback preserves deterministic baseline if AI fails/unconfigured
   │  - Decision persisted in `AWAITING_APPROVAL` status with PostgreSQL advisory lock
   ▼
 [4. Human Operator Review] (GTM Admin / UI)
   │  - Operator reviews decision summary, reasoning, source evidence, and action
   │  - Human-in-the-loop gate: Operator explicitly APPROVES or REJECTS
   │  - Records audit log with actor ID, actor name, comment, and immutable snapshot
   ▼
 [5. Atomic Execution] (GTM Dispatcher)
   │  - Atomic claim: prevents duplicate or concurrent executions
   │  - Dispatched to real executor:
   │      • Outreach Email Executor (SEND_INTRODUCTION, SEND_CASE_STUDY, SEND_CAMPAIGN_PROPOSAL, FOLLOW_UP)
   │      • CRM Update Executor (SCHEDULE_DISCOVERY_CALL, RESEARCH_COMPANY, CLOSE_OPPORTUNITY)
   │  - Real execution outputs `mode: "REAL_EXECUTION"`, messageId, timestamps, status
   ▼
 [6. Closed-Loop Feedback] (ACID Transaction)
   │  - Execution status marked `SUCCEEDED`
   │  - Decision status marked `EXECUTED`
   │  - Opportunity stage updated (NEW → CONTACTED → INTERESTED / PROPOSAL)
   │  - Interaction recorded in DB (`EMAIL_SENT`, `PROPOSAL_SENT`, `CALL`, `NOTE`)
   │  - `lastInteractionAt` updated to drive future decision context cycles
```

---

## 3. Operator Loop Step-by-Step Specification

### Step 1: Market Intelligence & Grounded Opportunity Synthesis
- Input: `companyName`, `websiteUrl`, optional `location`, optional `category`.
- Grounding Rule: Never fabricate contacts, budgets, campaigns, or sponsorship history.
- Missing information must remain `null` / `unknown`.
- Generates canonical `OpportunityV1` contract with verified sources and confidence metrics.

### Step 2: Automated Ingestion & Handoff
- MI automatically submits qualified opportunities (`qualificationStatus === 'OPPORTUNITY_DETECTED'`) to GTM ingest:
  - Default Endpoint: `POST /api/v1/opportunities/ingest`
  - Authentication: `Authorization: Bearer <INTERNAL_ADMIN_API_KEY>` (64-char hex key)
- Consumer mapping:
  - Upserts Company record (matched by website first, then name).
  - Creates CRM Opportunity record with initial stage `NEW`, source `OUTBOUND` (or `MARKET_INTELLIGENCE`).
  - Preserves immutable `intelligenceSnapshot` (full `OpportunityV1`).

### Step 3: Dual-Layer Decision Engine
- Context Assembly: Loads company profile, CRM opportunity state, recent interaction timeline, and raw intelligence.
- Authoritative Layer: Deterministic finite-state machine (`decisionPolicyService`) determines:
  - `action`: `RESEARCH_COMPANY`, `SEND_INTRODUCTION`, `FOLLOW_UP`, `SCHEDULE_DISCOVERY_CALL`, etc.
  - `priority`: `LOW`, `MEDIUM`, `HIGH`.
  - `proposedAction`: Structured payload specifying requirements and execution parameters.
- AI Enrichment Layer: Gemini integrates via `GTMEnrichmentService`:
  - Enriches the contextual `summary` and `reasoning`.
  - Strictly forbidden from modifying the chosen action or auto-approving.
  - Transparent fallback to deterministic baseline if Gemini times out or is unconfigured.

### Step 4: Human-in-the-Loop Operator Gate
- No external side-effect is permitted without an operator approval record.
- Transition: `AWAITING_APPROVAL` → `APPROVED` (or `REJECTED`).
- Validation: Verifies that the approved action payload matches the proposed action snapshot byte-for-byte.

### Step 5: Real Action Execution
- Approved decisions are claimed atomically (`PENDING` status).
- Dispatched via `decisionActionDispatcher`:
  - `OutreachEmailExecutor`: Formats personalized outbound message grounded in detected signals, produces `messageId`, records delivery channel `EMAIL`.
  - `CRMUpdateExecutor`: Updates internal CRM tasks and schedules.
- Produces `mode: "REAL_EXECUTION"` result payload.

### Step 6: Closed-Loop Stage & Interaction Feedback
- Atomic Database Finalization: Inside a single PostgreSQL transaction:
  - Execution marked `SUCCEEDED`.
  - GTM Decision marked `EXECUTED`.
  - Audit log recorded.
  - **Stage Update**:
    - `SEND_INTRODUCTION` / `SEND_CASE_STUDY` → `CONTACTED`
    - `SEND_CAMPAIGN_PROPOSAL` → `PROPOSAL`
    - `SCHEDULE_DISCOVERY_CALL` → `INTERESTED`
    - `CLOSE_OPPORTUNITY` → `LOST`
  - **Interaction Created**:
    - Outreach emails → `EMAIL_SENT`
    - Proposals → `PROPOSAL_SENT`
    - Discovery calls → `CALL`
    - Research notes → `NOTE`
  - `Opportunity.lastInteractionAt` updated to current timestamp.
- This feeds forward into subsequent decision generation cycles so the engine recognizes previous outreach.

---

## 4. 5-Company Evaluation Gate (Trust & Ship Bar)

Before releasing to production or promoting pipeline runs, the system must pass the 5-Company Evaluation Gate across diverse industries and signal types.

| # | Company | Domain / URL | Target Signal | Expected Stage & Action | Verification Criteria |
|---|---------|-------------|---------------|-------------------------|------------------------|
| **1** | **Gymshark** | `https://gymshark.com` | Store opening / regional retail expansion | `NEW` → `RESEARCH_COMPANY` or `SEND_INTRODUCTION` | • Physical retail expansion signal verified with live URL<br>• No invented budget numbers ($0 or null unless verified)<br>• Canonical OpportunityV1 contract valid<br>• Ingested into GTM CRM with `intelligenceSnapshot` |
| **2** | **Red Bull** | `https://redbull.com` | Event sponsorship / extreme sports activation | `NEW` → `SEND_INTRODUCTION` or `SEND_CASE_STUDY` | • Event / extreme sports signal linked to official news<br>• Decision makers empty (PLANNED, not invented)<br>• Enriched summary grounds in event context<br>• Approval gate blocks execution until human signs off |
| **3** | **Liquid Death** | `https://liquiddeath.com` | Influencer campaign & festival sponsorship | `NEW` → `SEND_INTRODUCTION` | • Viral/influencer marketing signal verified<br>• Fact/evidence boundary preserved<br>• Real execution generates outreach email with unique messageId<br>• CRM interaction logged as `EMAIL_SENT` |
| **4** | **Duolingo** | `https://duolingo.com` | Youth/campus marketing & social campaign | `NEW` → `SEND_INTRODUCTION` | • Campus or social activation signal grounded<br>• Policy selects introductory outreach<br>• Execution updates stage from `NEW` to `CONTACTED`<br>• Subsequent decision proposes `FOLLOW_UP` |
| **5** | **Strava** | `https://strava.com` | Partner / brand challenge expansion | `NEW` → `SCHEDULE_DISCOVERY_CALL` or `SEND_INTRODUCTION` | • Community / challenge partnership signal grounded<br>• Full schema validation passes with 0 lint/zod warnings<br>• Audit trail logs all transitions |

---

## 5. Trust & Quality Ship Bar Checklist

All releases must satisfy the following non-negotiable gates:

1. **Grounding & Provenance Bar**: Zero hallucinated facts, contacts, or budgets. 100% of signals and evidence must retain valid source URLs.
2. **Schema & Contract Integrity Bar**: Every payload crossing the boundary must strictly parse under `@sponzilla/contracts/v1` `OpportunityV1Schema`.
3. **Deterministic Safety Bar**: All GTM actions and priorities are chosen by deterministic policy code. LLM is strictly restricted to narrative enrichment.
4. **Human-in-the-Loop & Audit Bar**: No external execution without prior `APPROVED` status.
5. **Feedback Loop Bar**: Executed decisions must automatically advance the Opportunity stage and record an `Interaction` in the same database transaction.
