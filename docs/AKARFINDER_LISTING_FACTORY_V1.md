# AkarFinder Listing Factory V1

Status: ACTIVE — certification required before merge.

## Goal
Produce one canonical, auditable quality passport for every structured listing without rebuilding the existing acquisition/intelligence stack.

## Success
A listing processed by the existing structured pipeline exposes distinct, explainable dimensions for completeness, trust, media quality and ranking quality. Search relevance remains lexicographically dominant. No market benchmark may inflate intrinsic listing quality.

## Proof required
- deterministic unit tests for quality dimensions and fail-closed behavior;
- TypeScript compile validation;
- dedicated GitHub Actions run green on the exact HEAD;
- PR diff review;
- no production DB write and no Vercel deployment in this lot.

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

## Certification score gate
Internal implementation score must be strictly greater than 9.5/10 before closeout.
Scoring dimensions: semantic correctness 25%, safety/fail-closed 20%, reuse/compatibility 15%, test coverage 20%, ranking separation 10%, explainability 10%.

Current score: NOT CERTIFIED.
