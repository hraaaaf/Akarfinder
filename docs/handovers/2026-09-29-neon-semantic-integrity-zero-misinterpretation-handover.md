# HANDOVER — AkarFinder Neon Semantic Integrity / Zero Misinterpretation

Date: 2026-09-29
Repository: hraaaaf/Akarfinder
Branch: data/neon-price-recovery-audit
PR: #1104 — DRAFT / OPEN / mergeable
HEAD: 3ff7d91a8139eb06b46eec2e1ac0e9e063116a44

## GOAL

**0 annonce mal interprétée dans le corpus certifié/public.**

A field may remain unknown. It must never be presented as known when the evidence is contradictory or ambiguous.

Success:
- 0 strong semantic-integrity contradiction in the certified/public corpus;
- unresolved rows are explicitly unknown/quarantined, never guessed;
- public Search fails closed on strong contradictions;
- all relevant CI/regression gates green;
- bounded/reversible DB corrections only after a human gate.

Proof:
- exhaustive Neon audits;
- deterministic field-level benchmarks;
- parser/regression tests;
- post-remediation full-corpus audit;
- public Search smoke/regression.

## VERIFIED CORPUS BASELINE

Neon:
- project: ancient-violet-43534870
- branch: br-cold-mouse-b2a50yaa
- database: AkarFinder
- property_listings: **151,900**
- listing_sources: **151,900**

Current public policy-compliant subset:
- **36 rows**
- current combined strong semantic flags among these 36: **0**

IMPORTANT:
- this does NOT mean the 151,900-row corpus is clean;
- this does NOT mean all 151,900 rows are publicly publishable;
- no production Neon write has been performed in this lot.

## PRICE FINDINGS

- price_mad NULL: **95,626**
- NULL-price rows without description_snippet: **86,098**
- strict first-pass explicit candidate recovery: **238**
- ambiguous principal-price candidates: **2**
- wrong-intent / ancillary monetary evidence rejected: **932**
- no usable stored explicit currency+amount evidence: **94,454**

Historical structured-price parser root cause reproduced:
- old parser removed every non-digit from a complete DOM price block;
- unrelated digits could be concatenated into price;
- Masaken strict comparable sample: **25/40 mismatches**;
- **23/25** exactly reproduce the `"2" + explicit_amount` corruption pattern.

Parser was fixed to parse explicit amount+currency candidates rather than concatenating every digit.

Existing non-NULL prices are NOT automatically trusted.

Additional price semantic findings:
- suspicious extreme-price gate baseline: **434**
- sale listings with exactly one explicit title MAD/DH amount comparable: **1,085**
- exact: **862**
- mismatch: **223**
- public subset title-price conflicts: **0**

## RENTAL PRICE PERIOD — CRITICAL

`listing_sources.price_period`:
- NULL on **151,900 / 151,900 rows**

Priced rent listings:
- **16,639**
- explicit non-monthly cadence signal (day/night/week): **29**
- explicit monthly signal: **325**
- current public subset with non-monthly cadence signal: **0**

Doctrine:
- a rent amount with explicit day/night/week cadence is NOT certified until period semantics are modeled;
- fail closed rather than silently treating it as monthly.

## TRANSACTION FINDINGS

Strong contradiction = title AND URL agree against stored transaction.

- strong transaction contradictions: **178**
- source concentration:
  - Agenz: **136**
  - MarocImmo: **17**
  - PromoImmoMarrakech: **11**
  - Mouldar: **8**
  - Avito: **4**
  - Mubawab: **2**

A deterministic remediation dry-run exists. No write.

## PROPERTY TYPE FINDINGS

Broad title-only discrepancy signal:
- **5,512**
- this is audit signal only; NOT proof for auto-correction.

High-confidence correction doctrine:
- title AND URL must agree on type;
- accepted equivalences are not auto-classed as errors:
  - studio ⊂ apartment
  - villa/house
  - riad/house-villa where context is not definitive.

Source concentration of high-confidence type conflicts was observed mainly in:
- Mubawab
- Domio
- MarocImmo
- Sarout

IMPORTANT OPEN REGRESSION:
Canonical Baseline currently exposes two false-positive type cases:
- `Hay Riad` must NOT be interpreted as property type `riad`;
- contextual `terrain` mention must NOT automatically mean property type `land`.

These must be fixed before certification.

## SURFACE FINDINGS

Initial audit regex incorrectly parsed grouped thousands (e.g. `1 200 m²` as `200`). This was detected and corrected before drawing conclusions.

Corrected benchmark on listings with exactly one explicit title surface:
- Agenz: **1,132 comparable / 1 mismatch / 99.91% exact**
- Avito: **2,332 / 562 mismatch / 75.90% exact**
- Mubawab: **4,183 / 383 mismatch / 90.84% exact**
- Domio: **291 / 38 mismatch / 86.94% exact**
- PromoImmoMarrakech: **173 / 9 mismatch / 94.80% exact**

Corpus title-surface conflicts identified: about **993** under this strict one-explicit-surface benchmark.

Current public subset title-surface conflicts:
- **0**

Strong physical surface bounds are also fail-closed.

## ROOM / BEDROOM / BATHROOM

Physical-bound baseline:
- suspicious rooms: **0**
- suspicious bedrooms: **5**
- suspicious bathrooms: **0**

IMPORTANT OPEN REGRESSION:
Canonical Baseline test:
- `rejects bedroom count contradicted by explicit labeled evidence`
currently fails.

This is the third exact test to fix next.

## CITY / GEOGRAPHY

Case/format city collision groups:
- **30**
- rows in collision groups: **131,069**

Existing canonical geo registry is reused:
`lib/geo/geo-entity-registry.ts`

Neon read model now:
- canonicalizes returned city names through the registry;
- makes city filtering alias-aware and case-insensitive.

Examples covered by existing registry:
- Casablanca/casablanca
- Fès/Fes
- Salé/Sale
- Témara/Temara

No mass DB rewrite has been done.

## PUBLIC FAIL-CLOSED GUARD

`lib/listings/public-listing-access.ts`

Strong semantic conflicts suppress a row from public Search rather than guessing.

Current guard work includes:
- invalid transaction/property enums;
- strong title+URL transaction contradiction;
- strong title+URL property-type contradiction;
- physical surface/count bounds;
- explicit-title surface contradiction;
- extreme price bounds;
- explicit sale-title price contradiction;
- unsupported non-monthly rental cadence.

Current public subset rechecked with transaction/surface/price/cadence gates:
- **36 total**
- **0 flagged**

This is a current baseline, NOT final zero-error certification.

## FILES ADDED / MODIFIED

Canonical contract:
- `docs/data/NEON_SEMANTIC_INTEGRITY_ZERO_MISINTERPRETATION.md`

