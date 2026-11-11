# AutoGTM readiness and product scope

Updated 2026-11-04 from repository review, local build/tests, and the connected Supabase project `sponzilla-ai-gtm`.

## Product decision

Treat AutoGTM as SponZilla's internal growth operations engine for the first release: find and qualify brand/community opportunities, prepare a grounded marketing proposal, get an authenticated human decision, execute through an approved provider, and record outcomes. Keep customer campaign planning, channel delivery, and campaign ROI reporting as a separate product domain until SponZilla defines a first campaign type and success metric.

This fits SponZilla's broader marketing positioning without stretching the current sponsorship-oriented CRM into an unbounded campaign platform.

## Blockers by impact and effort

| Priority | Blocker | Effort | State | Next action |
|---|---|---:|---|---|
| P0 | Database migration drift | Medium | Resolved | Reconciled the already-applied Market Intelligence migration in Prisma, applied the six remaining migrations, and verified Prisma reports the schema up to date. |
| P0 | Public tables without RLS | Low | Resolved for current schema | RLS is enabled on all four affected tables, with no client policies. Server-side Prisma remains the access path. |
| P0 | Approval actor can be spoofed | Medium | Fixed in code | Approval/rejection validates the main SponZilla JWT through `/api/auth/me`, requires the current database role to be `admin`, and derives the audit actor from that verified user. Configure `SPONZILLA_AUTH_API_URL` before deployment. |
| P1 | Database readiness is invisible | Low | Fixed in code | `/health` remains process liveness; `/ready` now checks PostgreSQL and returns 503 when it is unavailable. |
| P1 | Clean builds depend on ignored Prisma output | Low | Fixed in code | Build and typecheck lifecycle regenerate Prisma Client. Source-only test runner ignores `dist`; CLI smoke scripts no longer look like tests. |
| P1 | Email and CRM actions are not real | Medium | Blocked on provider/configuration | Choose the systems of record and configure credentials/sandbox access. Executors must remain honest and preparation-only until a provider confirms the side effect. |
| P1 | Main frontend approval wiring | Low | API client added | The SponZilla frontend API client forwards its existing `authToken` to AutoGTM approve/reject routes. Set `VITE_GTM_API_URL` in the frontend and add the exact frontend origin to AutoGTM `CORS_ALLOWED_ORIGINS`. |
| P2 | Current model covers lead/opportunity orchestration, not campaign operations | Large | Product gap | For one campaign type, define brief, audience, channel, budget, deliverables, measurement window, and success event before adding campaign schema or automation. |
| P2 | No measured pilot evidence | Medium | Unresolved | Run the documented five-company evaluation, then one end-to-end pilot with real approvals and measured outcomes. |

## Database migration status

The Supabase project is active. The first missing migration (`add_market_intelligence_opportunity_source`) had previously been applied through the Supabase connector and was marked applied in Prisma's ledger. With `DATABASE_URL` configured, the six other pending repository migrations were deployed via `prisma migrate deploy`; `prisma migrate status` now reports the schema up to date. The complete schema includes `AdminAuditLog` and `Contact`, and RLS is enabled on both.

RLS is enabled in Supabase on `_prisma_migrations`, `MarketIntelligenceOpportunity`, `AdminAuditLog`, and `Contact`. Verification confirmed all four have RLS enabled and no direct policies for client roles; their existing grants therefore do not expose rows to `anon` or `authenticated`. The security advisor now shows 12 informational `rls_enabled_no_policy` notices across server-only tables, not RLS-disabled errors. It also shows unused indexes while tables are empty; reassess after pilot traffic.

```sql
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."MarketIntelligenceOpportunity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AdminAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Contact" ENABLE ROW LEVEL SECURITY;
```

For this server-only Prisma data path, the recommended policy is no `anon`/`authenticated` policies; the server database role remains the only application access path. If the Supabase Data API must serve any of these tables directly, define narrow policies first.

## Verification performed

- `npm run build`: passed; Prisma Client generated from schema in the build lifecycle.
- `npm test`: 118 passed, 0 failed, 1 skipped. The skipped authenticated HTTP handoff writes persistent records and requires `RUN_GTM_HTTP_E2E=true`; run it only against a disposable test database or after adding safe cleanup/isolation. It was not run against the production project.
- Supabase security advisor after deployment: 12 informational RLS-enabled/no-policy findings, consistent with server-only access; no RLS-disabled findings. Unused-index notices remain while the project has no application data.
- No email was sent and no HubSpot/Klaviyo records were read or changed during this readiness pass.
