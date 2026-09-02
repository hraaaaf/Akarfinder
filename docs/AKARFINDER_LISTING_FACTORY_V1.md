# AkarFinder Listing Factory V1

Status: CLOSED.

## Goal
Produce one canonical, auditable quality passport for every structured listing without rebuilding the existing acquisition/intelligence stack.

## Success
A listing processed by the existing structured pipeline exposes distinct, explainable dimensions for completeness, trust, media quality and ranking quality. Search relevance remains lexicographically dominant. No market benchmark may inflate intrinsic listing quality.

## Reused existing blocks
- CanonicalPropertyV1 / CanonicalOfferV1
- safe adapters and enrichWithoutInventing
- information completeness
- freshness/provenance V2
- anomaly engine V1
- multi-source intelligence V1
- structured listing pipeline V1
- current lexicographic search ranking

## New contract
### 1. Completeness score
Existing type-aware information completeness. Measures presence of useful information only.

### 2. Trust score
Weighted only from documentary signals:
- provenance 35%
- freshness 30%
- coherence 25%
- multi-source corroboration 10%

Missing dimensions are excluded. Trust is unavailable if fewer than 60% of trust weight is observable.

### 3. Media score
Only media with `rights_status=allowed` AND `publication_permission=allowed` can contribute.
Images: first image 35, >=3 +20, >=6 +20, >=10 +15. At least one publishable floor plan +10. Maximum 100.

### 4. Ranking quality score
`45% completeness + 40% trust + 15% media`.
This is a tie-break quality signal only. It MUST NOT outrank a result with materially weaker search relevance.

### 5. Market context
Explicitly excluded from intrinsic listing quality. Market intelligence remains a separate analytical output.

## Fail-closed rules
- no trust score if coverage <60%;
- no ranking quality if trust is unavailable;
- contradictory multi-source evidence contributes 0 corroboration, never a bonus;
- unavailable data is never silently converted to a negative truth claim;
- no hidden suppression of low-quality but relevant inventory solely because quality is low.

## Certification
Certified implementation HEAD before closeout docs commit:
`af6d660538a771115b52619fb95b88699b226fed`

Final PR HEAD:
`b43639ab4a59e5857f2e7d97a2f7d85c7b6c7e3d`

Dedicated workflows:
- run `33622146981` on implementation HEAD — SUCCESS
- job `100221382590` — SUCCESS
- run `33629888200` on final PR HEAD — SUCCESS
- Listing Factory V1 tests — SUCCESS
- end-to-end Factory proof — SUCCESS
- TypeScript compile — SUCCESS

General PR CI on final PR HEAD at merge time:
- 7 workflows SUCCESS
- 2 workflows FAILURE on pre-existing frozen contracts outside this PR's changed files:
  - `33629891691` Phase 1 P1 Search Truth Gate: same district-routing source-string contract family previously classified outside this PR.
  - `33629891741` UX-SEARCH-FINAL-10OF10-1: same toolbar source-string contract family previously classified outside this PR.
- 2 visual/UI certification workflows were still in progress at merge time; Listing Factory V1 changes no UI component and GitHub accepted the guarded squash merge.

Safety evidence:
- no production DB write;
- no Vercel deployment;
- no review threads.

## Certification score
Scoring dimensions: semantic correctness 25%, safety/fail-closed 20%, reuse/compatibility 15%, test coverage 20%, ranking separation 10%, explainability 10%.

- semantic correctness: 9.8/10
- safety/fail-closed: 10.0/10
- reuse/compatibility: 9.8/10
- test coverage: 9.7/10
- ranking separation: 10.0/10
- explainability: 9.7/10

Weighted score: **9.83/10**.

Gate: PASS (>9.5/10).

The score does not certify the two unrelated failing repository-level frozen contracts. Those remain separate baseline debt and are not attributed to Listing Factory V1.

## Closeout
- PR #984 — squash-merged.
- final PR HEAD: `b43639ab4a59e5857f2e7d97a2f7d85c7b6c7e3d`.
- merge/main commit: `797a31c4d1886e8594ef7d9031faa0e17c237514`.
- exact parent before merge: `31174a4527c6034a08943d25a9de9811a90480c1`.
- GitHub commit verification: `verified=true`, reason `valid`.
- merge commit tree matches the final PR tree `5756879884f21869706812e8fa84fb48d08f2d98`.