Read-only audits:
- `scripts/data/neon-price-recovery-audit.sql`
- `scripts/data/neon-semantic-integrity-audit.sql`
- `scripts/data/neon-semantic-remediation-dry-run.sql`

Core:
- `lib/listings/public-listing-access.ts`
- `lib/db/neon-listings.ts`

Tests:
- `scripts/scrapers/__tests__/public-listing-access.test.ts`
- structured price parser tests

Workflow:
- `.github/workflows/price-extraction-v5.yml`
- obsolete Supabase canary no longer blocks PR runs.

## CI — EXACT CURRENT STATE

HEAD:
`3ff7d91a8139eb06b46eec2e1ac0e9e063116a44`

PR #1104:
- OPEN
- DRAFT
- mergeable

Current HEAD checks:
- **10/11 SUCCESS**
- **1 FAILURE**

Failure:
- Canonical Baseline Validation
- run: **36550067840**
- artifact: **11024217476**
- scraper regression: **1862 pass / 3 fail**

Exact failing semantic tests:
1. `rejects bedroom count contradicted by explicit labeled evidence`
2. `does not misread Hay Riad as a riad property type`
3. `does not misread contextual terrain mention as land`

All other current HEAD checks are SUCCESS, including:
- SEARCH Price Extraction v5: **36550067613 SUCCESS**
- C8D Rabat Agenz Detail Recovery Audit: **36550067641 SUCCESS**
- CI Workflow Efficiency Policy: **36550067608 SUCCESS**
- Canonical Baseline Compile Validation: **36550067577 SUCCESS**
- Phase 1 P1 Final Sweep Gate: **36550067619 SUCCESS**
- Phase 1 P1 Search Truth Gate: **36550067677 SUCCESS**
- UX Gate 0 Contracts: **36550067600 SUCCESS**
- Phase 1 P0 Closure Gate: **36550067695 SUCCESS**
- Phase 1 P2 Residual Closure Gate: **36550067657 SUCCESS**
- Product Constitution Gate: **36550061717 SUCCESS**

## SAFETY / AUTHORIZATION

- No Neon production data write performed.
- No Vercel deployment performed for this lot.
- No publication-policy relaxation.
- No auto-fix from weak/title-only evidence.
- Production DB mutation remains a HUMAN GATE.

## NEXT EXACT

Fix the three Canonical Baseline semantic regressions at HEAD:
1. explicit labeled bedroom evidence;
2. Hay Riad false-positive property type;
3. contextual terrain false-positive property type.

Then:
1. run/recheck exact-head CI;
2. strengthen field-level exhaustive audits;
3. export deterministic correction sets;
4. separate safe auto-corrections from quarantine/re-enrichment;
5. prepare bounded reversible Neon migration(s);
6. HUMAN GATE before any production DB write;
7. apply only approved deterministic corrections;
8. re-run full 151,900-row semantic audit;
9. certify public/certified corpus only when strong conflicts = 0.

## START PROMPT FOR NEXT WINDOW

```
Continue AkarFinder from:
docs/handovers/2026-09-29-neon-semantic-integrity-zero-misinterpretation-handover.md

Goal: 0 annonce mal interprétée dans le corpus certifié/public.

Start by verifying repo/branch/PR/HEAD/CI against the handover.
Then fix the 3 exact Canonical Baseline failures:
- bedroom labeled-evidence contradiction;
- Hay Riad false-positive riad type;
- contextual terrain false-positive land type.

Do not write to Neon yet.
Do not relax publication policy.
Unknown/ambiguous must remain unknown/quarantined.
After CI is green, continue autonomously through deterministic field audits and correction-set preparation.
Stop only at the human gate before production DB mutation.
```


## CURRENT OVERRIDE — 2026-09-29 / RECOVERY BENCHMARK

This section supersedes the stale CI/NEXT snapshot above.

Verified semantic baseline:
- exhaustive corpus artifact: 151,900 / 151,900 rows;
- public proxy: 36 rows, 0 strong conflicts;
- Step 1 regression-fix HEAD `0c99d8eba21d9f8a0685c5a43c945fca6397e204`: 10/10 exact-head checks SUCCESS.

Verified MarocImmo recovery benchmark:
- canonical hardened HEAD: `56586c6241d703e7679a089a28ebd7379fdce17e`;
- workflow run: `36574099537` — SUCCESS;
- artifact: `11035354132`;
- artifact digest: `sha256:a56f986fe8e8744fc60e833a8b036ee550c8eaaea4738c5dd3ab180c36b6cb67`;
- deterministic sample: 120 rows, all 120 had `price_mad=NULL` in the exhaustive corpus;
- robots allowed: 120/120; blocked: 0;
- accessible HTTP 200: 120/120;
- missing-field candidate recovery: price 112/120 (93.3%), bedrooms 29/118 (24.6%), rooms 9/120 (7.5%), bathrooms 1/120 (0.8%), surface 0/112;
- 116/120 rows recovered at least one missing field;
- 151 recovered missing-field slots / 590 missing slots in this generic pass;
- ambiguous price cases: 1;
- candidates only: no Neon write.

Current branch HEAD after generalizing the same read-only benchmark to Sarout:
`8369bbf94f5a6e0121c8ba24516e4b2a85a7ba5b`

Current run:
- `36574639858` — Neon Semantic JSONL Audit, queued at last check;
- includes MarocImmo + Sarout bounded benchmark jobs;
- no production write; robots fail-closed.

NEXT EXACT:
1. read Sarout benchmark from run `36574639858`;
2. compare URL accessibility, price recovery, ambiguity and secondary-field yield against MarocImmo;
3. choose source-specific parser/recovery order from measured yield;
4. keep all recovery outputs as candidates until the production Neon HUMAN GATE.


## RECOVERY BENCHMARK OVERRIDE — SAROUT HARDENED

Verified HEAD: `912d661698972cb641ae8189800634438fa41f6e`.
Run: `36584126990`.
Sarout benchmark artifact: `11040348832`, digest `sha256:ce9b4e99633020f312f4432052bdbb880e14679ba88dee6a96dfed0a9726b17c`.

Sarout sample:
- 120 deterministic rows;
- robots allowed 120/120;
- accessible 114/120;
- 118 rows had `price_mad=NULL`; 112 of those were accessible;
- 88 / 112 accessible missing prices passed the hardened source-specific gates = 78.6%; 88 / 118 across all missing-price sampled rows = 74.6%;
- accepted candidates match the unique JSON-LD `offers.price` in MAD: 0 mismatches;
- price rejects among accessible missing-price rows: 8 no_offer, 10 non_monthly, 5 vacation_without_monthly_proof, 1 rent_too_low;
- sample surface was NULL 120/120; 78 / 114 accessible rows recovered a surface = 68.4%;
- district recovery remains candidate-only because source locations such as Al Fida are not yet mapped into the AkarFinder geo registry.

