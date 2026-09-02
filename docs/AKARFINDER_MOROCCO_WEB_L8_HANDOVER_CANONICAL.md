# AKARFINDER — Morocco Web Acquisition L8 — HANDOVER CANONICAL

Status: **ACTIVE**

Last verified: **2026-09-02**

This is the canonical restart / handover entrypoint for L8. Detailed evidence remains in `docs/AKARFINDER_MOROCCO_WEB_L8_SCALE_COVERAGE.md`.

## Goal

Build and certify **more than 100,000 usable Moroccan real-estate listings** from public web inventory.

Raw discovery URLs or raw enumerated IDs do **not** count. A listing counts only after:
1. public source-first enumeration;
2. listing-detail validity;
3. active/fresh validation;
4. canonical extraction with source evidence;
5. cross-source dedupe;
6. quality admission;
7. serve admission.

Final gates: **10k → 50k → 100k usable canonical listings**.

## Guardrails

- Public content only.
- No CAPTCHA bypass, credential abuse, proxy/fingerprint evasion or blocked-path workaround.
- Respect robots rules and declared crawl delays.
- Stop on HTTP 429 / hard block.
- L8 enumeration is read-only against production Supabase.
- No bulk production DB mutation without a separately authorized bounded canary + rollback proof.
- No Vercel deployment without explicit human approval.

## Production raw corpus baseline

Verified 2026-09-02 in Supabase project `AqarFinder` / `kusfiyimwvxblvsrhaes`:
- total `discovery_candidates`: **304,933**
- rejected: **142,143**
- unclassified: **137,868**
- accepted: **13,757**
- discovered: **11,165**

Supporting unclassified triage:
- 5,536 listing-detail candidates
- 44,749 discovery pages
- 7,420 obvious noise
- 80,163 uncertain

These counts are not usable-listing certification.

Critical path:
`productive source → public shard/sitemap manifest → listing IDs/URLs → freshness → extraction → dedupe → quality → serving`

# Certified sources

## Mubawab

Core merged via PR #988, commit `c7306784653339ab942a69403cfaca9a39688973`.

Robots-safe public shard manifest: **3,172**.

Certified gates:
- 25 shards → **301 unique IDs** — run `33662143708`
- 100 shards → **663 unique IDs** — run `33662906605`
- 500 shards → **5,195 unique IDs** — run `33663293707`
- no 429; zero DB writes.

Full Mubawab remains deferred until multi-source union shows it is needed.

## Avito — FULL ENUMERATION CERTIFIED

Core merged via PR #989, commit `ef2af49f96aeb8b2b4962d0f90bad8fa35a85452`.

Declared sitemap returned 403 from GitHub runner; no bypass attempted. Public discovery shards only.

Full safe manifest result:
- branch `feat/avito-full-manifest`
- HEAD `4866fe6e33525c24a867b0d7559d438c520ddb84`
- run `33672899097` — **SUCCESS**
- source rows: **11,907**
- safe shards: **2,505**
- selected/requested: **2,505 / 2,505**
- **27,053 unique real-estate listing IDs**
- stoppedEarly: `null`
- no HTTP 429
- zero DB writes
- artifact `9865177626`
- digest `sha256:f952e9e6d57c1752dd2c1762a0bdd95c24e083dfa7bbead7b7a6e8474d0f9836`

Important: 27,053 enumerated IDs are not yet 27,053 usable canonical listings.

# Active source — Sarouty

Public contract reverified 2026-09-02:
- `https://www.sarouty.ma/robots.txt` responds publicly;
- `User-agent: *` has `Crawl-delay: 10`;
- declared sitemap index: `https://www.sarouty.ma/sitemap_index.xml`.

Public listing pages are live and indexed. Verified identity formats remain:
- SEO transaction URL ending `-<listing_id>/`
- `property-details/?listing_id=<id>`
- legacy `/plp/...-<id>.html`.

Implementation state:
- branch `feat/sarouty-source-first`
- crawl-delay floor fix commit `3aa575f8a12b134b288746895d43c1db30929bb5`
- test commit `13212b8b01fa7521a1cf69106deb2cb9a861f84e`
- bounded smoke runner correction `e712e05d6a1bbd81c7a81a2518d85a44da40fd03`
- refreshed branch HEAD `0ad79fdd18627a848757f34b304a0df08f66d2bc`
- PR #990 OPEN / DRAFT / mergeable at last verification.

