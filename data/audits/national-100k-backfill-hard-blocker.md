# #10/10 National Backfill & 100k Scale Gate — HARD_BLOCKER_EVIDENCED

**Mission:** AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#10/10)
**Verdict:** `HARD_BLOCKER_EVIDENCED` — the 100k goal is **not met** and is **not claimed** to be met.

## The goal

≥100,000 unique canonical source-offer URLs observed in the appropriate DB layer (seed / observation / index), proven by an exact DB query. No fabrication, no counting category/search pages, no inter-provider double-counting.

## Current true state (measured, read-only)

| Layer | Count |
|---|---|
| `discovery_candidates` total rows | 8,039 |
| `discovery_candidates` **distinct canonical URLs** | **6,285** |
| `listing_sources` (admitted offers) | 632 |
| `property_listings` | 627 |
| Offline Common Crawl seeds harvested (#4, not yet persisted) | 3,027 |
| **Estimated total distinct canonical observed** | **~9,000** |

We are at roughly **9% of the 100k goal**.

## Two structural blockers

### 1. WRITE_PATH_BLOCKER (HARD)

The dedicated seed table (`source_offer_seeds`, migration tested PASS STRICT via the PGlite gate in #4/10) **cannot be applied to Production** from this environment: no `SUPABASE_ACCESS_TOKEN` (Management API), no direct Postgres connection, no dashboard SQL-editor access (browser extension not connected). The user explicitly deferred application this session to "when we have Supabase dashboard access."

Consequence: the mandate's required proof — an exact DB query returning ≥100,000 distinct `canonical_url` — is **structurally impossible right now**, because there is no table to persist the harvested seeds into.

**Unblock:** apply `supabase/migrations/20260721000000_create_source_offer_seeds.sql` once via the Supabase dashboard SQL editor (single idempotent paste), or provide a Management API token.

### 2. RESERVOIR_SIZE_BLOCKER (HARD)

The authorized Common Crawl reservoir across the 16 registered listing-pattern domains on recent indexes is far below 100k.

| Domain | Listing-pattern canonical URLs | Source |
|---|---|---|
| mubawab.ma (largest national portal) | 2,471 | run 29828223264, real, 6 indexes |
| daragadir.com | 1,563 | #4, real |
| soukimmobilier.com | 715 | #4, real |
| atlasimmobilier.com | 431 | #4, real |
| masaken.ma | 318 | #4, real |
| **Confirmed-measured subtotal** | **5,498** | |

The single biggest national portal yields only ~2,471 listing URLs across 6 recent indexes. Even generously extrapolating the remaining (mostly smaller agency) domains, the entire authorized recent-index reservoir is **low-five-figures — an order of magnitude below 100k**.

Reaching 100k would require all of: avito.ma-scale coverage (CDX- and robots-limited), very deep historical Common Crawl indexes (36–60 months / 12+ indexes rather than 6 recent), and qualifying many of the ~700 additional candidate domains documented in Source Discovery Atlas #1 (#7/10). That is a multi-hour, many-request harvest that Common Crawl's CDX API **rate-limits aggressively from this infrastructure** — demonstrated concretely:
- run `29828223264` was rate-limited to 0 on 15 of 16 domains after the first;
- run `29829819356` (with a transport-level-retry fix + 2.5s inter-request pacing) ran 40+ minutes.

**Unblock:** a paced, resumable, checkpointed multi-run historical harvest (12–36 indexes, per-domain/index checkpointing to survive CDX rate-limits) plus qualification of additional Atlas A-class domains — executed over multiple GitHub Actions runs, **after** the WRITE_PATH_BLOCKER is cleared so harvested seeds can be persisted and counted.

## Why this is the correct honest outcome

Per mandate §10.8: after documented inability to reach 100k from the currently-authorized/available reservoirs, produce `HARD_BLOCKER_EVIDENCED` with precise numbers rather than inventing missing data. Per the mandate STOP conditions: a missing, irreplaceable-in-session credential (the deferred Supabase write access) is an explicit hard-blocker. No count was fabricated; the 100k claim is not made.
