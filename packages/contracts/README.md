# @sponzilla/contracts

Canonical **v1** domain contracts shared by:

| System | Role |
|--------|------|
| `sponzilla-market-intelligence` | **PRODUCER** of `OpportunityV1` |
| `sponzilla-ai-gtm` | **CONSUMER** of `OpportunityV1` |

## Install (local workspace)

```bash
# from each consuming repo
npm install ../packages/contracts
# or file: protocol
# "@sponzilla/contracts": "file:../packages/contracts"
```

## Usage

```ts
import {
  OpportunityV1Schema,
  parseOpportunityV1,
  type OpportunityV1,
} from '@sponzilla/contracts/v1';

// Producer (MI) — validate before send
const payload = OpportunityV1Schema.parse(builtOpportunity);

// Consumer (GTM) — validate on receive
const opp = parseOpportunityV1(req.body);
```

## v1 exports

- `CompanyV1`
- `SourceV1`
- `EvidenceV1`
- `SignalV1`
- `ICPAssessmentV1` *(PLANNED — optional/null)*
- `BuyerPersonaV1` *(PLANNED — optional)*
- `DecisionMakerV1` *(PLANNED — optional; never invent contacts)*
- `OpportunityV1` *(canonical handoff)*

Later (not in v1): `GTMDecision`, `Approval`, `Execution`, `Outcome`.

## Layer rule

| Layer | On OpportunityV1? |
|-------|-------------------|
| FACT / EVIDENCE | yes — `evidence`, `signals`, `company` |
| AI INFERENCE | yes — `aiInference`, `confidence*`, `audience`, `marketingNeed` |
| RECOMMENDATION | yes — `recommendation`, `nextActionHint` |
| HUMAN DECISION | **no** — GTM Approval |
| ACTION | **no** — GTM Execution |
| OUTCOME | **no** — GTM Outcome |

See root `CONTRACTS_V1.md` for the full engineering review.
