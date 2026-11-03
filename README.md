# SponZilla AI-GTM

Decision engine, CRM opportunity orchestration, and human-in-the-loop action execution service for SponZilla.

## Features
- **Canonical OpportunityV1 Ingestion**: Authenticated endpoint (`POST /api/v1/opportunities/ingest`) receiving opportunities from Market Intelligence.
- **Dual-Layer Decision Engine**: Deterministic policy determines authoritative GTM actions; Gemini AI provides explanation enrichment.
- **Human-in-the-Loop Gate**: Decisions require operator review (`AWAITING_APPROVAL` → `APPROVED` / `REJECTED`) before any external action.
- **Honest Execution Modes**:
  - `OutreachEmailExecutor`: Prepares outreach drafts and reports `SIMULATED` / `NOT_SENT` until an email provider is configured.
  - `CRMUpdateExecutor`: Prepares CRM actions and reports `PREPARATION_ONLY` / `NOT_APPLIED`.
  - Executors declare `mode: "REAL_EXECUTION"` only when an external side effect actually happened.
- **Contact Gate**: Outreach actions require a `VERIFIED` contact address. Without one the policy routes to `RESEARCH_COMPANY` instead of pretending to send.
- **Closed-Loop Feedback**: Only a `REAL_EXECUTION` result atomically transitions `Opportunity.stage` and inserts an `Interaction` (`EMAIL_SENT`, `PROPOSAL_SENT`, `CALL`) in the same PostgreSQL transaction. Simulated results never mutate the CRM.
- **Operator Loop & 5-Company Eval Gate**: Detailed in [docs/OPERATOR_LOOP_AND_EVAL_GATE.md](./docs/OPERATOR_LOOP_AND_EVAL_GATE.md).

## Getting Started

```bash
npm install
npm run build --workspace=@sponzilla/contracts
npm run typecheck
npm test:decision-policy
```
