# SponZilla AI-GTM

Decision engine, CRM opportunity orchestration, and human-in-the-loop action execution service for SponZilla.

## Features
- **Canonical OpportunityV1 Ingestion**: Authenticated endpoint (`POST /api/v1/opportunities/ingest`) receiving opportunities from Market Intelligence.
- **Dual-Layer Decision Engine**: Deterministic policy determines authoritative GTM actions; Gemini AI provides explanation enrichment.
- **Human-in-the-Loop Gate**: Decisions require operator review (`AWAITING_APPROVAL` → `APPROVED` / `REJECTED`) before any external action.
- **Real Execution**:
  - `OutreachEmailExecutor`: Formats personalized outreach with verifiable message IDs.
  - `CRMUpdateExecutor`: Manages internal CRM tasks and schedules.
- **Closed-Loop Feedback**: Execution finalization atomically transitions `Opportunity.stage` and inserts an `Interaction` (`EMAIL_SENT`, `PROPOSAL_SENT`, `CALL`) in the same PostgreSQL transaction.
- **Operator Loop & 5-Company Eval Gate**: Detailed in [docs/OPERATOR_LOOP_AND_EVAL_GATE.md](./docs/OPERATOR_LOOP_AND_EVAL_GATE.md).

## Getting Started

```bash
npm install
npm run build --workspace=@sponzilla/contracts
npm run typecheck
npm test:decision-policy
```