Sarout parser contract now:
- JSON-LD `RealEstateListing` first;
- never infer listing price or room count from whole-page related-listing cards;
- price requires one MAD JSON-LD offer plus transaction/cadence gates;
- explicit vacation/daily/nightly/weekly signals are rejected;
- mixed cadence fails closed;
- `floorSize` with `unitCode=MTK` may provide surface;
- `numberOfBedrooms` and `numberOfBathroomsTotal` are source candidates;
- `numberOfRooms` is NOT mapped directly because observed Sarout semantics are inconsistent;
- no production write authorized.

Canonical inspected row Sarout ID 79042:
- source page: Bureau 100 m² à louer à Casablanca (Al Fida);
- user inspection: Prix sur demande;
- safe result: price NULL / stored status not_disclosed, surface 100, bathrooms 1, rooms NULL, bedrooms NULL;
- unrelated card prices/room counts are excluded.

MarocImmo remains the higher raw price-yield benchmark (112/120 = 93.3%), while Sarout now has stronger source-structured evidence and cadence rejection. Do not scale either to production DB until a bounded candidate-set review and human gate.

NEXT EXACT:
1. extend benchmark output to include stored bedrooms/bathrooms/rooms so secondary-field recovery rates have exact denominators;
2. materialize source-specific candidate sets, still read-only;
3. compare MarocImmo evidence quality against Sarout JSON-LD quality;
4. prepare bounded reversible migration only after candidate certification;
5. HUMAN GATE before Neon production write.


## RECOVERY BENCHMARK UPDATE — SAROUT FINAL HARDENED

HEAD: `912d661698972cb641ae8189800634438fa41f6e`
Run: `36584126990` — SUCCESS.
Exact-head checks: all SUCCESS.

Sarout bounded sample (120):
- robots allowed: 120/120;
- accessible HTTP 200: 114/120;
- network/error: 6;
- recovered candidate price_mad: 88;
- recovered surface_m2: 78;
- recovered bedrooms_count: 41;
- recovered bathrooms_count: 40;
- recovered rooms_count: 14;
- ambiguous_price: 0.

Structured-price rejection reasons:
- no_offer: 8;
- non_monthly: 10;
- vacation_without_monthly_proof: 5;
- sale_too_low: 1;
- rent_too_low: 2.

Verified source rules:
- Sarout price candidates come from JSON-LD `offers.price`, not page-wide monetary regex;
- non-monthly / short-stay / vacation cadence is rejected unless monthly evidence is explicit and non-conflicting;
- mixed cadence is fail-closed;
- Sarout `numberOfRooms` is NOT mapped directly to AkarFinder `rooms_count` because observed semantics are inconsistent;
- missing structured counts remain NULL;
- listing 79042 is now recovered safely as surface=100, bathrooms=1, rooms=NULL, price=NULL/no_offer, matching manual inspection “Prix sur demande”.

NEXT EXACT:
1. audit record-level the 88 accepted Sarout price candidates against transaction/category/cadence evidence;
2. inspect the 14 text-derived rooms candidates separately;
3. freeze a write-safe correction cohort only after those audits;
4. HUMAN GATE before any Neon production mutation.


## SAROUT RECORD-LEVEL WRITE-SAFE AUDIT

Source artifact: `11040348832` from run `36584126990`.

Price candidates accepted by the hardened parser: 88.
Zero-error cadence filter:
- write-safe price candidates: **62**;
  - sale: **58**;
  - explicitly monthly rent: **4**;
- quarantined price candidates with unknown rental cadence: **26**.

Rooms candidates:
- **14/14** come from explicit labeled `X pièces` evidence in the main listing description after similar-listing isolation;
- no direct mapping from Sarout JSON-LD `numberOfRooms` is allowed because its semantics are inconsistent with visible “pièces” evidence.

Observed source-quality outlier:
- Sarout ID `75179`: apartment Marrakech, source JSON-LD + source title both expose **240,000,000 MAD**;
- this is not an extraction mismatch, but it remains a source-quality signal and is not evidence of an AkarFinder parser error.

Implementation:
- benchmark now emits per-field audit status and a dedicated `*-write-safe.jsonl` dry-run cohort;
- workflow publishes these files as artifacts;
- still read-only; no Neon mutation.

Current HEAD after cohort artifact wiring:
`3f05626a0e4d95e6b180c64285158b2855521cb5`

NEXT EXACT:
1. validate the exact-head write-safe artifact;
2. verify exact field counts in the generated cohort;
3. prepare reversible dry-run correction payload only;
4. HUMAN GATE before any Neon write.


## EXTERNAL BLOCKER — NEON QUOTA 2026-09-29

Current code HEAD: `775070535e920252f92a3b8f6cf0ec4ff7aa28ef`.
Exact workflow run: `36588082597`.

Failure cause is external and identical across DB-dependent jobs:
`HTTP 402 — Your account or project has exceeded the quota. Upgrade your plan to increase limits.`

Verified before the quota block:
- syntax check passes;
- hardened Sarout benchmark on previous validated HEAD: 120 sample / 114 accessible / 88 price candidates after cadence guards;
- zero-error price cohort from that validated artifact: 62 write-safe (58 sale + 4 explicit monthly rent), 26 unknown-cadence rentals quarantined;
- 14 room candidates are explicit labeled `X pièces` evidence from the main listing description;
- no production write performed.

Implemented but not yet re-certified due quota:
- actual `*-write-safe.jsonl` emission;
- actual `*-mutation-plan.jsonl` emission;
- per-field mutation record includes listing id, source, DB field, candidate value, NULL precondition, evidence, confidence, and `dry_run_only` mode.

NEXT EXACT AFTER NEON QUOTA IS RESTORED:
1. rerun `Neon Semantic JSONL Audit` on current HEAD;
2. verify artifact files are present and exact counts match the prior audited cohort;
3. freeze the reversible dry-run mutation payload;
4. HUMAN GATE before any Neon production write;
5. after approval, apply only preconditioned deterministic corrections and rerun the full 151,900-row semantic audit.


## COURSE CORRECTION — RECOVERY INPUT MUST BE GITHUB FREEZE

The recovery benchmark must not use Neon as its analysis source.

Canonical offline input:
- GitHub Actions artifact: `10910779576`;
- file: `clean-corpus-v4.11-core.jsonl.gz`;
- rows: **226,286**;
- gzip SHA256: `e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953`;
- manifest invariants: `database_access=0`, `database_writes=0`.

Implementation correction:
- new script: `scripts/data/github-freeze-recovery-benchmark.mjs`;
- deterministic source samples are selected directly from the freeze using `source_domain`, `classification=KEEP`, and `scope_eligible=true`;
- source pages are then fetched read-only under robots.txt controls;
- Neon is no longer queried by the recovery benchmark;
- workflow renamed/reworked as `GitHub Freeze Recovery Audit`.

