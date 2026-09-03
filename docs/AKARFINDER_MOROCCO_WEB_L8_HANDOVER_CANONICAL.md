# AKARFINDER — Morocco Web Acquisition L8 — HANDOVER CANONICAL

Status: **ACTIVE**
Last verified: **2026-09-03**

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

Certified:
- 25 shards → **301 IDs** — run `33662143708`
- 100 shards → **663 IDs** — run `33662906605`
- 500 shards → **5,195 IDs** — run `33663293707`
- no 429
- zero DB writes

Full replay deferred until source union shows it is required.

## 3. Sarouty — ACTIVE, LOGIC CERTIFIED / FULL SCALE NOT YET CERTIFIED

Branch `feat/sarouty-source-first`.
Relevant commits:
- crawl-delay floor: `3aa575f8a12b134b288746895d43c1db30929bb5`
- tests: `13212b8b01fa7521a1cf69106deb2cb9a861f84e`
- bounded runner fix: `e712e05d6a1bbd81c7a81a2518d85a44da40fd03`
- refreshed branch HEAD: `0ad79fdd18627a848757f34b304a0df08f66d2bc`
- PR #990 OPEN / DRAFT.

Verified logic:
- **6/6 tests PASS**;
- minimum 10-second delay;
- immediate 429 stop;
- zero DB writes.

No full Sarouty unique-ID total is certified yet.

## 4. MarocAnnonces — FULL ENUMERATION CERTIFIED

Branch `feat/marocannonces-source-first`.
PR #992.

Implementation:
- enumerator `237467231cbd12aeb5d516f7c49668356e42876f`
- tests `bdc5a6451c41da21d67c18fe0a1467186f9b8425`
- observed public-ID fixtures `c963df926f4de692f6a003a082b543abc4f9e0d9`
- bounded smoke workflow `8127f1f15ab56baa7117a642c8c8bf398f0b2130`
- full benchmark commit `6b87c05eec27b731ae7b4379d9ae9a00b49cf115`

Bounded live smoke — run `33738909895` — **SUCCESS**:
- tests **9/9 PASS**
- robotsStatus **200**
- delay **3000 ms**
- requestCount **2**
- pageCount **1**
- **20 unique listing IDs**
- stoppedEarly `null`
- zeroDbWrites **true**
- artifact `9886906086`
- digest `sha256:abb343fd6253d93b8af494485601d3dc44161a3353baf533bf0ccb5d6230b802`

Full safe enumeration — run `33739495442` — **SUCCESS**:
- robotsStatus **200**
- delay **3000 ms**
- public category pages **546**
- total requests **547**
- **10,000 unique listing IDs**
- queueRemaining **0**
- stoppedEarly `null`
- cappedByPages **false**
- cappedByListings **false**
- zeroDbWrites **true**
- artifact `9888335708`
- digest `sha256:c23c571acae2863e1dd866126938174af67186da704e3ad30c8bb97fb3bf5bc9`

This certifies complete traversal of the enumerator's five residential roots under the current public pagination graph. It does **not** certify 10,000 usable canonical listings yet.

## 5. Agenz — SOURCE-FIRST PREP CERTIFIED

Branch `feat/agenz-source-first`:
- enumerator `cbacc8b72a8b976cffc6a5ac0ddd0d11ba915890`
- tests `62c16db5957c3de940f10a7c62c1bf2d413749d3`

Verified locally on reconstructed exact branch logic:
- **9/9 tests PASS**;
- robots-first;
- conservative 3s delay floor unless robots requires more;
- numeric listing-ID dedupe;
- 429/hard-block stop;
- zero DB writes.

# Current doctrine

1. Goal >100k is multi-source.
2. Avito full = **27,053 certified enumerated IDs**.
3. MarocAnnonces full = **10,000 certified enumerated IDs**.
4. Mubawab bounded = **5,195 IDs on 500 shards** and remains available for deeper replay if required.
5. Sarouty remains the next scale source to certify.
6. Agenz is complementary.
7. No production bulk writes are authorized.
8. No Vercel deployment is required.

# Next exact

1. merge/close MarocAnnonces PR #992 after post-certification metadata is aligned;
2. finish Sarouty source-first/full certification;
3. certify Agenz live/full if productive;
4. measure multi-source union using exact artifact URL sets where available;
5. run freshness → canonical extraction → cross-source dedupe → quality → serving;
6. certify **10k → 50k → 100k usable**.

No bypass if a source returns a true hard block.

# Remaining sequence

`MarocAnnonces closeout/merge → Sarouty certification → Agenz certification → multi-source union → Mubawab deeper replay if needed → freshness → extraction → dedupe → quality → 10k → 50k → 100k usable → bounded prod-ingestion canary if required → closeout docs → post-merge verification`

## Current handover state

- chantier: **Morocco Web Acquisition / L8 Scale + Coverage**
- Goal: **>100,000 usable canonical Moroccan listings**
- strongest certified enumeration: **Avito full = 27,053 unique IDs**
- second full source: **MarocAnnonces = 10,000 unique IDs**
- active sources: **Sarouty + Agenz**
- production DB mutation: **none authorized**
- Vercel: **not required / not authorized**
- strategic blocker: **none**
- Next exact: **close PR #992 then finish Sarouty certification**
- global project percentage: **intentionally unassigned; do not invent one**
