# DATA MASS-1 — Reservoir Qualification

**Status:** IMPLEMENTED / LIVE CERTIFICATION REQUIRED  
**Lane:** DATA / Mass Coverage  
**Base:** `main@20ff1683af02c0d4d6fc1efa4a5821674eb88d0f`  
**Branch:** `data/mass-1-reservoir-qualification`

## Responsibility

Qualify the existing `discovery_candidates` reservoir at national scale and rank domains for the next Source Factory lot, without fetching source pages, changing Source Registry policy, ingesting listings, or activating Search.

MASS-1 answers: **what inventory signals do we already possess, which domains carry the most likely real-estate/listing-detail volume, and what should MASS-2 review first?**

## Truth boundary

- The unit is an **URL representation**, never a unique property.
- `likely_real_estate` is a deterministic prioritization signal, not an eligibility decision.
- `LIKELY_LISTING_DETAIL` is a structural heuristic, not proof that a live property exists.
- Duplicate signal uses existing `content_fingerprint` or normalized discovery text only; it is **not property-level deduplication**.
- Source Registry is authoritative. MASS-1 grants no permission and changes no source policy.
- `SOCIAL` and `DISCOVERY_TRANSPORT` domains cannot enter the MASS-2 Source Factory priority queue automatically.
- Existing `hidden`, `prohibited`, `permission_required`, or internal-only sources remain measurement-only.
- Existing `external_tail_link_only + canonical_link_only` sources are only surfaced for MASS-2 policy re-verification; MASS-1 creates zero public rows.

## Inputs

Read-only production tables:

- `discovery_candidates`
- `thin_index_search_documents`
- `source_policy_registry`

No detail-page HTTP request is performed.

## Deterministic classification

### Domain role

- `DIRECT_PORTAL`
- `AGGREGATOR`
- `SOCIAL`
- `DISCOVERY_TRANSPORT`
- `UNKNOWN`

Unknown is intentionally preserved instead of inventing a source identity.

### Page kind

- `LIKELY_LISTING_DETAIL`
- `LIKELY_CATEGORY_OR_SEARCH`
- `AMBIGUOUS`
- `NON_REAL_ESTATE`

Signals are based only on evidence already stored in discovery: URL structure, title, snippet and discovery query.

### MASS queue

- `POLICY_COMPATIBLE_TAIL` — existing Registry canonical-link tail, re-verification required in MASS-2.
- `SOURCE_FACTORY` — unregistered, materially sized real-estate reservoir to audit in MASS-2.
- `MEASURE_ONLY` — already registered source whose current policy remains authoritative.
- `HOLD` — insufficient evidence or transport/social/noise.

## Outputs

The live audit writes artifacts only:

- `proof.json`
- `report.json`
- `domains.csv`
- `summary.md`

The report includes all domain summaries and a Top-50 MASS ranking.

## Blocking gates

MASS-1 cannot pass if any of the following is non-zero:

- database writes
- DDL changes
- policy changes
- source network requests
- detail-page fetches
- public rows created
- unique properties claimed
- social leakage into Source Factory
- discovery-transport leakage into Source Factory

The live reservoir must also be non-empty and produce at least one Source Factory candidate.

## Certification

Required before CLOSED:

1. unit tests PASS;
2. TypeScript PASS;
3. production build PASS;
4. live production read-only audit PASS;
5. independent SQL reconciliation of the major counts;
6. manual spot-check of the highest-volume domains and URL patterns;
7. independent double-check;
8. final score **≥9.0/10**;
9. exact-head CI green;
10. merge, post-merge replay, and canonical README/ROADMAP/SESSION closeout.

## Next lot

**MASS-2 — Source Factory**: policy/robots/terms/channel review of the highest-yield domains produced by MASS-1. No domain becomes authorized from MASS-1 alone.
