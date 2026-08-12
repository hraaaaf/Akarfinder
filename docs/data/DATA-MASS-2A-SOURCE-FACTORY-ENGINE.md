# DATA MASS-2A — Source Factory Engine

**Status:** 🟠 ACTIVE / CERTIFICATION REQUIRED  
**Lane:** DATA / Mass Coverage  
**Branch:** `data/mass-2a-source-factory-engine`  
**Parent:** MASS-2 — Source Factory  
**Weight in MASS-2:** 15 %

## Responsibility

Turn the live MASS-1 `SOURCE_FACTORY` queue into a deterministic, reproducible set of per-domain review dossiers for MASS-2B/C/D.

MASS-2A is a **review scheduling and evidence-contract engine**, not a legal/policy decision engine.

## Truth boundary

MASS-2A MUST NOT:

- infer permission from volume, sitemap shape, domain type or Registry history;
- browse or interpret current robots.txt / CGU / source terms for the 101 domains;
- fetch source detail pages;
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

The engine reuses MASS-1 `rankDomainReservoirs` and `massPotentialScore` without introducing a second ranking algorithm.

- ranks 1–20 → `HIGH_YIELD`;
- ranks 21–50 → `MID_YIELD`;
- ranks 51+ → `LONG_TAIL`.

The live number of candidates is not hard-coded. MASS-1 certified 101 domains, but MASS-2A must tolerate reservoir drift while preserving exact coverage of the current live `SOURCE_FACTORY` queue.

## Dossier contract

Each dossier records:

- domain and MASS-1 source role;
- deterministic rank/cohort and scheduling score;
- URL-representation yield metrics;
- current Registry snapshot if any;
- evidence slots for identity, Morocco relevance, robots, terms, reuse permission, sitemap/structure and freshness;
- review state and proposed decision;
- explicit non-activation / non-inference flags.

Allowed later review outcomes are:

`POLICY_COMPATIBLE`, `CANONICAL_LINK_ONLY`, `INTERNAL_ONLY`, `PERMISSION_REQUIRED`, `PROHIBITED`, `HOLD`.

**MASS-2A itself emits only `HOLD`.** Current-source evidence collection and decisions belong to MASS-2B/C/D.

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

- one dossier exactly per live MASS-1 `SOURCE_FACTORY` domain;
- no duplicate domain;
- deterministic contiguous ranking;
- 20/30/remainder cohort split;
- 100 % `UNREVIEWED`;
- 100 % `HOLD`;
- 100 % `permissionInferred=false`;
- 100 % `publicActivableNow=false`;
- 100 % external evidence `NOT_REVIEWED`;
- source network/detail-page requests = 0;
- DB/DDL/Registry/policy writes = 0;
- public rows/Search activations = 0;
- MASS-1 predecessor tests remain green;
- TypeScript and production build green;
- exact-head live audit green;
- independent double-check + final score >= 9/10.

## Handoff

When MASS-2A is certified and merged, MASS-2B starts from the new `main` and reviews the `HIGH_YIELD` cohort with current web evidence. No MASS-2A dossier is itself an authorization.
