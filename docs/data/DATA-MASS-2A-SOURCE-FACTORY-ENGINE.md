# DATA MASS-2A — Source Factory Engine

**Status:** 🟠 ACTIVE / CERTIFICATION REQUIRED  
**Lane:** DATA / Mass Coverage  
**Branch:** `data/mass-2-source-factory`  
**Parent:** MASS-2 — Source Factory  
**Weight in MASS-2:** 15 %

## Responsibility

Turn the MASS-1 certified `SOURCE_FACTORY` queue into a deterministic, reproducible set of per-domain review dossiers for MASS-2B/C/D and define the fail-closed machine contract that later audits must satisfy.

MASS-2A is a **review scheduling + evidence validation engine**, not an autonomous legal/policy interpreter.

## Certified upstream boundary

MASS-1 certified exactly:

- **101 Source Factory domains**;
- **15 790 likely-Morocco real-estate URL representations** carried by that queue.

For the MASS-2 handoff, **101 is pinned**. If the live reservoir no longer reconstructs exactly 101 domains during MASS-2A certification, CI must fail and the drift must be reviewed explicitly. The lot must not silently resize its cohorts.

## Truth boundary

MASS-2A MUST NOT:

- infer permission from volume, sitemap shape, robots.txt, domain type or Registry history;
- autonomously interpret current CGU/terms as legal advice;
- fetch source detail pages in the 2A live audit;
- write Source Registry rows or policy;
- ingest listings;
- create public rows or activate Search;
- claim that URL representations are unique properties.

Every generated dossier starts:

- `reviewStatus = UNREVIEWED`;
- `proposedDecision = HOLD`;
- `permissionInferred = false`;
- `publicActivableNow = false`;
- external evidence slots = `NOT_REVIEWED`.

A Registry row, when present, is copied only as `OBSERVED_REGISTRY_ONLY`; it never lifts or grants policy.

## Deterministic cohorts

The scheduling engine reuses MASS-1 `rankDomainReservoirs` and `massPotentialScore` without introducing a second ranking algorithm.

- ranks **1–20** → `HIGH_YIELD`;
- ranks **21–50** → `MID_YIELD`;
- ranks **51–101** → `LONG_TAIL`.

Certified split for the current handoff: **20 / 30 / 51**.

## Dossier contract

Each initial dossier records:

- domain and MASS-1 source role;
- deterministic rank/cohort and scheduling score;
- URL-representation yield metrics;
- current Registry snapshot if any;
- evidence slots for identity, Morocco relevance, robots, terms, reuse permission, sitemap/structure and freshness;
- review state and proposed decision;
- explicit non-activation / non-inference flags.

Allowed later review outcomes are:

`POLICY_COMPATIBLE`, `CANONICAL_LINK_ONLY`, `INTERNAL_ONLY`, `PERMISSION_REQUIRED`, `PROHIBITED`, `HOLD`.

**MASS-2A initial dossiers emit only `HOLD`.** Current-source evidence collection and domain decisions belong to MASS-2B/C/D.

## Dated evidence / channel validator

`source-factory-decision.ts` defines the contract B/C/D must use when converting a dossier into a reviewed decision.

Each proposed decision carries:

- exact `sourceDomain`;
- requested decision;
- explicit allowed channel(s);
- rationale;
- evidence records with `kind`, `reference`, `observedAt`, optional `expiresAt`, assertion, decision and channels supported;
- the dossier's potential-volume snapshot.

Evidence kinds include source identity, Morocco relevance, robots, terms, rights/permission, sitemap/structure, freshness and Registry snapshot.

Fail-closed rules:

- missing, malformed, future-dated or expired evidence ⇒ `HOLD`;
- contradictory current evidence ⇒ `HOLD`;
- channel not backed by policy/rights evidence ⇒ `HOLD`;
- `robots.txt` or sitemap/structure **alone can never establish permission**;
- `PUBLIC_SITEMAP`, `COMMON_CRAWL` and `DIRECT_FETCH` require a current robots observation in addition to policy/rights proof;
- `PUBLIC_SITEMAP` also requires sitemap/structure evidence;
- `CANONICAL_LINK_ONLY` can expose only the canonical-link channel;
- `INTERNAL_ONLY` can expose only the internal-signal channel;
- `PERMISSION_REQUIRED`, `PROHIBITED` and `HOLD` expose no actionable channel.

Even a decision that passes this validator remains:

- `permissionInferred = false`;
- `publicActivableNow = false`;
- `registryWriteAllowed = false`.

It may only become eligible for the **MASS-2E Registry preview**. The validator never writes production policy.

## Live audit inputs

Read-only production tables:

- `discovery_candidates`;
- `thin_index_search_documents`;
- `source_policy_registry`.

The audit reconstructs MASS-1 deterministically from the current production snapshot, filters only `SOURCE_FACTORY`, then builds dossiers.

Network access is restricted to the configured Supabase origin. Any source-domain network request is a blocking failure.

## Required artifacts

- `proof.json` — read-only/fail-closed counters and coverage assertions;
- `dossiers.json` — complete machine-readable handoff;
- `dossiers.csv` — review queue for MASS-2B/C/D;
- `summary.md` — human-readable snapshot and high-yield cohort.

## Blocking gates

- exactly **101** live MASS-1 `SOURCE_FACTORY` domains at certification time;
- exactly **101 unique dossiers**;
- deterministic contiguous ranking;
- exact cohort split **20 / 30 / 51**;
- 100 % `UNREVIEWED` initial dossiers;
- 100 % `HOLD` initial dossiers;
- 100 % `permissionInferred=false`;
- 100 % `publicActivableNow=false`;
- 100 % external evidence `NOT_REVIEWED` in the initial queue;
- dated-evidence validator tests green, including expired/conflicting proof and channel mismatch;
- explicit test proving robots+sitemap alone cannot authorize a channel;
- source network/detail-page requests = 0 in the live 2A audit;
- DB/DDL/Registry/policy writes = 0;
- public rows/Search activations = 0;
- MASS-1 predecessor tests remain green;
- TypeScript and production build green;
- exact-head live audit green;
- independent double-check + final score >= 9/10.

## Handoff

When MASS-2A is certified and merged, MASS-2B starts from the new `main` and reviews the **20 HIGH_YIELD domains** with current web evidence under the dated-evidence/channel contract. No MASS-2A dossier is itself an authorization.
