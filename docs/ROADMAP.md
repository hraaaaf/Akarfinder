# AkarFinder — Active Roadmap

Updated: 2026-07-23

This roadmap is strategic and evidence-based. It does not use a fake global completion percentage.

Historical mission completion belongs in Git/PR history, not in the active roadmap.

---

## North Star

Build the most useful real-estate search and intelligence index for Morocco.

Success = **coverage × freshness × quality × deduplication × relevance**.

The long-term architecture target is a Moroccan Property Graph connecting properties, source offers, observations, professionals, projects, neighborhoods, market context and user intent.

---

# Track A — Canonical property and intelligence foundation

## Status: foundation implemented, continuous hardening

Implemented foundations include:

- Property Schema V1 / Project Schema V1;
- weighted completeness and dynamic partner onboarding;
- Analysis Contract V1;
- unified structured listing intelligence pipeline;
- Freshness & Provenance V2;
- Market Intelligence V2;
- Anomaly Engine V1;
- Multi-source Property Intelligence V1;
- explainable AkarScore V2;
- safe Public SERP Intelligence V1;
- Property Detail V2.

### Next

- increase real evidence coverage rather than inventing values;
- improve benchmark freshness/segmentation/sample transparency;
- strengthen conservative Property Graph clustering;
- measure intelligence coverage on real Production inventory;
- keep public wording aligned with claim-strength contracts.

---

# Track B — Search quality and result depth

## Status: core implemented, scaling/quality active

Implemented foundations include:

- structured DB search;
- Search Gateway external results;
- thin-index seed results;
- source-aware result boundaries;
- server-side filtering;
- deeper structured index scanning and load-more/cursor behavior;
- safe SERP intelligence for eligible structured listings.

### Next

1. measure search relevance on representative Moroccan queries;
2. measure result depth by city/district/type/transaction;
3. improve cross-source duplicate handling without false merges;
4. monitor latency as corpus grows;
5. activate a dedicated search engine only when measured scale/performance justifies it;
6. preserve one ranking contract across DB and any future dedicated engine.

---

# Track C — National acquisition and 100K+ scale

## Status: active scale program; target not yet a claim of completion

Implemented foundations include:

- National Query Universe V2;
- 50+ city/regional acquisition geography;
- OpenSERP/Yandex discovery lane;
- public sitemap seed lane;
- Common Crawl CDX URL-index seed lane;
- direct feed capability;
- source registry governance;
- seed freshness/confirmation;
- bounded seed-to-listing confirmation;
- thin-index search representation;
- Common Crawl canary-first/fail-soft flow.

### Scale targets

Working strategic targets include:

- 100k+ useful observations/representations;
- a large deduplicated unique-property/cluster corpus.

These targets are not considered achieved without current database evidence.

### Next

1. measure the live funnel by lane:
   - discovered;
   - qualified seed;
   - confirmed;
   - structured/admitted;
   - searchable;
   - fresh;
2. increase high-yield reviewed sources without relaxing policy;
3. improve seed-confirmation yield;
4. expand vetted URL-pattern/source coverage;
5. improve national geographic balance;
6. prevent stale volume from inflating coverage claims;
7. keep acquisition costs and external-provider dependency bounded.

---

# Track D — Property Graph and deduplication

## Status: conservative foundations implemented; high-value ongoing work

Goal:

**one potential physical property → one canonical cluster → N offers/observations**

### Next

- expand deterministic/explicit identifiers;
- develop evidence-backed cross-source matching;
- measure false-positive/false-negative rates;
- preserve contradictory offers instead of flattening them;
- introduce human-review workflows where ambiguity remains;
- never treat legacy heuristic duplicate groups as validated physical identity.

---

# Track E — Consumer personalization and continuity

## Status: strong V1 foundations implemented

Implemented:

- Dynamic Search Profile V2;
- personalized Property Fit/ranking;
- deterministic Companion state machine;
- direct-search vs guided-search homepage orchestration;
- consumer auth/session;
- `Mon Projet` continuity models and workspace.

### Next

