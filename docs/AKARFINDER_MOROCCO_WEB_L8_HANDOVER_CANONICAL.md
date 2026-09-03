# AKARFINDER — Morocco Web Acquisition L8 — HANDOVER CANONICAL

Status: **ACTIVE**
Last verified: **2026-09-03**

Detailed historical evidence: `docs/AKARFINDER_MOROCCO_WEB_L8_SCALE_COVERAGE.md`.

## Goal
Build and certify **>100,000 usable Moroccan real-estate listings**.

A listing counts only after:
`public enumeration → listing validity/freshness evidence → canonical extraction → cross-source dedupe → quality → serving`.

Raw counters, URLs and enumerated IDs do **not** count as final success. Final gates: **10k → 50k → 100k usable canonical listings**.

## Guardrails
- public content only;
- respect robots and declared crawl delays;
- stop on HTTP 429 / 403 / hard block where applicable;
- no CAPTCHA/private-API/proxy/fingerprint/block bypass;
- enumeration/read audits are zero-write unless a separately authorized production canary exists;
- no production DB bulk mutation without bounded canary + rollback proof;
- no Vercel deployment without explicit approval.

## Production raw baseline — 2026-09-02
`discovery_candidates` **304,933**: rejected **142,143**, unclassified **137,868**, accepted **13,757**, discovered **11,165**. Not usable certification.

# Certified / bounded source evidence

## Avito — FULL ENUMERATION CERTIFIED
- core merged PR #989, commit `ef2af49f96aeb8b2b4962d0f90bad8fa35a85452`
- full run `33672899097` — **SUCCESS**
- **27,053 unique listing IDs**
- 2,505/2,505 public discovery shards requested; no 429; zero DB writes
- artifact `9865177626`
- digest `sha256:f952e9e6d57c1752dd2c1762a0bdd95c24e083dfa7bbead7b7a6e8474d0f9836`

Current access caveat — verified 2026-09-03:
- detail validity attempt `33766904139`: robots **200**, first sampled detail URL → **HTTP 403**, immediate safe stop, zero writes;
- later discovery-card probe `33767859710`: robots **200**, previously certified productive shard `/fr/rabat/agdal/immobilier/terrain` → **HTTP 403** from the GitHub runner;
- no retry/bypass.

Avito enumeration remains certified; current GitHub-runner live revalidation is blocked.

## Mubawab — BOUNDED ENUMERATION CERTIFIED
- core merged PR #988, commit `c7306784653339ab942a69403cfaca9a39688973`
- 25 shards → **301 IDs** — `33662143708`
- 100 shards → **663 IDs** — `33662906605`
- 500 shards → **5,195 IDs** — `33663293707`
- no 429; zero writes
- deeper replay deferred until usable gates require it.

## Sarouty — FULL PROPERTY ENUMERATION CERTIFIED / MERGED
PR #990 **MERGED**. Merge commit `e00adbe3a242c129bcb222ec4a5cfbf511f71e42`.

Safety smoke `33690151575` — **SUCCESS**:
- crawl delay **10s**, requestCount **2**, no early stop, zero writes
- artifact `9870484076`
- digest `sha256:713204a0803c27f4729a810fe1a6f1e58312a5911458ec0aa61f2ce637e23a48`

Root manifest `33765033217` — **SUCCESS**:
- root sitemap URLs **446**
- `page-sitemap*.xml` **438**, `post-sitemap.xml` **1**, `agency-sitemap.xml` **1**, relevant `property_details*.xml` **6**
- artifact `9897115870`
- digest `sha256:c1be815fc97645100fbf776c50946f8b635aa70929393051e44eb9d9bf6c9997`

Targeted property full `33765427351` — **SUCCESS** on `c52760742e9418c37567c6b26d7fcfc34a9624b0`:
- tests **3/3 PASS**
- selected property sitemaps **6/6**
- requestCount **8** = robots + root + six property sitemaps
- crawlDelayMs **10000**
- **5,064 unique real-estate listing IDs**
- no early stop/caps; zero writes
- artifact `9897323745`
- digest `sha256:260ab772ed4f43c5eee41fbf0e04053e59716e76589ca0beb411dc619a8f5566`

Current access caveat — run `33767415610`:
- certified artifact downloaded with matching digest;
- robots **200**, 10s delay respected;
- first sampled detail page triggered **hard_block**;
- immediate safe stop, zero writes;
- artifact `9898111672`, digest `sha256:d9ca7f10b930ccc45937a9ae3aa5574dd2c3b9434d825d3cbe5bd52c046a8af7`.

No detail-page retry/bypass.

## MarocAnnonces — FULL ENUMERATION CERTIFIED / MERGED
PR #992 **MERGED**, merge `21ec5032c56312e213367c5cacb76b39d5a15a59`.

Smoke `33738909895` — **SUCCESS**: robots **200**, 20 IDs / one page, zero writes.

Full `33739495442` — **SUCCESS**:
- pages **546**, requests **547**
- **10,000 unique listing IDs**
- queueRemaining **0**, no caps, no early stop, zero writes
- artifact `9888335708`
- digest `sha256:c23c571acae2863e1dd866126938174af67186da704e3ad30c8bb97fb3bf5bc9`

Current access caveat — verified 2026-09-03:
- detail audit `33767286536`: robots **200**, sampled detail URL **robots-disallowed**; no detail request made; zero writes;
- discovery-card probe `33767859710`: current robots also disallows the previously enumerated category target used by the probe;
- no bypass.

Enumeration evidence remains historical/certified; current robots policy controls all future fetches.

