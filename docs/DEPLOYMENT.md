# Deploying AutoGTM

Two services, one database.

| Service | Runtime | Where |
|---|---|---|
| `sponzilla-ai-gtm` | long-lived Express + Prisma process | Docker host: Render, Railway, Fly, ECS |
| `sponzilla-market-intelligence` | Fastify API + Next.js web | Vercel (already has `vercel.json`) |

GTM cannot go on a static or serverless target: it holds a Prisma connection
pool and serves long-lived HTTP routes. Use the provided `Dockerfile`.

---

## 1. AutoGTM (GTM)

### Build and run locally

```bash
docker build -t sponzilla-ai-gtm .
docker run --env-file .env -p 3000:3000 sponzilla-ai-gtm
curl -s localhost:3000/health    # {"status":"ok"}
curl -s localhost:3000/ready     # {"status":"ready","dependencies":{"database":"ok"}}
```

### Render

1. New → Web Service → deploy from the repo, runtime **Docker**.
2. Health check path: `/health`.
3. Pre-deploy command, so migrations run before the new version takes traffic:

```bash
npm run db:migrate
```

4. Set the environment variables below.

Railway: same Dockerfile, with `npm run db:migrate` as the pre-deploy step.
Fly: `fly launch --dockerfile Dockerfile`, then run the migration once with
`fly ssh console -C "npm run db:migrate"`.

### Required environment variables

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Supabase session-pooler URI. Encode `#` as `%23`, `@` as `%40`. |
| `INTERNAL_ADMIN_API_KEY` | 64-char hex. Must match the MI service value. |
| `SPONZILLA_AUTH_API_URL` | e.g. `https://sponzilla-k13k.onrender.com`. Without it, approve/reject returns 503. |
| `CORS_ALLOWED_ORIGINS` | Exact frontend origin(s), comma-separated. Empty blocks browsers. |
| `HUNTER_API_KEY` | Enrichment. 1 credit per email **found**; misses are free. |
| `GEMINI_API_KEY` | Drafting. Without it drafts return 503 instead of generic copy. |

Optional: `GTM_DEFAULT_OWNER_ID`, `ICP_TARGET_TITLES`, `GTM_OFFERING_BRIEF`,
`APOLLO_API_KEY` with `APOLLO_ENRICHMENT_ENABLED=true`, `GEMINI_MODEL`,
`PORT` (defaults to 3000).

### Card ownership

A card belongs to the user whose research produced it.

- Multi-user: Market Intelligence sends `X-Operator-Id` on ingest.
- Single-operator pilot: set `GTM_DEFAULT_OWNER_ID=<Sponzilla user id>`.
- Neither set: the card is created with no owner and **does not appear** in
  `GET /api/v1/outreach/opportunities`.

### Post-deploy smoke test

```bash
BASE=https://<gtm-host>
KEY=<INTERNAL_ADMIN_API_KEY>

curl -s $BASE/health
curl -s $BASE/ready
curl -s -H "Authorization: Bearer $KEY" $BASE/api/v1/opportunities | head -c 200
curl -s -o /dev/null -w "%{http_code}\n" $BASE/api/v1/outreach/opportunities   # expect 401
```

Then in order: research a company from the MI UI → the card appears for its
owner → targets → enrich one contact → one draft → approve with a real operator
session → confirm the draft reads `APPROVED`.

Nothing sends email. An approved draft is a reviewed artifact: copy the subject
and body and send from your own mailbox.

---

## 2. Market Intelligence (MI)

Deploy from the `sponzilla-market-intelligence` repo on Vercel.

| Variable | Value |
|---|---|
| `RESEARCH_API_KEY` | shared secret accepted by `POST /api/v1/research` |
| `TAVILY_API_KEY` | primary search provider |
| `BRAVE_API_KEY` | fallback search provider |
| `OPENAI_API_KEY` | grounded analysis step |
| `GTM_INGEST_URL` | `https://<gtm-host>/api/v1/opportunities/ingest` |
| `INTERNAL_ADMIN_API_KEY` | same value as the GTM service |
| `ENABLE_GTM_AUTO_HANDOFF` | `true` |
| `SEARCH_PROVIDER` | `tavily` |
| `GTM_OPERATOR_ID` | the user id to forward as `X-Operator-Id` |

Verify after deploy:

```bash
curl -s https://<mi-host>/api/v1/health
curl -s -X POST https://<mi-host>/api/v1/research \
  -H "Authorization: Bearer $RESEARCH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Strava","websiteUrl":"https://www.strava.com","category":"fitness app"}'
```

A successful run returns `status: COMPLETED` with a `gtmHandoff` object. A
failed handoff is logged and does not fail the research run.

---

## 3. Frontend

- Point the client at the GTM deployment: `VITE_GTM_API_URL=https://<gtm-host>/api/v1`
- Add the frontend origin to GTM `CORS_ALLOWED_ORIGINS`.
- Approve/reject forwards the user JWT; GTM verifies it against `/api/auth/me`
  and requires the current role to be `admin`.

---

## Order of operations

1. Deploy GTM, run migrations, confirm `/ready`.
2. Deploy MI, point `GTM_INGEST_URL` at the GTM host, confirm health.
3. Set `GTM_DEFAULT_OWNER_ID` (or wire `X-Operator-Id`), then run one research.
4. Point the frontend at GTM and add its origin to CORS.
5. Walk the smoke test above end to end.