Current implementation HEAD: `0d70c7562c26e674aeb2e9c4ddac772e8e437831`.
Current run: `36589275434` — in progress at last check.

Neon should only re-enter the path at a later human-gated write/readback step, never as the primary corpus for this offline recovery analysis.


## GITHUB FREEZE RECOVERY BENCHMARK 120×2 — CERTIFIED

Canonical HEAD: `a0a3118f25610018675d3b53a3486a0797e56ad3`
Run: `36604311223` — SUCCESS.

Freeze input:
- artifact `10910779576`;
- rows: **226,286**;
- gzip SHA256 verified in workflow: `e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953`;
- Neon access: **0**;
- Neon writes: **0**.

### Sarout — 120 deterministic rows
- accessible: 118/120;
- recovery from NULL: price 44, surface 83, bedrooms 34, bathrooms 39, rooms 10;
- high-confidence: **194 fields** = price 44 + JSON-LD surface 76 + JSON-LD bedrooms 25 + JSON-LD bathrooms 39 + explicit primary-text rooms 10;
- review: **16 fields** = surface text 7 + bedrooms text 9;
- price rejections: unknown rental cadence 39, vacation-without-monthly-proof 3, sale price/m² outlier 3, sale-too-low 6, no-offer 13, mixed cadence 5, non-monthly 5;
- artifact: `11049914324`, digest `sha256:faab3e2c409e24d3e8e2513cd82ba9f56cbabd9c517e9db273eb6951d3f02a44`.

### MarocImmo — 120 deterministic rows
- accessible: 120/120;
- recovery from NULL: price 57, surface 70, bedrooms 20, bathrooms 2, rooms 10;
- high-confidence: **70 fields** = price 57 + rooms 10 + JSON-LD bathrooms 2 + JSON-LD bedrooms 1;
- review: **89 fields** = surface text 70 + bedrooms text 19;
- price rejections: unknown rental cadence 53, no explicit price 8, non-monthly 1, sale-too-low 1;
- artifact: `11049644833`, digest `sha256:0202f05fb52474b4eb58592c7f1d3c398d81e45245b6c5be53927197930cd4b6`.

Combined certified benchmark:
- **264 high-confidence field recoveries**;
- **105 review field recoveries**;
- strict price recoveries: **101** = MarocImmo 57 + Sarout 44;
- no conflicts with already-populated freeze fields in this sample;
- exact matching validation: 7 MarocImmo surfaces + 1 Sarout surface + 2 MarocImmo bedrooms.

NEXT EXACT:
1. expand deterministic sample to 300 rows/source using the same rules;
2. compare recovery and rejection-rate stability;
3. if stable, choose bounded source-specific scale strategy;
4. keep Neon entirely outside analysis until a later explicit HUMAN GATE.


## GITHUB FREEZE RECOVERY BENCHMARK 300×2 — STABILITY RESULT

Run `36604769558` on HEAD `a242edaaee5d4373a985415205de0d970ec27491`: SUCCESS.

### MarocImmo — stable
- 300/300 accessible;
- recovery-from-NULL: price 140, surface 164, bedrooms 57, bathrooms 4, rooms 17;
- high-confidence: price 140, rooms 17, bathrooms 4, JSON-LD bedrooms 3;
- review: surface 164, bedrooms 54;
- incremental 180 rows: 83 strict prices = 46.1%, vs baseline 57/120 = 47.5%;
- accessibility increment: 180/180.
Conclusion: source-specific recovery signal is stable enough for the next controlled step.

### Sarout — parser stable, source availability unstable
- 189/300 accessible;
- recovery-from-NULL: price 73, surface 131, bedrooms 61, bathrooms 63, rooms 12;
- high-confidence: price 73, JSON-LD surface 119, JSON-LD bedrooms 45, JSON-LD bathrooms 60, rooms 12;
- review: surface 12, bedrooms 16, bathrooms 3;
- incremental 180 rows: only 71 HTTP 200, 109 HTTP 503;
- among accessible incremental rows: 29 strict prices / 71 = 40.8%, vs baseline 44/118 = 37.3%.
Conclusion: extraction remains stable conditional on HTTP 200; direct live-fetch scale is not justified because source availability degrades sharply.

Canonical offline denominators from GitHub freeze:
- MarocImmo KEEP+eligible: 37,268; price NULL: 37,249; surface NULL: 35,184;
- Sarout KEEP+eligible: 43,794; price NULL: 43,371; surface NULL: 43,430.

Decision:
- proceed with controlled next-source benchmark on Domio;
- do not increase Sarout fetch pressure;
- keep all analysis GitHub-freeze based; Neon remains outside the analysis path.

Domio 300 benchmark added on HEAD `70b67136d1688f08230fa1a5d19ffbcf664769ee`.
Run `36606286573` queued at last check.


## DOMIO RECOVERY — ACTIVE BENCHMARK

Source policy / denominator from canonical GitHub freeze:
- Domio KEEP+eligible: 10,307;
- price NULL: 7,011;
- surface NULL: 8,193;
- bedrooms NULL: 8,282;
- bathrooms NULL: 10,307;
- rooms NULL: 10,307.

Initial 300-row Domio benchmark before route fix:
- 300/300 accessible;
- high-confidence: JSON-LD surface 232, JSON-LD bathrooms 175, explicit rooms 7;
- review: bedrooms 53, surface 2, bathroom 1;
- 5 bedroom conflicts against already-populated freeze values, all kept out of recovery cohort;
- price extraction was incorrectly near-zero because Domio routes use `/vendre/` and `/louer/`, while the generic parser only recognized `/vente/` and `/location/`.

Fixes now implemented:
- recognize `/vendre/` and `/louer/` as sale/rent routes;
- recognize explicit `Mdh` shorthand;
- keep rental cadence strict;
- MarocImmo/Sarout jobs are skipped on push during Domio iterations to avoid unnecessary repeat source traffic.

Current HEAD: `39f343f3b3fb0ee95aa247125a92710f12710e8f`.
Current workflow: `36618313897` — queued at last check; only Domio job active, MarocImmo/Sarout skipped.

Offline replay on the prior Domio artifact predicts 17 strict price recoveries after the route fix; this is provisional and MUST NOT be treated as canonical until exact-head CI reproduces it.

Agenz policy gate verified from repo: `scripts/scrapers/sources/agenz.ts` explicitly marks Agenz `partnership_or_csv_import_only`; no automated Agenz fetch benchmark is allowed. Next compatible source after Domio should therefore be selected among robots/policy-compatible sources such as DarAgadir or PromoImmoMarrakech.


## DOMIO 300 — CERTIFIED

Run `36618313897` on HEAD `39f343f3b3fb0ee95aa247125a92710f12710e8f`: SUCCESS.
Artifact: `11057651564`, digest `sha256:8a4f737d2682f1b828fb63e5ff5cf32575c0d8eade4016743bf849cda332a69a`.