## Agenz — SAFE BOUNDED ENUMERATION CERTIFIED / MERGED
PR #993 **MERGED**. Merge commit `82f3cf600ab7cae24aabfc9ce712d24ef717091b`.

Smoke `33764290049` — **SUCCESS**:
- tests **9/9 PASS**
- robotsStatus **200**, delay **3000ms**
- pageCount **1**, requestCount **2**
- **36 unique IDs**, queueRemaining **123**, no early stop, zero writes
- artifact `9896887028`
- digest `sha256:03e03acabee3908ba3265b991e20b903a54aed527af647a16e60443e72a5125b`

Scale attempt `33764930794` — **SAFE STOP / NOT FULL**:
- tests **9/9 PASS**
- robotsStatus **200**, delay **3000ms**
- pageCount **430**, requestCount **431**
- **4,466 unique listing IDs observed**
- artifact `listing-urls.txt` independently verified **4,466 / 4,466 unique**
- queueRemaining **1,397**
- stoppedEarly **hard_block**
- no page/listing cap; zero writes
- artifact `9898224274`
- digest `sha256:34a34a4eb0f2ae8d8d0f185c17afbf105296f3439d5e3381abe2baa67e61b2fb`

No retry/bypass. This is bounded observed Agenz inventory, not full Agenz certification.

# Artifact union
Verified source-scoped URL counts:
- Avito full **27,053**
- MarocAnnonces full **10,000**
- Sarouty full **5,064**
- Agenz bounded safe corpus **4,466**

Exact source-scoped observed union: **46,583 URLs**.

The first **42,117** come from three completed full enumerations. The Agenz **4,466** are bounded-before-block evidence. Different source domains make exact URL collisions zero by construction; this is **not semantic property dedupe**, freshness certification or usable-listing certification.

# Canonical extraction readiness
PR #994 **MERGED** at `f177bf8609ed36960d67ced56e33715919ddc505`.

Targeted extractor run `33766506107` — **SUCCESS**:
- Python 3.12
- **8/8 tests PASS**
- Avito / Sarouty / Agenz certified detail URL formats recognized
- Sarouty numeric-ID guard retained
- existing Mubawab / MarocAnnonces / long-tail / discovery behavior remains green.

## Live detail/discovery access verdict
Artifact-backed detail audit established that GitHub-runner live detail crawling is currently not a valid universal L8 path:
- Avito detail → **HTTP 403**;
- MarocAnnonces detail → **robots-disallowed**;
- Sarouty detail → **hard_block**.

Discovery-card follow-up `33767859710` also found current access constraints:
- Avito previously productive shard → **HTTP 403**;
- MarocAnnonces probe category → **robots-disallowed** under current robots.
- artifact `9898289285`
- digest `sha256:d162b9fcc7cc5d7f12492b8f7e94b67634236076269ed64a930a3cfd0a9c47d2`

Therefore **no further blocked live-page probing is authorized by the canonical path**. Existing certified artifacts, current robots-safe manifests/sitemaps, and already-collected read-only corpus metadata become the next evidence layer.

PR #995 is diagnostic-only and must not be used to justify bypassing source access controls.

# Current doctrine
1. Goal >100k remains multi-source.
2. Full certified enumerations: Avito **27,053**, MarocAnnonces **10,000**, Sarouty **5,064**.
3. Bounded Agenz evidence adds **4,466** before a hard block.
4. Current exact source-scoped observed URL union = **46,583** before semantic dedupe/freshness.
5. Live GitHub-runner detail crawling is retired as the universal next step because source controls now block it.
6. Next evidence must come from already-certified artifacts, current robots-safe sitemap/manifest metadata, and existing read-only discovery corpus fields.
7. Mubawab deeper replay remains available only if later gates require it and current robots permit it.
8. No production bulk write; no Vercel deploy.

# Next exact
1. inspect read-only production/discovery corpus schema and coverage for the **46,583 observed source URLs/IDs** to determine which canonical fields are already captured with source evidence;
2. quantify field completeness by source: identity, transaction, property type, city/neighborhood, price, surface, title, freshness timestamps/evidence;
3. derive freshness from permitted evidence (existing discovery timestamps and current robots-safe sitemap/manifest metadata) without blocked detail fetches;
4. canonicalize only supported facts → semantic cross-source dedupe → quality passport → serving eligibility;
5. measure usable gate against **10k**, then **50k**, then **100k**;
6. expand with Mubawab/deeper public sources only if measured usable coverage requires it.

# Remaining sequence
`read-only corpus field audit → permitted freshness evidence → supported canonical extraction → semantic dedupe → quality/serve eligibility → 10k gate → source expansion if needed → 50k → 100k → bounded prod-ingestion canary if required → closeout docs → post-merge verification`

## Current handover state
- chantier: **Morocco Web Acquisition / L8 Scale + Coverage**
- Goal: **>100,000 usable canonical Moroccan listings**
- main before this canonical commit: `82f3cf600ab7cae24aabfc9ce712d24ef717091b`
- full-certified IDs: Avito **27,053** + MarocAnnonces **10,000** + Sarouty **5,064** = **42,117**
- bounded Agenz observed: **4,466**
- current source-scoped observed union: **46,583**
- production DB mutation: **none authorized / none performed in this lot**
- Vercel: **not required / not authorized**
- strategic blocker: **live page access controls prevent universal detail/discovery revalidation from GitHub runners**
- Next exact: **read-only corpus schema + field-coverage audit on observed sources**
- global project percentage: **intentionally unassigned; do not invent one**
