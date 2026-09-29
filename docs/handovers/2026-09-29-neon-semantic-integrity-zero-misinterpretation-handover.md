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
