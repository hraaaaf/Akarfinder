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

## 3. Sarouty — MANIFEST CERTIFIED / TARGETED PROPERTY FULL QUEUED

Branch `feat/sarouty-source-first`, PR #990 OPEN / DRAFT.

Safety baseline:
- tests **6/6 PASS**;
- minimum crawl delay **10s**;
- immediate stop on HTTP 429;
- zero DB writes.

Bounded smoke — run `33690151575` — **SUCCESS**:
- robots + declared sitemap accessible;
- crawlDelaySeconds **10** / crawlDelayMs **10000**;
- requestCount **2**;
- stoppedEarly `null`;
- zeroDbWrites **true**;
- artifact `9870484076`;
- digest `sha256:713204a0803c27f4729a810fe1a6f1e58312a5911458ec0aa61f2ce637e23a48`.

Full attempt #1 — run `33764142715` — **INCOMPLETE / DIAGNOSED**:
- workflow failed only at completeness verification;
- sitemapDocCount **4** / requestCount **5**;
- root sitemap index locCount **446**;
- first generic children produced **0** listing IDs;
- queueRemaining **12** / cappedByDocs **true**;
- stoppedEarly `null`, no 429, zeroDbWrites **true**;
- artifact `9896852823`;
- digest `sha256:6f45d48fbf899d28493c87a566e7789fbfe907f463aa50bd09107892b6005b05`.

The earlier inference that the root exposed only three children was disproved by the full attempt. Blind traversal of all declared children is rejected.

Root manifest — run `33765033217` — **SUCCESS**:
- HEAD `6bad4603a9a273670131aac0d2f7690655b6dad7`;
- robotsStatus **200** / rootStatus **200**;
- crawlDelay **10s**;
- rootLocCount / sitemapUrlCount **446**;
- sitemap families:
  - `page-sitemap*.xml`: **438** total including base page sitemap;
  - `post-sitemap.xml`: **1**;
  - `agency-sitemap.xml`: **1**;
  - `property_details*.xml`: **6**;
- zeroDbWrites **true**;
- artifact `9897115870`;
- digest `sha256:c1be815fc97645100fbf776c50946f8b635aa70929393051e44eb9d9bf6c9997`.

Only **6 / 446** declared child sitemaps belong to the property-detail family relevant to L8.

Targeted property full:
- single final commit `c52760742e9418c37567c6b26d7fcfc34a9624b0`;
- dedicated `property_details*.xml` selector + tests + targeted workflow;
- exactly max **6** property sitemaps;
- 10s minimum delay, stop 429, zero writes;
- run `33765427351` — **QUEUED** at last verification.

Certification requires discovered=6, selected=6, requestCount=8, no caps/early-stop, nonzero unique listing count, artifact + digest.

## 4. MarocAnnonces — FULL ENUMERATION CERTIFIED / MERGED

Branch `feat/marocannonces-source-first`.
PR #992 **MERGED** into main.
Merge commit `21ec5032c56312e213367c5cacb76b39d5a15a59`.

Bounded live smoke — run `33738909895` — **SUCCESS**:
- tests **9/9 PASS**;
- robotsStatus **200**;
- delay **3000 ms**;
- requestCount **2** / pageCount **1**;
- **20 unique listing IDs**;
- stoppedEarly `null`;
- zeroDbWrites **true**;
- artifact `9886906086`;
- digest `sha256:abb343fd6253d93b8af494485601d3dc44161a3353baf533bf0ccb5d6230b802`.

Full safe enumeration — run `33739495442` — **SUCCESS**:
- robotsStatus **200**;
- delay **3000 ms**;
- public category pages **546**;
- total requests **547**;
- **10,000 unique listing IDs**;
- queueRemaining **0**;
- stoppedEarly `null`;
- cappedByPages **false** / cappedByListings **false**;
- zeroDbWrites **true**;
- artifact `9888335708`;
- digest `sha256:c23c571acae2863e1dd866126938174af67186da704e3ad30c8bb97fb3bf5bc9`.

This is complete enumeration evidence for the current five residential roots, not yet usable-listing certification.

## 5. Agenz — SMOKE CERTIFIED / FULL IN PROGRESS

Branch `feat/agenz-source-first`, PR #993 OPEN / DRAFT.

Implementation:
- enumerator `cbacc8b72a8b976cffc6a5ac0ddd0d11ba915890`;
- tests `62c16db5957c3de940f10a7c62c1bf2d413749d3`;
- exact suite **9/9 PASS**;
- robots-first, 3s conservative delay floor, 429/hard-block stop, zero writes.

Bounded live smoke — run `33764290049` — **SUCCESS**:
- HEAD `efc56c46b90dc0301ffef0da12f9552f888ceb47`;
- robotsStatus **200**;
- delayMs **3000**;
- pageCount **1** / requestCount **2**;
- **36 unique listing IDs**;
- queueRemaining **123**;
- stoppedEarly `null`;
- zeroDbWrites **true**;
- artifact `9896887028`;
- digest `sha256:03e03acabee3908ba3265b991e20b903a54aed527af647a16e60443e72a5125b`.

Full safe enumeration:
- benchmark HEAD `8aa3101cc8bbbdc833e7eea666fd1226a22d1c80`;
- max 1000 public discovery pages / 50,000 IDs;
- 3s minimum delay, stop 429/hard block, zero writes;
- run `33764930794` — **IN_PROGRESS** at last verification.

Certification requires queueRemaining=0, no caps/early-stop, artifact + digest.

# Current artifact union

Using exact certified artifact URL sets from Avito and MarocAnnonces:
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
6. Sarouty is now narrowed from 446 declared sitemaps to exactly **6 property-detail sitemaps**.
7. Agenz is live-productive: **36 IDs on one page**, full enumeration in progress.
8. No production bulk writes are authorized.
9. No Vercel deployment is required.

# Next exact

1. finish Sarouty targeted property run `33765427351`; if green, record exact IDs/artifact/digest then ready/merge PR #990 and post-merge verify;
2. finish Agenz full run `33764930794`; if green, record exact IDs/artifact/digest then ready/merge PR #993 and post-merge verify;
3. extend exact artifact union with certified Sarouty/Agenz outputs;
4. run listing-detail validity/freshness → canonical extraction → semantic cross-source dedupe → quality → serving;
5. replay Mubawab deeper/full only if union/usable gates require it;
6. certify **10k → 50k → 100k usable**.

No bypass if a source returns a true hard block.

# Remaining sequence

`Sarouty targeted full → PR #990 closeout/merge → Agenz full → PR #993 closeout/merge → multi-source artifact union → listing-detail freshness → canonical extraction → semantic dedupe → quality → 10k → 50k → 100k usable → Mubawab deeper replay if needed → bounded prod-ingestion canary if required → closeout docs → post-merge verification`

## Current handover state

- chantier: **Morocco Web Acquisition / L8 Scale + Coverage**
- Goal: **>100,000 usable canonical Moroccan listings**
- strongest certified enumeration: **Avito full = 27,053 unique IDs**
- second full source: **MarocAnnonces = 10,000 unique IDs**
- current exact artifact URL union: **37,053**
- active sources: **Sarouty + Agenz**
- Sarouty targeted run: `33765427351` — **QUEUED** at last verification
- Agenz full run: `33764930794` — **IN_PROGRESS** at last verification
- production DB mutation: **none authorized**
- Vercel: **not required / not authorized**
- strategic blocker: **none**
- Next exact: **Sarouty targeted full + Agenz full results**
- global project percentage: **intentionally unassigned; do not invent one**
