# Source Discovery Atlas #1 — AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#7/10)

**Method:** read-only survey of `discovery_candidates` (8,013 rows, live Supabase) — the organic domain surfacing already produced by the existing OpenSERP + Yandex/SearXNG discovery channels. No new scraping, no new fetches.

## Headline numbers

- **745** distinct domains observed in `discovery_candidates`
- **21** already registered (`source-domain-registry.json`)
- **725** unregistered candidates — the Atlas raw dataset (`source-discovery-atlas-1-raw-domains.json`)
- **23** manually reviewed in depth this pass
- **2** classified A and registered: `aykana.ma` (Rabat), `promoimmomarrakech.com` (Marrakech)
- **15** classified B (real estate site, individual-listing pattern not yet confidently proven)
- **6** classified C (excluded — not a listing portal, or a meta-aggregator)

## Signal choice

`discovery_status = accepted` only occurs for domains **already** in the registry — it's not a useful ranking signal for new candidates. `unclassified` (a real-estate-scoped query surfaced the domain, but no registry pattern yet exists to admit/reject it) is the right signal. Ranking by raw volume alone mostly surfaces noise (facebook.com, youtube.com, generic forums) since it also counts explicit rejections.

## The 2 registered (class A)

| Domain | Pattern | Coverage | Proof |
|---|---|---|---|
| `aykana.ma` | `^/property/[^/]+$` | Rabat | 3 real positive + 2 real negative examples (word-boundary excludes `/property-type/` category pages) |
| `promoimmomarrakech.com` | `^/produit/[^/]+/[^/]+\.html$` | Marrakech | 3 real positive + 2 real negative examples (top-level category pages excluded) |

13 tests, all passing. No bulk seed, no query-universe change — pattern admission only.

## Notable B candidates (real estate, pattern not yet proven)

`domio.ma` (134 total / 53 unclassified, the highest-volume unregistered candidate), `essaouira.immo`, `nador.immo` (one URL has a clean numeric ID, promising), `capalmrabat.com` (individual listings confirmed but no numeric ID — same risk profile as daragadir.com, already flagged LOW stability in #4/10), plus 11 others — all genuine real estate sites where the sampled rows didn't yet yield a confident, provable individual-listing regex. Documented, not activated.

## Notable exclusions (class C)

- **`kaynly.com`** — explicitly a meta-aggregator ("recensées sur Kaynly depuis 5 portails marocains"). Registering it would double-count listings already sourced from the primary portals it aggregates.
- **`rahalatmorocco.com`** — mixed travel/car-rental portal, not primarily real estate.
- **`marocmarrakech.com`, `riads-maroc.com`, `riadaumaroc.com`** — editorial/informational content about riads, not listing portals.

## What this mission did NOT do

- Did not force 100 A-class registrations — quality over quantity, per the mandate.
- Did not touch the query universe (Section 7.4) for the 2 new domains — pattern admission only, activation is a separate future step.
- Did not review all 725 domains at full audit depth — the remaining ~700 are preserved in the raw data file for a future pass.
