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

## 3. Sarouty — SMOKE CERTIFIED / FULL RUN QUEUED

Branch `feat/sarouty-source-first`.
Relevant commits:
- crawl-delay floor: `3aa575f8a12b134b288746895d43c1db30929bb5`
- tests: `13212b8b01fa7521a1cf69106deb2cb9a861f84e`
- bounded runner fix: `e712e05d6a1bbd81c7a81a2518d85a44da40fd03`
- refreshed branch HEAD: `0ad79fdd18627a848757f34b304a0df08f66d2bc`
- full benchmark commit: `36b77cc7801c86f9b24914a2c0aee9798c18db21`
- PR #990 OPEN / DRAFT.

Bounded smoke — run `33690151575` — **SUCCESS**:
- tests **6/6 PASS**
- robots + declared sitemap accessible
- crawlDelaySeconds **10**
- crawlDelayMs **10000**
- sitemapDocCount **1**
- requestCount **2**
- uniqueRealEstateListingCount **0** at root index by design
- queueRemaining **3** child sitemaps
- stoppedEarly `null`
- zeroDbWrites **true**
- artifact `9870484076`
- digest `sha256:713204a0803c27f4729a810fe1a6f1e58312a5911458ec0aa61f2ce637e23a48`

The smoke proves the root index exposes exactly **3 child sitemaps**, so full traversal is bounded to **4 sitemap documents total** under the current sitemap graph.

Full run `33764142715` is **QUEUED** on HEAD `36b77cc7801c86f9b24914a2c0aee9798c18db21`.

## 4. MarocAnnonces — FULL ENUMERATION CERTIFIED / MERGED

Branch `feat/marocannonces-source-first`.
PR #992 **MERGED** into main.
Merge commit `21ec5032c56312e213367c5cacb76b39d5a15a59`.

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

## 5. Agenz — SMOKE PREP PUSHED / RUN QUEUED

Branch `feat/agenz-source-first`:
- enumerator `cbacc8b72a8b976cffc6a5ac0ddd0d11ba915890`
- tests `62c16db5957c3de940f10a7c62c1bf2d413749d3`
- bounded smoke workflow commit `efc56c46b90dc0301ffef0da12f9552f888ceb47`

Verified locally on reconstructed exact branch logic:
- **9/9 tests PASS**;
- robots-first;
- conservative 3s delay floor unless robots requires more;
- numeric listing-ID dedupe;
- 429/hard-block stop;
- zero DB writes.

Live smoke run `33764290049` is **QUEUED**.

# Current artifact union

Using the exact certified artifact URL sets downloaded from Avito and MarocAnnonces:
- Avito URLs: **27,053**
- MarocAnnonces URLs: **10,000**
- exact URL overlap: **0**
- exact URL union: **37,053**

This is a source-scoped URL union only. It is **not** semantic/canonical cross-source property deduplication and does not count as 37,053 usable listings.

# Current doctrine

1. Goal >100k is multi-source.
2. Avito full = **27,053 certified enumerated IDs**.
3. MarocAnnonces full = **10,000 certified enumerated IDs**, merged on main.
4. Current exact artifact URL union Avito + MarocAnnonces = **37,053**.
5. Mubawab bounded = **5,195 IDs on 500 shards** and remains available for deeper replay if required.
6. Sarouty full is the next critical certification.
7. Agenz smoke is queued in parallel.
8. No production bulk writes are authorized.
9. No Vercel deployment is required.

# Next exact

1. finish Sarouty full run `33764142715`; if green, capture exact IDs + artifact/digest, update PR #990, ready/merge/post-merge;
2. finish Agenz smoke `33764290049`; if green, derive a bounded/full scale from observed graph and certify it;
3. extend exact artifact union with Sarouty/Agenz outputs;
4. run listing-detail freshness → canonical extraction → semantic cross-source dedupe → quality → serving;
5. replay Mubawab deeper/full only if union/usable gates require it;
6. certify **10k → 50k → 100k usable**.

No bypass if a source returns a true hard block.

# Remaining sequence

`Sarouty full → PR #990 merge → Agenz smoke/full → multi-source artifact union → listing-detail freshness → canonical extraction → semantic dedupe → quality → 10k → 50k → 100k usable → Mubawab deeper replay if needed → bounded prod-ingestion canary if required → closeout docs → post-merge verification`

## Current handover state

- chantier: **Morocco Web Acquisition / L8 Scale + Coverage**
- Goal: **>100,000 usable canonical Moroccan listings**
- main: `21ec5032c56312e213367c5cacb76b39d5a15a59` before this canonical-only update
- strongest certified enumeration: **Avito full = 27,053 unique IDs**
- second full source: **MarocAnnonces = 10,000 unique IDs**
- current exact artifact URL union: **37,053**
- active sources: **Sarouty + Agenz**
- Sarouty run: `33764142715` — **QUEUED**
- Agenz run: `33764290049` — **QUEUED**
- production DB mutation: **none authorized**
- Vercel: **not required / not authorized**
- strategic blocker: **none**
- Next exact: **Sarouty full result; Agenz smoke in parallel**
- global project percentage: **intentionally unassigned; do not invent one**