Results:
- 300/300 robots allowed and accessible;
- recovery from NULL: price 13, surface 234, bedrooms 53, bathrooms 176, rooms 7;
- high-confidence: **427 fields** = price 13 + JSON-LD surface 232 + JSON-LD bathrooms 175 + explicit rooms 7;
- review: **56 fields** = bedrooms 53 + surface 2 + bathroom 1;
- validation matches against already-populated freeze fields: surface 58, bedrooms 26, price 6;
- conflicts: bedrooms 5 — excluded from any automatic cohort;
- price rejections: no explicit price 276, sale price/m² outlier 2, unknown rental cadence 2, ambiguous 1;
- Neon access/write: 0/0.

Domio conclusion:
- very strong structured recovery for surface and bathrooms;
- modest but valid price recovery after recognizing `/vendre/` and `/louer/` routes;
- source remains suitable for controlled offline enrichment.

NEXT SOURCE:
DarAgadir selected from freeze because it has 4,787 KEEP+eligible rows, all 5 core fields NULL. DarAgadir 300 benchmark launched on HEAD `43b1df71a6c28af627608c4f0ea06ec548a7d329`, run `36627116721` queued at last check.


## DARAGADIR 300 — CERTIFIED

Run `36627116721` on HEAD `43b1df71a6c28af627608c4f0ea06ec548a7d329`: SUCCESS.
Artifact: `11060428898`, digest `sha256:90119419fbbfe9d6e94804ddf62e0d2b2ef734f040afc62cc330dfce04a3b2a2`.

Results:
- 300/300 robots allowed and accessible;
- recovery from NULL: price 92, surface 209, rooms 21, bedrooms 70, bathrooms 11;
- high-confidence: **113 fields** = price 92 + explicit rooms 21;
- review: **290 fields** = surface 209 + bedrooms 70 + bathrooms 11;
- strict prices: 88 sale + 4 explicit monthly rent;
- price distribution: min 3,300 MAD; median 916,250 MAD; max 32,400,000 MAD;
- price rejections: no explicit price 181, unknown rental cadence 26, sale price/m² outlier 1;
- conflicts: 0;
- Neon access/write: 0/0.

DarAgadir conclusion:
- strong price and rooms recovery;
- surface/bedrooms/bathrooms remain review because evidence is primary-text rather than sufficiently structured.

NEXT SOURCE:
PromoImmoMarrakech selected next from freeze and launched at 300 rows on HEAD `d0280be4f2d7c6cebf975ffeff4cf8d9eceaf3d4`, run `36627917092` queued at last check.


## PROMOIMMOMARRAKECH 300 — CERTIFIED

Run `36628042524` on HEAD `045b712a382c6ece431e96486f8457a24722a8e6`: SUCCESS.
Artifact: `11061995278`, digest `sha256:7caa890c02cc07943f572b49e6c2762acf12bd73d2d87ebd0c355c38ab06925d`.

Results:
- 300/300 accessible;
- recovery from NULL: price 2, surface 178, bedrooms 148, bathrooms 141, rooms 36;
- high-confidence: **38 fields** = rooms 36 + price 2;
- review: **467 fields** = surface 178 + bedrooms 148 + bathrooms 141;
- price rejections: no explicit price 297, sale-too-low 1;
- conflicts: 0;
- Neon access/write: 0/0.

PromoImmo conclusion:
- very low price yield;
- useful only as review-grade textual enrichment for surface/bedrooms/bathrooms plus explicit rooms.

## MASAKEN 300 — ACTIVE

Freeze denominator: 2,047 KEEP+eligible rows, all five core fields NULL.
Deterministic sample route mix checked offline before execution:
- 151 French `vente-*`;
- 45 English `sale-*`;
- 74 French `location-*`;
- 30 English `rental-*`;
- 0 unmatched routes.

Parser route semantics now cover `vente/vendre/sale/buy/achat` and `location/louer/rental/rent`.
Workflow HEAD: `4e5e04d44d5f137c8e7b575ff8ecb2d6695fdb87`.
Run: `36628843782` — queued at last check; only Masaken active, previous source jobs skipped.

If Masaken finishes cleanly, Mouldar is the next prepared source: 1,641 KEEP+eligible rows; its `/achat|buy/` and `/location|rent/` routes are already covered by the parser.


## MASAKEN 300 — CERTIFIED

Run `36628843782` on HEAD `4e5e04d44d5f137c8e7b575ff8ecb2d6695fdb87`: SUCCESS.
Artifact: `11061992267`, digest `sha256:0ade4eea6b6b4a2704c1ff1a55a6684a3b323cb5ec47efc3b7b769d60a48ad01`.

Results:
- 271/300 accessible;
- recovery from NULL: price 25, surface 233, bedrooms 92, bathrooms 48, rooms 5;
- high-confidence: **30 fields** = price 25 + rooms 5;
- review: **373 fields** = surface 233 + bedrooms 92 + bathrooms 48;
- price rejections: no explicit price 230, sale-too-low 6, unknown rental cadence 3, sale price/m² outlier 1, ambiguous 4, mixed cadence 1, non-monthly 1;
- conflicts: 0;
- Neon access/write: 0/0.

Masaken conclusion:
- modest strict-price yield;
- review-heavy textual enrichment;
- no evidence of systemic semantic conflict on the sample.

NEXT SOURCE:
Mouldar selected next from freeze (1,641 KEEP+eligible rows) and launched at 300 rows on HEAD `5a5f88db5f4a688d2063cc0391ef475bcc3fb3eb`.


## MOULDAR — STOP ON ROBOTS

Run `36632141490` on HEAD `70da58ed144c7d81fb489bac358f99c1d61e30d2`: SUCCESS technically, but business result is a hard STOP.
Artifact: `11062965385`, digest `sha256:8349acef5b6755a2df5cda8f2808538a1e317c8476532be80cae7f9b2093ce52`.

Results:
- robots allowed: **0/300**;
- accessible: 0;
- source fetches: 0;
- recovery: 0;
- Neon access/write: 0/0.

Conclusion: do not pursue live Mouldar recovery unless robots/policy changes. No bypass or workaround is authorized.

## SAROUTY — ACTIVE NEXT SOURCE

Repo source contract verified in `scripts/scrapers/sources/sarouty.ts`:
- status: `public_html_test`;
- public real-estate sale listings;
- no login, no API, no phone/email;
- default transaction: sale.

Freeze denominator:
- 941 KEEP+eligible rows;
- all five core fields NULL.

Parser now uses the repo sale-only contract for Sarouty.
Workflow HEAD: `071a8809b05bd13ab2684e1bcbd8a184a107934f`.
Run: `36632352856` — queued at last check; only Sarouty active, all prior source jobs skipped.

Potential next source after Sarouty: `soukimmobilier.com` with 926 KEEP+eligible rows, but no dedicated repo source policy file was found yet. It must remain robots fail-closed and should only launch after the current benchmark slot is free.


