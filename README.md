# SponZilla AI-GTM

Decision engine, CRM opportunity orchestration, and human-in-the-loop action execution service for SponZilla.

## Features
- **Canonical OpportunityV1 Ingestion**: Authenticated endpoint (`POST /api/v1/opportunities/ingest`) receiving opportunities from Market Intelligence.
- **Dual-Layer Decision Engine**: Deterministic policy determines authoritative GTM actions; Gemini AI provides explanation enrichment.
- **Human-in-the-Loop Gate**: Decisions require operator review (`AWAITING_APPROVAL` → `APPROVED` / `REJECTED`) before any external action.
- **Verified Approval Identity**: Approve/reject routes validate the main SponZilla bearer JWT through its protected `/api/auth/me` endpoint and require the current database role to be `admin`; audit actor IDs come from that verified user, never the request body. Internal ingestion remains protected by the server API key.
- **Honest Execution Modes**:
  - `OutreachEmailExecutor`: Prepares outreach drafts and reports `SIMULATED` / `NOT_SENT` until an email provider is configured.
  - `CRMUpdateExecutor`: Prepares CRM actions and reports `PREPARATION_ONLY` / `NOT_APPLIED`.
  - Executors declare `mode: "REAL_EXECUTION"` only when an external side effect actually happened.
- **Contact Gate**: Outreach actions require a `VERIFIED` contact address. Without one the policy routes to `RESEARCH_COMPANY` instead of pretending to send.
- **Closed-Loop Feedback**: Only a `REAL_EXECUTION` result atomically transitions `Opportunity.stage` and inserts an `Interaction` (`EMAIL_SENT`, `PROPOSAL_SENT`, `CALL`) in the same PostgreSQL transaction. Simulated results never mutate the CRM.
- **Operator Loop & 5-Company Eval Gate**: Detailed in [docs/OPERATOR_LOOP_AND_EVAL_GATE.md](./docs/OPERATOR_LOOP_AND_EVAL_GATE.md).

## Getting Started

For approval routes, configure `SPONZILLA_AUTH_API_URL` to the root URL of the main SponZilla backend (for example `https://sponzilla-k13k.onrender.com`). The frontend sends its existing SponZilla bearer token; AutoGTM validates it through `/api/auth/me` and accepts only users whose current SponZilla account role is `admin`. No JWT signing secret is shared with AutoGTM.

```bash
npm install
npm run build --workspace=@sponzilla/contracts
npm run typecheck
npm test
```

The build/typecheck lifecycle regenerates the Prisma Client from `prisma/schema.prisma`, so a clean checkout does not depend on an ignored generated directory. `npm test` runs the automated tests; the decision smoke commands accept an existing opportunity ID after `--`.
