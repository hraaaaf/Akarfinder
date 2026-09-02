# AKARFINDER — Morocco Web Acquisition L8 — HANDOVER CANONICAL

Status: **ACTIVE**
Last verified: **2026-09-02**

Detailed historical evidence: `docs/AKARFINDER_MOROCCO_WEB_L8_SCALE_COVERAGE.md`.

## Goal

Build and certify **>100,000 usable Moroccan real-estate listings**.

A listing counts only after:
`public enumeration → listing-detail validity → freshness → canonical extraction → cross-source dedupe → quality → serving`.

Raw URL volume, portal counters and raw enumerated IDs do **not** count as final success.

Final gates: **10k → 50k → 100k usable canonical listings**.

## Guardrails

- public content only;
- no CAPTCHA bypass, credential abuse, proxy/fingerprint evasion or blocked-path workaround;
- respect robots and declared crawl delays;
- stop on HTTP 429 / hard block;
- enumeration read-only against production Supabase;
- no bulk production DB mutation without separately authorized bounded canary + rollback proof;
- no Vercel deployment without explicit approval.

## Raw production baseline

Supabase `AqarFinder` / `kusfiyimwvxblvsrhaes`, verified 2026-09-02:
- `discovery_candidates`: **304,933**
- rejected: **142,143**
- unclassified: **137,868**
- accepted: **13,757**
- discovered: **11,165**

Unclassified triage:
- listing-detail candidates: **5,536**
- discovery pages: **44,749**
- obvious noise: **7,420**
- uncertain: **80,163**

Not usable-listing certification.

# Source evidence

## 1. Avito — FULL ENUMERATION CERTIFIED

Core merged PR #989, commit `ef2af49f96aeb8b2b4962d0f90bad8fa35a85452`.

Full safe-manifest proof:
- branch `feat/avito-full-manifest`
- HEAD `4866fe6e33525c24a867b0d7559d438c520ddb84`
- run `33672899097` — **SUCCESS**
- source rows **11,907**
- safe shards **2,505**
- requested **2,505 / 2,505**
- **27,053 unique listing IDs**
- no 429
- zero DB writes
- artifact `9865177626`
- digest `sha256:f952e9e6d57c1752dd2c1762a0bdd95c24e083dfa7bbead7b7a6e8474d0f9836`

27,053 IDs are enumeration evidence, not yet 27,053 usable listings.

## 2. Mubawab — BOUNDED ENUMERATION CERTIFIED

Core merged PR #988, commit `c7306784653339ab942a69403cfaca9a39688973`.

Robots-safe public shard manifest: **3,172**.

Certified:
- 25 shards → **301 IDs** — run `33662143708`
- 100 shards → **663 IDs** — run `33662906605`
- 500 shards → **5,195 IDs** — run `33663293707`
- no 429
- zero DB writes

Full replay deferred until source union shows it is required.

## 3. Sarouty — ACTIVE, LOGIC CERTIFIED / FULL SCALE NOT YET CERTIFIED

Public contract reverified 2026-09-02:
- `robots.txt` public;
- `Crawl-delay: 10` for `User-agent: *`;
- sitemap index declared at `https://www.sarouty.ma/sitemap_index.xml`;
- public listing pages and stable numeric IDs observed.

Branch `feat/sarouty-source-first`.
Relevant commits:
- crawl-delay floor: `3aa575f8a12b134b288746895d43c1db30929bb5`
- tests: `13212b8b01fa7521a1cf69106deb2cb9a861f84e`
- bounded runner fix: `e712e05d6a1bbd81c7a81a2518d85a44da40fd03`
- refreshed branch HEAD: `0ad79fdd18627a848757f34b304a0df08f66d2bc`
- PR #990 OPEN / DRAFT / mergeable at last verification.

Verified logic:
- **6/6 tests PASS** locally from connector-fetched branch content;
- minimum 10-second delay;
- immediate 429 stop;
- zero DB writes.

Current environment limitation:
- web reader rejects sitemap XML because of its `text/xml` wrapper;
- local container DNS cannot resolve Sarouty;
- this is **not evidence of a Sarouty block**.

No full Sarouty unique-ID total is certified yet.

## 4. MarocAnnonces — SOURCE-FIRST PREP CERTIFIED