## SOUKIMMOBILIER — STOP HTTP 403

Run `36633140184` on HEAD `7c840fc7ce266bace3df90c29cdf7d05a3557647`: SUCCESS technically.
Artifact: `11063801755`, digest `sha256:08ae28b2c7afc059a2f0d4debb16d180fe4298517590c94576748ee5e685d92f`.

Results:
- robots allowed: 300/300;
- HTTP status: 403 on 300/300;
- accessible HTTP 200 pages: 0;
- recovery: 0;
- Neon access/write: 0/0.

Conclusion: stop automated Souk recovery; no bypass is authorized.

## L'IMMOBILIER SANS FRONTIÈRES — ACTIVE

Freeze denominator: 513 KEEP+eligible rows.
Offline URL audit:
- ~293 explicit sale slugs;
- 188 explicit rent slugs;
- 32 without explicit transaction in slug;
- one identifiable short-stay/nightly slug, excluded from monthly-rent price recovery.

Source-specific classifier now uses only the property slug for transaction evidence and quarantines short-stay routes.
Workflow HEAD: `3d6d3f03305476f9e3d3bbef17091f731bc99365`.
Run: `36633833084` — queued at last check; only LSF active, all previous source jobs skipped.

Next prepared source: Aykana (474 KEEP+eligible), with transaction encoded in most `/property/` slugs; atypical variants must be handled source-specifically, not by widening global route matching.


## ATLASIMMOBILIER 300 — CERTIFIED

Run `36648074141` on HEAD `2d9fffe375746a5fa0ab81c0b1ab710750651b18`: SUCCESS.
Artifact: `11070130296`, digest `sha256:96969234ef7430b1e5472b1bb74682eab0fe01cd6c4252c1cd5f3c6b28425cd3`.

Results:
- 300/300 accessible;
- recovery from NULL: surface 107, bedrooms 70, bathrooms 6, rooms 2;
- high-confidence: **2 fields** = rooms 2;
- review: **183 fields** = surface 107 + bedrooms 70 + bathrooms 6;
- price recovery: 0;
- price rejections: no explicit price 296, unknown transaction 4;
- conflicts: 0;
- Neon access/write: 0/0.

Conclusion: Atlas is accessible but low-yield for high-confidence recovery; keep only review-grade enrichment plus explicit rooms.

## 1IMMO — ACTIVE

Freeze denominator: 243 KEEP+eligible rows; full-population benchmark launched.
Offline URL audit:
- 116 explicit sale routes;
- 63 explicit rent routes;
- 64 ambiguous routes kept `unknown`.

Workflow HEAD: `cd4f3780309e36dd0f83f597c186ef6d3803c2c5`.
Run: `36649107103` — in progress at last check; previous source jobs skipped.

Next prepared source: Kawtar Immobilier (140 KEEP+eligible), with route semantics fully explicit in the canonical freeze: 121 sale + 19 rent + 0 unknown; 0 short-stay marker.


## 1IMMO 243 — CORRECTED AND CERTIFIED

Corrected run `36649697466` on HEAD `68e21d4d6e6b6f416d3c973358cf636dc7f8742c`: SUCCESS.
Artifact: `11069743607`, digest `sha256:058394192886bc8b47675e30074213d4bd8aefacb266d84c9d4a6c37acec89dc`.

Results:
- sample: 243/243 (full freeze population for source);
- robots allowed: 243;
- HTTP 200 accessible: 201;
- recovery from NULL: price 67, surface 38, bedrooms 11, bathrooms 1, rooms 2;
- high-confidence: **69 fields** = price 67 + rooms 2;
- review: **50 fields** = surface 38 + bedrooms 11 + bathrooms 1;
- conflicts: 0;
- Neon access/write: 0/0.

Price rejection/quarantine classes:
- unknown_transaction 47;
- unknown_rental_cadence 33;
- no_explicit_price 48;
- non_monthly 1;
- sale_too_low 2;
- **price_per_m2_unit 1**;
- **source_extreme_sale_price_review 2**.

Critical semantic fix proven:
- a source JSON-LD Offer of 14,000 MAD where primary description said explicitly 14,000 DH/m² is now quarantined as `price_per_m2_unit`, not treated as total sale price;
- 1immo sale prices >100M MAD are quarantined for source-extreme review rather than accepted automatically.

Conclusion: 1immo recovery is certified only after these safeguards.

## KAWTAR 140 — ACTIVE

Canonical freeze audit: 140 KEEP+eligible rows = 121 explicit sale + 19 explicit rent + 0 unknown + 0 short-stay.
Workflow HEAD: `fe3cef7f6e570202fcad4bbe0a815b08eec9ebd9`.
Run: `36682205119` queued at last check; 1immo and prior sources disabled/skipped on push.


## KAWTAR 140 — CERTIFIED ZERO-YIELD

Run `36682205119` on HEAD `fe3cef7f6e570202fcad4bbe0a815b08eec9ebd9`: SUCCESS.
Artifact: `11081679489`, digest `sha256:bda7a621a490f709e67be98180e4e5aa70c53218ed407cb67c5014bd4690bbd6`.

Results:
- sample: 140/140 (full freeze population for source);
- robots allowed: 140;
- HTTP 200 accessible: 111;
- recovery: 0;
- price rejection: `no_explicit_price` = 111;
- conflicts: 0;
- Neon access/write: 0/0.

Conclusion: Kawtar is certified zero-yield for the current parser/evidence contract. Do not invent enrichment from route-only evidence.

## MULTI-SOURCE OFFLINE CONSOLIDATION — ACTIVE

Canonical source summary created:
- `data/recovery/github-freeze-recovery-certified-source-summary.json`
- all certified source artifacts pinned by run id, artifact id and SHA256 digest.

Reproducible consolidation added:
- `scripts/data/consolidate-freeze-recovery-cohorts.mjs`
- workflow `GitHub Freeze Recovery Consolidation`
- run `36683688893` queued at last check.

The consolidation workflow performs **GitHub-artifact-only** work:
1. download pinned certified artifacts;
2. verify each artifact SHA256;
3. merge offline write-safe/review JSONL;
4. deduplicate by canonical URL + field;
5. apply cross-field guards;
6. fail if duplicate conflicts, write-safe/review overlap or residual semantic issues remain;
7. assert database_access=0 and database_writes=0.

Local preflight expectation — NOT CI-certified yet:
- write-safe: 1,183 raw → **1,180 final**;
- review: 2,005 raw → **2,008 final**;
- duplicate conflicts: 0;
- write-safe/review overlaps: 0;
- three cross-field downgrades:
  - Domio bureau surface 21,342,453 m² → review;
  - Domio terrain surface 650,000 m² → extreme-surface review;
  - Domio commerce price 25,000 MAD with 64 m² = 390.625 MAD/m² → cross-field price quarantine.