- connect all relevant search interactions into one coherent project lifecycle;
- improve preference learning with explicit provenance/confidence;
- strengthen alerts/saved-search usefulness;
- make comparison/elimination flows visible and actionable;
- validate that personalization improves result quality rather than merely adding UI complexity.

---

# Track F — Professional supply and monetization

## Status: platform foundation implemented; commercial activation requires real partners/evidence

Implemented foundations:

- professional auth;
- organizations/memberships/roles;
- ownership claims;
- professional profiles/projects;
- seven-step partner property onboarding;
- submissions/media rights;
- staff activation/review;
- organization-scoped lead/dashboard foundations.

### Next

1. onboard real pilot agencies/promoters with explicit authorization;
2. validate feed/onboarding usability on real inventory;
3. verify media and publication rights operationally;
4. measure lead quality and professional value;
5. define commercial packages from real pilot evidence;
6. keep Gold/Premium/sponsored logic separate from objective ranking and scores.

---

# Track G — Neighborhood and market intelligence

## Status: V2 architecture/reference foundation implemented; evidence coverage incomplete by design

Implemented foundations include a national neighborhood reference architecture and retained market seed data.

Unsupported dimensions remain unknown rather than fabricated.

### Next

- enrich priority cities/neighborhoods with sourced evidence;
- version and date every benchmark/reference;
- expose only public-safe claims;
- improve city/district alias quality;
- expand market references by transaction/property segment when evidence supports it.

---

# Track H — Arabic, RTL and accessibility

## Status: requires current end-to-end certification

Arabic signals exist in acquisition/query logic, but product launch readiness requires actual full-journey evidence.

### Gate

Verify at least the core journey across:

- homepage/search entry;
- Search;
- property result/detail where applicable;
- Companion/Search Profile;
- authentication/Mon Projet;
- professional critical paths where exposed.

Validate:

- Arabic content;
- RTL layout;
- mobile/tablet/desktop;
- no broken mixed-direction components;
- accessible interactions.

---

# Track I — SEO and public discovery

## Status: foundations exist; quality-first expansion

Existing SEO surfaces include city/neighborhood-style routes and structured content foundations.

### Next

- prioritize useful pages with real search intent;
- connect SEO pages to the actual search index;
- avoid thin/generated pages;
- keep market/neighborhood claims evidence-backed;
- measure indexed pages, impressions, CTR and search-to-product conversion;
- develop authority through useful market data and professional/project pages.

---

# Track J — Production and launch readiness

## Status: evidence gate, not a coding checkbox

A Final Production Gate foundation exists.

Before a launch GO, verify current evidence for:

1. Data
2. Intelligence
3. UX
4. Business
5. Technical reliability/security
6. Production deployment

### Immediate launch sequence

1. identify exact release candidate on `main`;
2. confirm canonical CI green;
3. verify Supabase schema/data/flags;
4. certify core FR + AR/RTL journeys;
5. certify mobile/tablet/desktop visuals;
6. perform deliberate Production deployment under the phase-release policy;
7. run live smoke and data-quality checks;
8. issue explicit GO/NO-GO from evidence.

---

# Priority order from this consolidation

## P0 — Truth and launch safety

- Production truth audit;
- current migrations/flags/deployment verification;
- Arabic/RTL core-journey certification;
- responsive visual certification.

## P1 — Useful national coverage

- acquisition funnel metrics;
- freshness;
- reviewed source expansion;
- seed confirmation yield;
- search result depth.

## P2 — Quality moat

- Property Graph/deduplication;
- market/neighborhood evidence;
- explainable intelligence coverage;
- personalized relevance.

## P3 — Commercial proof

- real professional pilots;
- authorized structured inventory;
- measurable qualified demand/leads;
- evidence-based pricing/packages.

## P4 — Scale optimization

- dedicated search provider if warranted;
- performance/cost optimization;
- deeper automation and monitoring without weakening governance.

---

## Definition of done for any roadmap item

An item is not complete because code exists.

Completion requires the appropriate combination of:

- implementation;
- tests/build;
- migration application when needed;
- real data when needed;
- feature flag state;
- UI integration;
- Production deployment when required;
- live validation;
- documentation update.

Use `CURRENT_STATE.md` for the latest consolidated implementation snapshot and Git/Production evidence for exact current status.