Verified unit logic:
- 6/6 tests PASS locally from connector-fetched branch content;
- minimum 10-second delay enforced even if robots declares less;
- immediate 429 stop;
- zero DB writes.

Current limitation:
- the web fetcher can read robots but rejects the sitemap index because of its `text/xml` wrapper;
- local container DNS cannot resolve Sarouty;
- this is an environment limitation, **not evidence of a Sarouty block**.

No full Sarouty scale result is certified yet.

# Parallel source — MarocAnnonces

Public market evidence reverified 2026-09-02:
- Vente immobilier section: approximately **18.2k active public ads**;
- Location immobilier section: approximately **22.7k active public ads**;
- examples: sale apartments ~7.7k, sale villas/houses/riads ~3.8k, sale land ~3.25k, rental apartments ~10.1k, rental villas/houses/riads ~2.5k.

These are portal counters, not unique/usable certification.

Verified detail identity pattern:
`/categorie/<category_id>/<type>/annonce/<listing_id>/<slug>.html`

Examples observed publicly include listing IDs `10229450`, `10288297`, `7513995`.

Implementation started:
- branch `feat/marocannonces-source-first`
- enumerator commit `237467231cbd12aeb5d516f7c49668356e42876f`
- tests commit `bdc5a6451c41da21d67c18fe0a1467186f9b8425`

Enumerator contract:
- public pages only;
- starts with five major residential roots: sale apartments, sale villas/houses/riads, sale land, rental apartments, rental villas/houses/riads;
- reads robots first;
- conservative delay floor 3s when no larger crawl delay is declared;
- dedupe by listing ID;
- stop on 429 or verification/CAPTCHA hard-block content;
- zero DB writes;
- no bypass.

Tests are written but **not yet execution-certified**. No MarocAnnonces scale count is certified yet.

# Decisions

1. Goal >100k is explicitly **multi-source**.
2. Raw candidate volume does not count.
3. Avito full is frozen as certified enumeration evidence at **27,053 unique IDs**.
4. Do not waste another Avito benchmark.
5. Sarouty remains active, but environment-specific XML access does not justify stalling L8.
6. MarocAnnonces is now developed in parallel because public inventory is materially large.
7. Agenz remains next fallback/source after MarocAnnonces if needed.
8. Mubawab full replay remains deferred until union measurement.
9. No production bulk write is authorized.
10. No Vercel deployment is required.

# Next exact

1. Execute/certify MarocAnnonces unit tests.
2. Perform a tiny read-only public probe respecting robots; if hard-blocked, record and stop without evasion.
3. If productive, enumerate a bounded sample then full safe public category inventory.
4. Finish Sarouty enumeration whenever its declared sitemap is reachable through a compliant execution channel.
5. Measure union: Avito + Sarouty + MarocAnnonces + certified Mubawab IDs/URLs.
6. Apply freshness → canonical extraction → cross-source dedupe → quality → serving.
7. Certify **10k → 50k → 100k usable**.

# Remaining sequence

`MarocAnnonces certification ↔ Sarouty certification → Agenz if needed → multi-source union → freshness → canonical extraction → cross-source dedupe → quality → 10k usable → 50k usable → 100k usable → bounded production-ingestion plan/canary if required → closeout docs → merge/post-merge verification`

# Human gates

Stop only for:
- bulk production DB mutation / ingestion apply;
- Vercel deployment;
- irreversible production-critical action.

Read-only research, enumeration, tests, branch work, docs, safe PRs and merges may continue autonomously.

## Current handover state

- chantier: **Morocco Web Acquisition / L8 Scale + Coverage**
- Goal: **>100,000 usable canonical Moroccan listings**
- strongest certified enumeration: **Avito full = 27,053 unique IDs**
- active sources: **Sarouty + MarocAnnonces**
- production DB mutation: **none authorized**
- Vercel: **not required / not authorized**
- strategic blocker: **none**
- Next exact: **execute/certify MarocAnnonces tests, then tiny public probe; continue Sarouty when compliant XML access is available**
- global project percentage: **intentionally unassigned; do not invent one**