Do not present the 1,180 / 2,008 counts as certified until run `36683688893` completes successfully and its artifact is inspected.


## MULTI-SOURCE OFFLINE CONSOLIDATION — CERTIFIED

Run `36683688893`: SUCCESS.
Artifact: `11082996843`.
Digest: `sha256:25509fa488ab3b5b12a28687fda25a1b4a457ecaf5143ce11c05cc89a3f8afc1`.

Certified consolidation result:
- input write-safe rows: 1,183;
- input review rows: 2,005;
- cross-field downgrades: 3;
- **final write-safe rows: 1,180**;
- **final review rows: 2,008**;
- write-safe duplicate conflicts: 0;
- review duplicate conflicts: 0;
- write-safe/review same URL+field overlap: 0;
- residual semantic issues: 0;
- database_access: 0;
- database_writes: 0.

Cross-field downgrades applied and proven in CI:
1. Domio terrain surface 650,000 m² → review (extreme_surface_over_100000m2_review).
2. Domio bureau surface 21,342,453 m² → review (extreme_surface_over_100000m2_review).
3. Domio commerce price 25,000 MAD with 64 m² = 390.625 MAD/m² → price review (cross_field_sale_price_per_m2_outlier).

Canonical consolidation metadata is now recorded in:
`data/recovery/github-freeze-recovery-certified-source-summary.json`.

### HUMAN GATE

All immediately executable offline recovery work for this certified cohort is complete.
The next meaningful step would be a controlled Neon write/readback of the **1,180 write-safe field rows**, followed by post-write verification. This is intentionally NOT executed without explicit human authorization.

No Neon read or write has occurred in this recovery path.


## FULL-FIELD RECOVERY V1 — STARTED

Goal: for every recoverable listing, extract every useful canonical field that is actually supported by source evidence, with explicit provenance/confidence and no invented values.

Contract:
- `data/recovery/full-field-recovery-v1-contract.json`
- canonical schema source: `lib/property-schema/core.ts`
- UI field surface: `lib/listings/types.ts`
- reuse existing tested parser: `scripts/scrapers/utils/extract.ts` (`extractDetail`, including P8A advanced property characteristics)

Rules:
- each candidate is `write_safe`, `review`, `missing`, `contradicted`, or `blocked`;
- absence of a boolean feature mention is `missing`, never `false`;
- no phone/email/WhatsApp/private address extraction;
- no gallery reuse without permission;
- no DB access/write;
- strict price + transaction semantics remain governed by the already certified recovery pipeline, not weakened by this new pass.

Implemented:
- `scripts/data/github-freeze-full-field-recovery.ts`
- `.github/workflows/github-freeze-full-field-recovery.yml`
- first pilot target: Domio 100 deterministic freeze rows.

Pilot intent: stress-test title/description/location/core dimensions + P8A fields (built/land/garden/terrace/garage/floors/condition/age/orientation/floor type/features) before scaling nationally.


## FULL-FIELD RECOVERY — DOMIO 100 CERTIFIED BASELINE / MAROCIMMO 300 ACTIVE

Domio corrected run `36698973902` on HEAD `7860906456ce886cb070edd78a33863919025759`: SUCCESS.
Artifact `11089447063`, digest `sha256:d1f6ea351797fb85b31f018eeff2f120591ed8a2328d3b025f1bd1927d5e16d3`.

Corrected Domio pilot summary:
- freeze population 10,307; deterministic sample 100;
- robots allowed 100/100; HTTP200 100/100;
- write_safe fields 570;
- review fields 204;
- contradicted fields 37;
- DB access/write 0/0.

Critical regression fixed before certification:
- JSON-LD numeric strings with decimals no longer inflate by x10 (`168.0` stays 168);
- structured/text bedrooms and bathrooms are bounded fail-closed (<=20); rooms <=50;
- extreme core surface >100,000 m² is review, never auto-write.

Corrected observed ranges on the 100 rows:
- surface_m2 candidates 1.5..13,000; the 1.5 m² case is review, not write-safe;
- rooms_count 1..8;
- bedrooms_count 0..7;
- bathrooms_count 0..6.

Scale decision:
- MarocImmo selected next: 37,268 KEEP+eligible freeze rows and major missing-field reservoir.
- Full-field runner now has explicit 250 ms pacing by default.
- Workflow now runs the P8A regression test before source extraction.
- Domio job disabled on push; MarocImmo 300 becomes the only active full-field source job.

Policy note: Mubawab has 81,975 KEEP+eligible rows but is classified `third_party_legacy` by `lib/sources/source-access-registry.ts`; it may be audited offline but must not be newly persisted/published under current doctrine.


## FULL-FIELD RECOVERY — MAROCIMMO 300 CERTIFIED / SAROUT 300 ACTIVE

MarocImmo run `36699305181` on HEAD `ffdbf3167b50efe1a5cf3e971c22d1f4e095dffe`: SUCCESS.
Artifact `11088759023`, digest `sha256:bdbaebc50c9b4819706db317802ca346e5fbf64cd4b1ecd4e6733a5fa4cce229`.

Certified MarocImmo sample:
- freeze population 37,268; deterministic sample 300;
- robots 300/300; HTTP200 300/300;
- write_safe fields 1,118;
- review fields 1,254;
- contradicted fields 0;
- DB access/write 0/0.

Key field yields:
- transaction_type 300 write-safe;
- property_type 276 write-safe;
- title 264 write-safe;
- city 264 write-safe;
- description 4 write-safe + 260 review;
- surface_m2 279 review;
- bedrooms 3 write-safe + 53 review;
- rooms 3 write-safe + 17 review;
- bathrooms 4 write-safe;
- images_count 300 review; thumbnail_url 300 review.

Observed ranges audited: surface 5..6,759 m²; bedrooms 1..10; rooms 2..6; bathrooms 1..2. No suspicious extreme remained in the inspected sample.

Next: Sarout 300 full-field on the canonical freeze. MarocImmo disabled on push; Sarout is the only active full-field source job.


## FULL-FIELD RECOVERY — SAROUT 300 CERTIFIED / PROMOIMMO 300 ACTIVE

Sarout corrected run `36701726220` on HEAD `9218a3ca4059404f9a4dc53ae1745abc30d1af72`: SUCCESS.
Artifact `11090975222`, digest `sha256:b2eff408f07806d9d877e4e52ba9ecc6f263f6c0c766681e16436d0865d65e14`.

Certified Sarout sample:
- freeze population 43,794; deterministic sample 300;
- robots allowed 300/300; HTTP200 226/300;
- write_safe fields 1,364;
- review fields 762;
- contradicted fields 2 (description only; not overwritten);
- DB access/write 0/0.

