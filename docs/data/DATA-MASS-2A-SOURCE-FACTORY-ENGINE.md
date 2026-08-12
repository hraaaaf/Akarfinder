# DATA MASS-2A — Source Factory Engine

**Status:** 🟠 ACTIVE / CERTIFICATION REQUIRED  
**Lane:** DATA / Mass Coverage  
**Branch:** `data/mass-2-source-factory`  
**Parent:** MASS-2 — Source Factory  
**Weight in MASS-2:** 15 %

## Responsibility

Turn the **certified MASS-1 `SOURCE_FACTORY` handoff** into deterministic per-domain review dossiers for MASS-2B/C/D and define the fail-closed evidence/channel contract later audits must satisfy.

MASS-2A is a **review scheduling + evidence validation engine**, not an autonomous legal/policy interpreter.

## Certified upstream boundary

The immutable handoff is materialized in:

`data/data-mass-2a/mass-1-certified-source-factory.json`

It is pinned to MASS-1:

- head `0a2856e68b44bee6f7b398b5c314d53711d95a67`;
- run `31557215870`;
- artifact `9126627714`;
- digest `sha256:84333105c8edda9be5733184c42e2e1afc865109edb580a5ae1705219c1cd932`;
- generated at `2026-08-12T02:45:47.595Z`;
- **199 381** Discovery rows read;
- exactly **101 Source Factory domains**;
- **15 790** likely-Morocco real-estate URL representations carried by that queue.

**Membership, rank and MASS-1 scheduling score are frozen to this certified artifact for MASS-2A.** Continuous Discovery is allowed to keep growing, but a later source cannot silently enter the in-flight lot.

## Live drift rule

The production reservoir is still re-read during certification. Its purpose is now twofold:

1. refresh current yield/Registry observations for the 101 certified domains;
2. independently recompute the current live `SOURCE_FACTORY` set and report drift against the certified handoff.

The audit emits:

- `liveRecomputedSourceFactoryDomains`;
- `postSnapshotAddedLiveSourceFactoryDomains`;
- `certifiedDomainsNoLongerLiveSourceFactory`;
- current Discovery row count and delta versus the certified snapshot.

A non-zero drift is **evidence, not an implicit scope mutation**. New live candidates belong to a later explicit Reservoir refresh/requalification; they do not resize 2A, 2B, 2C or 2D behind the user's back.

A certified domain missing entirely from current summaries remains a blocking finding because its current observation cannot be materialized safely.

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

A current Registry row is copied only as observation; it never grants permission or removes a domain from the certified review handoff by itself.

## Deterministic cohorts

The certified ordering and `massPotentialScore` come from MASS-1; 2A introduces no second ranking algorithm.

- ranks **1–20** → `HIGH_YIELD`;
- ranks **21–50** → `MID_YIELD`;
- ranks **51–101** → `LONG_TAIL`.

Certified split: **20 / 30 / 51**.

## Dossier contract

Each initial dossier records:

- certified domain, rank/cohort and MASS-1 scheduling score;
- current source role/yield observations;
- current Registry snapshot if any;
- evidence slots for identity, Morocco relevance, robots, terms, reuse permission, sitemap/structure and freshness;
- review state and proposed decision;
- explicit non-activation / non-inference flags.

Allowed later review outcomes are:

`POLICY_COMPATIBLE`, `CANONICAL_LINK_ONLY`, `INTERNAL_ONLY`, `PERMISSION_REQUIRED`, `PROHIBITED`, `HOLD`.

**MASS-2A initial dossiers emit only `HOLD`.** Current-source evidence collection and decisions belong to MASS-2B/C/D.

## Dated evidence / channel validator

`source-factory-decision.ts` defines the contract B/C/D must use when converting a dossier into a reviewed decision.

Each proposal carries exact domain, decision, channel(s), rationale and dated evidence. Fail-closed rules include:

- missing, malformed, future-dated or expired evidence ⇒ `HOLD`;
- contradictory current evidence ⇒ `HOLD`;
- channel not backed by policy/rights evidence ⇒ `HOLD`;
- `robots.txt` or sitemap/structure **alone can never establish permission**;
- `PUBLIC_SITEMAP`, `COMMON_CRAWL` and `DIRECT_FETCH` require current robots observation plus policy/rights proof;
- `PUBLIC_SITEMAP` also requires sitemap/structure evidence;
- `CANONICAL_LINK_ONLY` exposes only canonical-link;
- `INTERNAL_ONLY` exposes only internal-signal;
- `PERMISSION_REQUIRED`, `PROHIBITED` and `HOLD` expose no actionable channel.

Even a decision accepted by this validator remains:

- `permissionInferred = false`;
- `publicActivableNow = false`;
- `registryWriteAllowed = false`.

It may only become eligible for the **MASS-2E Registry preview**. The validator never writes production policy.

## Live audit inputs

Read-only production tables:

- `discovery_candidates`;
- `thin_index_search_documents`;
- `source_policy_registry`.

Network access is restricted to the configured Supabase origin. Any source-domain network request is a blocking failure.

## Required artifacts

- `proof.json` — certified-cohort provenance, read-only counters and live-drift sets;
- `dossiers.json` — exact 101-domain machine handoff;
- `dossiers.csv` — review queue for MASS-2B/C/D;
- `summary.md` — human-readable certified cohort + live drift snapshot.

## Blocking gates

- manifest provenance matches the certified MASS-1 head/run/artifact/digest;
- exactly **101 unique certified dossiers** in manifest order;
- exact frozen ranks/scores from MASS-1;
- exact cohort split **20 / 30 / 51**;
- live reservoir additions/removals are measured separately and never silently change membership;
- 100 % `UNREVIEWED` / `HOLD` / `permissionInferred=false` / `publicActivableNow=false`;
- 100 % external evidence `NOT_REVIEWED` in the initial queue;
- dated-evidence validator tests green, including expired/conflicting proof and channel mismatch;
- explicit test proving robots+sitemap alone cannot authorize a channel;
- source network/detail-page requests = 0;
- DB/DDL/Registry/policy writes = 0;
- public rows/Search activations = 0;
- MASS-1 predecessor tests remain green;
- TypeScript and production build green;
- exact-head production read-only audit green;
- independent double-check + final score >= 9/10.

## Handoff

When MASS-2A is certified and merged, MASS-2B starts from the new `main` and reviews the **20 certified HIGH_YIELD domains** with current web evidence under the dated-evidence/channel contract. No MASS-2A dossier is itself an authorization.