Public counters observed 2026-09-02:
- Vente immobilier: approximately **18.2k** public ads;
- Location immobilier: approximately **22.7k** public ads;
- sale apartments ~7.7k;
- sale villas/houses/riads ~3.8k;
- sale land ~3.25k;
- rental apartments ~10.1k;
- rental villas/houses/riads ~2.5k.

Counters are not unique/usable certification.

Verified detail identity pattern:
`/categorie/<category_id>/<type>/annonce/<listing_id>/<slug>.html`.

Branch `feat/marocannonces-source-first`:
- enumerator `237467231cbd12aeb5d516f7c49668356e42876f`
- tests `bdc5a6451c41da21d67c18fe0a1467186f9b8425`

Verified locally on reconstructed exact branch logic:
- **9/9 tests PASS**;
- robots-first;
- 3s conservative delay floor unless robots requires more;
- listing-ID dedupe;
- 429/hard-block immediate stop;
- zero DB writes.

Tiny local live probe:
- stopped at `robots_http_0`;
- requestCount **1**;
- zero DB writes.

This is container DNS/network failure, not evidence MarocAnnonces blocked AkarFinder.

## 5. Agenz — SOURCE-FIRST PREP CERTIFIED

Public evidence observed:
- **1,529 apartments for sale in Casablanca** on an indexed Agenz result page;
- **1,104 rental listings in Casablanca** on an indexed Agenz result page;
- stable numeric listing-detail pattern, e.g. `/fr/annonces/immo-casablanca/vente-appartements/2-mars/540241`.

These counters are discovery evidence only.

Branch `feat/agenz-source-first`:
- enumerator `cbacc8b72a8b976cffc6a5ac0ddd0d11ba915890`
- tests `62c16db5957c3de940f10a7c62c1bf2d413749d3`

Verified locally on reconstructed exact branch logic:
- **9/9 tests PASS**;
- robots-first;
- conservative 3s delay floor unless robots requires more;
- discovery-link recursion;
- numeric listing-ID dedupe;
- 429/hard-block stop;
- zero DB writes.

Tiny local live probe:
- stopped at `robots_http_0`;
- requestCount **1**;
- zero DB writes.

Again, this is local DNS/network failure, not evidence Agenz blocked AkarFinder.

# Current doctrine

1. Goal >100k is multi-source.
2. Avito is frozen at **27,053 certified enumerated IDs**.
3. Mubawab remains productive and available for deeper replay if union requires it.
4. Sarouty remains active and should be fully enumerated when a compliant XML-capable execution channel is available.
5. MarocAnnonces is the strongest new source candidate by public counters (~40k sale+rent section volume before dedupe/freshness).
6. Agenz is smaller but complementary and has clean public detail URLs.
7. No production bulk writes are authorized.
8. No Vercel deployment is required.

# Next exact

**Critical path:**
1. obtain a compliant network execution channel for MarocAnnonces/Agenz robots + public category probes;
2. if productive, run bounded samples then full safe public enumeration;
3. finish Sarouty sitemap enumeration;
4. measure union: Avito + Sarouty + MarocAnnonces + Agenz + certified Mubawab;
5. freshness → canonical extraction → cross-source dedupe → quality → serving;
6. certify **10k → 50k → 100k usable**.

No bypass if a source returns a true hard block.

# Remaining sequence

`MarocAnnonces/Agenz public certification ↔ Sarouty certification → multi-source union → Mubawab deeper replay if needed → freshness → extraction → dedupe → quality → 10k → 50k → 100k usable → bounded prod-ingestion canary if required → closeout docs → merge/post-merge verification`

## Current handover state

- chantier: **Morocco Web Acquisition / L8 Scale + Coverage**
- Goal: **>100,000 usable canonical Moroccan listings**
- strongest certified enumeration: **Avito full = 27,053 unique IDs**
- active sources: **Sarouty + MarocAnnonces + Agenz**
- source-prep tests: Sarouty **6/6**, MarocAnnonces **9/9**, Agenz **9/9**
- production DB mutation: **none authorized**
- Vercel: **not required / not authorized**
- strategic blocker: **none**
- execution blocker: current local container cannot resolve target domains; web channel can verify public pages but not raw XML/robots uniformly
- Next exact: **public network certification of MarocAnnonces/Agenz, then full safe enumeration; finish Sarouty in parallel**
- global project percentage: **intentionally unassigned; do not invent one**
