# AKARFINDER — Morocco Web Acquisition L8 — HANDOVER CANONICAL

Status: **ACTIVE**
Last verified: **2026-09-03**

Detailed historical evidence: `docs/AKARFINDER_MOROCCO_WEB_L8_SCALE_COVERAGE.md`.

## Goal

Build and certify **>100,000 usable Moroccan real-estate listings**.

A listing counts only after:
`public enumeration → listing-detail validity → freshness → canonical extraction → cross-source dedupe → quality → serving`.

Raw portal counters, raw URLs and raw enumerated IDs do **not** count as final success.

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

These are not usable-listing certification.

# Source evidence

## 1. Avito — FULL ENUMERATION CERTIFIED

- core merged PR #989, commit `ef2af49f96aeb8b2b4962d0f90bad8fa35a85452`
- full branch HEAD `4866fe6e33525c24a867b0d7559d438c520ddb84`
- run `33672899097` — **SUCCESS**
- safe manifest **2,505 / 2,505**
- **27,053 unique listing IDs**
- no 429
- zero DB writes
- artifact `9865177626`
- digest `sha256:f952e9e6d57c1752dd2c1762a0bdd95c24e083dfa7bbead7b7a6e8474d0f9836`

27,053 IDs are enumeration evidence, not yet 27,053 usable listings.

## 2. Mubawab — BOUNDED ENUMERATION CERTIFIED

- core merged PR #988, commit `c7306784653339ab942a69403cfaca9a39688973`
- robots-safe manifest **3,172 shards**
- 25 shards → **301 IDs**
- 100 shards → **663 IDs**
- 500 shards → **5,195 IDs**
- no 429
- zero DB writes

Full replay deferred until union measurement shows it is required.

## 3. Sarouty — LOGIC CERTIFIED / FULL SCALE PENDING

Public contract:
- robots public;
- `Crawl-delay: 10` for wildcard agent;
- sitemap index declared;
- stable numeric listing IDs observed.

Branch `feat/sarouty-source-first`, refreshed HEAD `0ad79fdd18627a848757f34b304a0df08f66d2bc`, PR #990.

Verified logic:
- **6/6 tests PASS**;
- minimum 10-second delay;
- immediate 429 stop;
- zero DB writes.

No full unique-ID total certified yet.

## 4. MarocAnnonces — PUBLIC ACCESS VERIFIED / SCALE PENDING

### Public web proof — 2026-09-03

Fresh public pages are accessible through the web channel without authentication or bypass.

Observed current section counters:
- Vente immobilier: **18,263** public ads on a page crawled 2026-09-03;
- Location immobilier: **22,706** public ads on a page crawled 2026-09-03;
- sale apartments page: **7,719** apartments within ~18.2k sale inventory.

These counters are discovery evidence only and are not unique/usable certification.

Observed HTML detail hrefs expose stable numeric IDs, including:
- `10277023` under a sale apartment detail href;
- `10381609` under a rental apartment detail href.

Verified identity contract remains `/annonce/<listing_id>/` anywhere inside the MarocAnnonces category path. The current parser correctly accepts both observed nested-category href forms.

Branch `feat/marocannonces-source-first`:
- enumerator `237467231cbd12aeb5d516f7c49668356e42876f`
- original tests `bdc5a6451c41da21d67c18fe0a1467186f9b8425`
- observed-ID fixture update `c963df926f4de692f6a003a082b543abc4f9e0d9`
- PR #992 DRAFT.

Verification:
- previous reconstructed branch suite **9/9 PASS**;
- observed real-world ID fixtures **3/3 PASS** against the exact parser regex;
- robots-first;
- conservative 3s floor unless robots requires more;
- listing-ID dedupe;
- immediate 429/hard-block stop;
- zero DB writes.

Important: public page accessibility is now verified. A compliant robots fetch + bounded enumeration run is still required before claiming a MarocAnnonces unique-ID scale total.

## 5. Agenz — SOURCE-FIRST PREP CERTIFIED / LIVE SCALE PENDING

Public evidence previously observed:
- **1,529** apartments for sale in Casablanca;
- **1,104** rental listings in Casablanca;
- stable numeric detail pattern, e.g. `/fr/annonces/immo-casablanca/vente-appartements/2-mars/540241`.

Branch `feat/agenz-source-first`:
- enumerator `cbacc8b72a8b976cffc6a5ac0ddd0d11ba915890`
- tests `62c16db5957c3de940f10a7c62c1bf2d413749d3`
- PR #993 DRAFT.

Verified reconstructed branch logic: **9/9 PASS**, robots-first, conservative delay, numeric-ID dedupe, immediate 429/hard-block stop, zero DB writes.

No Agenz unique-ID scale total certified yet.

# Current doctrine

1. Goal >100k is explicitly multi-source.
2. Avito is frozen at **27,053 certified enumerated IDs**.
3. Mubawab remains a productive reserve.
4. MarocAnnonces is now **public-access verified** and is the strongest next reservoir by observed section volume (~41k sale+rent before dedupe/freshness).
5. Sarouty remains active but requires sitemap-capable execution for full enumeration.
6. Agenz remains complementary.
7. No production bulk writes are authorized.
8. No Vercel deployment is required.

# Next exact

1. **MarocAnnonces:** obtain robots response through a compliant raw-network runner, then run a tiny bounded category enumeration; if no hard block/429, expand to safe full public enumeration and record exact unique IDs + artifact/digest.
2. **Sarouty:** finish sitemap enumeration under the verified 10-second delay.
3. **Agenz:** perform equivalent bounded public certification.
4. Measure union: Avito + MarocAnnonces + Sarouty + Agenz + certified Mubawab.
5. Freshness → canonical extraction → cross-source dedupe → quality → serving.
6. Certify **10k → 50k → 100k usable**.

No bypass if a source returns a true hard block.

# Remaining sequence

`MarocAnnonces bounded/full enumeration ↔ Sarouty full enumeration ↔ Agenz certification → source union → Mubawab deeper replay if needed → freshness → extraction → dedupe → quality → 10k → 50k → 100k usable → bounded prod-ingestion canary if required → closeout docs → merge/post-merge verification`

## Current handover state

- chantier: **Morocco Web Acquisition / L8 Scale + Coverage**
- Goal: **>100,000 usable canonical Moroccan listings**
- strongest certified enumeration: **Avito full = 27,053 unique IDs**
- active sources: **MarocAnnonces + Sarouty + Agenz**
- MarocAnnonces public access: **VERIFIED 2026-09-03**
- source-prep tests: Sarouty **6/6**, MarocAnnonces **9/9 + 3/3 observed-ID fixtures**, Agenz **9/9**
- production DB mutation: **none authorized**
- Vercel: **not required / not authorized**
- strategic blocker: **none**
- execution blocker: raw robots/full crawling still needs a compliant network runner; public HTML access itself is proven for MarocAnnonces
- Next exact: **MarocAnnonces robots + bounded enumeration → full safe enumeration; Sarouty/Agenz in parallel**
- global project percentage: **intentionally unassigned; do not invent one**