Key field yields:
- transaction_type 218 write-safe;
- title 224 write-safe;
- city 217 write-safe;
- property_type 110 write-safe;
- surface_m2 143 write-safe + 69 review;
- rooms 109 write-safe + 39 review;
- bedrooms 50 write-safe + 40 review;
- bathrooms 69 write-safe + 111 review;
- description 224 write-safe + 2 contradicted;
- images_count + thumbnail_url 226 review each.

Audited ranges: surface 13..25,000 m²; bedrooms 1..14; rooms 1..12; bathrooms 1..16. Bathroom extremes 15-16 are review-only. Nonpositive surfaces are now omitted as missing.

Availability limitation: 74/300 sample pages were non-HTTP200 in this run; source availability remains a scale constraint and is not treated as parser failure.

Next: PromoImmoMarrakech 300 full-field. Sarout is disabled on push; PromoImmo becomes the only active source job.

DarAgadir note: detail-fetch/content recovery is NOT started because current repo policy states `detail_fetch_policy=legal_review_required` and `content_reuse_policy=unknown`; no bypass.


## FULL-FIELD RECOVERY — PROMOIMMO 300 CERTIFIED / MASAKEN 300 ACTIVE

PromoImmoMarrakech run `36702453856` on HEAD `88563faf1a10575997fbc0107e74e3c18d9a7090`: SUCCESS.
Artifact `11090897044`, digest `sha256:ccc25c33a47423469336f5c7e41fc6ba4c1a3bc4fbc03df1e8c7e4f4009fbca4`.

Certified PromoImmo sample:
- freeze population 3,716; deterministic sample 300;
- robots 300/300; HTTP200 300/300;
- write_safe fields 776;
- review fields 1,563;
- contradicted fields 0;
- DB access/write 0/0.

Key yields:
- transaction_type 300 write-safe;
- title 299 write-safe;
- property_type 177 write-safe;
- description 293 review;
- surface 289 review;
- bedrooms 300 review;
- rooms 112 review;
- bathrooms 55 review;
- thumbnails 300 review;
- pool 128 review.

Audited ranges: surface 26..46,460 m²; rooms 2..18; bedrooms 0..11; bathrooms 1..5; plot surface 26..2,000 m². Largest total surfaces map to explicit terrain URLs and remain review-only.

Next: Masaken 300 full-field. PromoImmo disabled on push; Masaken becomes the only active source job.


## FULL-FIELD RECOVERY — MASAKEN 300 CERTIFIED / LSF 300 ACTIVE

Masaken run `36720602165`: SUCCESS. Artifact `11097624372`, digest `sha256:acf8158e30f528afc3416885ef7725abbdf1de9c343a6b7ed5639536f5c6a665`.

Certified sample: population 2,047; sample 300; robots 300; HTTP200 270; HTTP410 30; write_safe 473; review 1,495; contradicted 0; DB 0/0.

Yields: transaction 254 write-safe; property type 219 write-safe; description 270 review; surface 264 review; bedrooms 172 review; bathrooms 215 review; rooms 52 review; condition 207 review; property age 155 review.

Audited ranges: surface 15..100,000 m2; bedrooms 0..11; bathrooms 0..10; rooms 1..10; floors 2..9. Largest surfaces map to terrain URLs and are review-only.

Next: LSF full-field 300. Masaken disabled on push; LSF is the only active full-field job.


## FULL-FIELD RECOVERY — LSF 300 CERTIFIED / AYKANA 300 ACTIVE

LSF run `36722698020` on HEAD `7cc7850cc3d0c1774d525b0ea397bcb36117be62`: SUCCESS.
Artifact `11101293461`, digest `sha256:caf3e36d4092deaa4f9ed4fe5bbaf38c4db40b254fe146cb5e60640b9757e362`.

Certified LSF sample:
- freeze population 513; deterministic sample 300;
- robots 300/300; HTTP200 299/300; HTTP404 1/300;
- write_safe fields 813;
- review fields 2,688;
- contradicted fields 0;
- DB access/write 0/0.

Key yields: title 299 write-safe; transaction 280 write-safe; property type 234 write-safe; description 299 review; surface 294 review; rooms 207 review; bedrooms 219 review; bathrooms 169 review; images 299 review; thumbnail 298 review; pool 206 review; kitchen 197 review.

Audited ranges: surface 4..110,000 m2; bedrooms 1..10; rooms 1..23; bathrooms 1..15. High numeric extremes are review-only, never write-safe.

Next: Aykana full-field 300. LSF disabled on push; Aykana is the only active full-field source job.


## FULL-FIELD RECOVERY — AYKANA 300 CERTIFIED / ATLAS 300 ACTIVE

Aykana run `36725494949` on HEAD `3ac3a5fb9d1fee19db72bb20ed80aa0e6e648454`: SUCCESS.
Artifact `11102612060`, digest `sha256:74386cca1198fee420dc034d4ac8eec29a7cd615bdfd03209e5c38e0be734ac3`.

Certified Aykana sample:
- freeze population 474; deterministic sample 300;
- robots 300/300; HTTP200 300/300;
- write_safe fields 883;
- review fields 1,745;
- contradicted fields 0;
- DB access/write 0/0.

Key yields: title 300 write-safe; transaction 299 write-safe; property type 150 write-safe; city 67 write-safe; district 67 write-safe; description 300 review; surface 271 review; bedrooms 207 review; bathrooms 131 review; thumbnail 232 review; equipped kitchen 144 review; pool 92 review.

Audited ranges: surface 1.5..370,000 m2; bedrooms 1..6; bathrooms 1..6; rooms 2..9. Very large surfaces map to explicit terrain URLs and are review-only.

Next: AtlasImmobilier full-field 300. Aykana disabled on push; Atlas is the only active full-field source job.


## FULL-FIELD RECOVERY — ATLAS 300 CERTIFIED / 1IMMO 243 ACTIVE

Atlas run `36728651624` on HEAD `95f6d2ef3f6e60c4d97b438814db3e8e2074f095`: SUCCESS.
Artifact `11105070017`, digest `sha256:ee7553a90ed6ca0a18e316874347927fa794615bbff84b7cb153e9101c78ca64`.

Certified Atlas sample:
- freeze population 362; deterministic sample 300;
- robots 300/300; HTTP200 300/300;
- write_safe fields 775;
- review fields 1,847;
- contradicted fields 0;
- DB access/write 0/0.

Key yields: title 300 write-safe; property type 216 write-safe; transaction 83 write-safe; description 176 write-safe + 108 review; surface 286 review; rooms 232 review; bedrooms 259 review; bathrooms 206 review; image count + thumbnail 265 review each.

Audited ranges: surface 5.6..93,000 m2; rooms 1..13; bedrooms 1..13; bathrooms 1..13; plot 40..61,752 m2. All numeric core fields are review-only in this sample; no dangerous auto-write.

Next: 1immo full-field 243 (entire freeze population). Atlas disabled on push; 1immo is the only active full-field source job.
