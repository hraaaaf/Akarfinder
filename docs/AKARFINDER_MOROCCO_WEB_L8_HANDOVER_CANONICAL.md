# AKARFINDER — Morocco Web Acquisition L8 — HANDOVER CANONICAL

Status: **ACTIVE**
Last verified: **2026-09-03**

Detailed historical evidence: `docs/AKARFINDER_MOROCCO_WEB_L8_SCALE_COVERAGE.md`.

## Goal
Build and certify **>100,000 usable Moroccan real-estate listings**.

A listing counts only after:
`public enumeration → listing-detail validity → freshness → canonical extraction → cross-source dedupe → quality → serving`.

Raw counters, URLs and enumerated IDs do **not** count as final success. Final gates: **10k → 50k → 100k usable canonical listings**.

## Guardrails
- public content only;
- respect robots and declared crawl delays;
- stop on HTTP 429 / hard block;
- no CAPTCHA/private-API/proxy/fingerprint bypass;
- enumeration read-only; no production DB bulk mutation without separately authorized bounded canary + rollback proof;
- no Vercel deployment without explicit approval.

## Production raw baseline — 2026-09-02
`discovery_candidates` **304,933**: rejected **142,143**, unclassified **137,868**, accepted **13,757**, discovered **11,165**. Not usable certification.

# Certified source evidence

## Avito — FULL CERTIFIED
- core merged PR #989, commit `ef2af49f96aeb8b2b4962d0f90bad8fa35a85452`
- full run `33672899097` — **SUCCESS**
- **27,053 unique listing IDs**
- 2,505/2,505 safe shards requested; no 429; zero DB writes
- artifact `9865177626`
- digest `sha256:f952e9e6d57c1752dd2c1762a0bdd95c24e083dfa7bbead7b7a6e8474d0f9836`

## Mubawab — BOUNDED CERTIFIED
- core merged PR #988, commit `c7306784653339ab942a69403cfaca9a39688973`
- 25 shards → **301 IDs** — `33662143708`
- 100 shards → **663 IDs** — `33662906605`
- 500 shards → **5,195 IDs** — `33663293707`
- no 429; zero writes
- deeper replay deferred until union/usable gates require it.

## Sarouty — FULL PROPERTY ENUMERATION CERTIFIED / MERGED
PR #990 **MERGED**. Post-merge main: `e00adbe3a242c129bcb222ec4a5cfbf511f71e42`.

Safety smoke `33690151575` — **SUCCESS**:
- crawl delay **10s**, requestCount **2**, no early stop, zero writes
- artifact `9870484076`
- digest `sha256:713204a0803c27f4729a810fe1a6f1e58312a5911458ec0aa61f2ce637e23a48`

Root manifest `33765033217` — **SUCCESS**:
- root sitemap URLs **446**
- `page-sitemap*.xml` **438**, `post-sitemap.xml` **1**, `agency-sitemap.xml` **1**, relevant `property_details*.xml` **6**
- artifact `9897115870`
- digest `sha256:c1be815fc97645100fbf776c50946f8b635aa70929393051e44eb9d9bf6c9997`

Targeted property full `33765427351` — **SUCCESS** on certification commit `c52760742e9418c37567c6b26d7fcfc34a9624b0`:
- dedicated tests **3/3 PASS**
- discovered/selected property sitemaps **6/6**
- requestCount **8** = robots + root + six property sitemaps
- crawlDelayMs **10000**
- **5,064 unique real-estate listing IDs**
- stoppedEarly `null`; cappedBySitemaps **false**; cappedByUrls **false**; zeroDbWrites **true**
- artifact `9897323745`
- digest `sha256:260ab772ed4f43c5eee41fbf0e04053e59716e76589ca0beb411dc619a8f5566`

The failed broad attempt `33764142715` is retained as diagnostic evidence: the initial 4-doc bound was wrong; manifest discovery then narrowed 446 sitemap children to the six relevant property-detail sitemaps. No blind 446-sitemap crawl was performed.

## MarocAnnonces — FULL CERTIFIED / MERGED
PR #992 **MERGED**, merge `21ec5032c56312e213367c5cacb76b39d5a15a59`.

Smoke `33738909895` — **SUCCESS**: robots **200**, 20 IDs / one page, zero writes.

Full `33739495442` — **SUCCESS**:
- pages **546**, requests **547**
- **10,000 unique listing IDs**
- queueRemaining **0**, no caps, no early stop, zero writes
- artifact `9888335708`
- digest `sha256:c23c571acae2863e1dd866126938174af67186da704e3ad30c8bb97fb3bf5bc9`

## Agenz — SMOKE CERTIFIED / FULL IN PROGRESS
Branch `feat/agenz-source-first`, PR #993 OPEN / DRAFT.

Smoke `33764290049` — **SUCCESS**:
- tests **9/9 PASS**
- robotsStatus **200**, delay **3000ms**
- pageCount **1**, requestCount **2**
- **36 unique IDs**, queueRemaining **123**, no early stop, zero writes
- artifact `9896887028`
- digest `sha256:03e03acabee3908ba3265b991e20b903a54aed527af647a16e60443e72a5125b`

Full benchmark:
- HEAD `8aa3101cc8bbbdc833e7eea666fd1226a22d1c80`
- run `33764930794` — **IN_PROGRESS** at last verification
- max 1000 discovery pages / 50,000 IDs, 3s minimum delay, stop 429/hard block, zero writes
- certification requires queueRemaining=0, no caps/early stop, artifact + digest.

# Exact artifact union
Using downloaded certified URL artifacts:
- Avito **27,053**
- MarocAnnonces **10,000**
- Sarouty **5,064**
- pairwise exact URL overlap **0**
- exact URL union **42,117**

This is source-scoped URL union only, **not semantic property dedupe** and not 42,117 usable listings.

# Current doctrine
1. Goal >100k remains multi-source.
2. Three full enumerations are now certified: Avito **27,053**, MarocAnnonces **10,000**, Sarouty **5,064**.
3. Exact certified artifact union = **42,117 URLs** before semantic dedupe/freshness.
4. Agenz full is the next active source certification.
5. Mubawab deeper replay remains available if later gates require it.
6. No production bulk write; no Vercel deploy.

# Next exact
1. finish Agenz full `33764930794`; if green, artifact/digest → PR #993 ready/merge/post-merge;
2. extend exact artifact union with Agenz;
3. listing-detail validity/freshness → canonical extraction → semantic cross-source dedupe → quality → serving;
4. Mubawab deeper/full replay only if needed;
5. certify **10k → 50k → 100k usable**.

# Remaining sequence
`Agenz full → PR #993 closeout/merge → exact multi-source union → listing-detail validity/freshness → canonical extraction → semantic dedupe → quality → 10k → 50k → 100k usable → Mubawab deeper replay if needed → bounded prod-ingestion canary if required → closeout docs → post-merge verification`

## Current handover state
- chantier: **Morocco Web Acquisition / L8 Scale + Coverage**
- Goal: **>100,000 usable canonical Moroccan listings**
- main post-Sarouty merge: `e00adbe3a242c129bcb222ec4a5cfbf511f71e42` before this canonical-only commit
- certified full IDs: Avito **27,053** + MarocAnnonces **10,000** + Sarouty **5,064**
- current exact artifact URL union: **42,117**
- active source: **Agenz**
- Agenz run: `33764930794` — **IN_PROGRESS** at last verification
- production DB mutation: **none authorized**
- Vercel: **not required / not authorized**
- strategic blocker: **none**
- Next exact: **Agenz full result**
- global project percentage: **intentionally unassigned; do not invent one**
