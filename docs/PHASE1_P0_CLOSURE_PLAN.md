# Phase 1 — P0 closure plan

Status target: `P0_CODE_CLOSED_RELEASE_CERTIFICATION_PENDING`

Release rule: no Vercel Preview or Production deployment during Phase 1 implementation. Production certification happens once, at the explicit end-of-phase release gate.

## Closure sequence

1. Freeze `main` baseline and work only from a dedicated P0 branch.
2. Close all code-actionable P0 findings.
3. Add non-regression contracts for every closed finding.
4. Prepare production-only release checks for findings that cannot be certified without the single end-of-phase deployment.
5. Run canonical CI, typecheck and production build.
6. Merge only when green.
7. Produce a 20/20 finding ledger with `CLOSED` or `RELEASE_GATED`, never `PARTIAL` or `OPEN`.

## P0 ledger and acceptance criteria

| ID | Finding | Required closure evidence |
|---|---|---|
| 001 | Baseline PROD/MAIN drift | Release gate pins exact `main` SHA and certifies deployed SHA equals it. |
| 011 | Public Search visibility gap | Read-model/publication path is code-certified; release preflight proves required DB/Search flags and post-deploy smoke proves non-empty eligible searches when inventory exists. |
| 012 | MAIN/PROD Search behavior drift | Same exact SHA and runtime contract certified at release gate. |
| 013 | Search product identity contradiction | `main` uses “moteur de recherche immobilier”; production wording certified only at release gate. |
| 019 | Result regime confusion | External web, persisted external and authorized structured/partner results have mutually exclusive display contracts and labels. |
| 024 | Search Profile information loss | Legacy profile path converges into Companion/Mon Projet and no longer owns a competing state model. |
| 025 | Search Profile parameter mismatch | Canonical transaction query contract uses `type` / `transaction_type` accepted by Search. |
| 028 | Companion profile → Search information loss | Rich Companion intent is preserved through canonical handoff/recovery state. |
| 030 | Companion not connected to User Continuity | Authenticated Companion creates/persists Mon Projet; guest state has recovery snapshot. |
| 033 | Acheter self-loop | Intent hub hands off filtered/full exploration to `/search`. |
| 035 | Acheter result count wrong scope | Count uses scoped search total, not global stats. |
| 036 | Intent card/detail contract mismatch | External results never masquerade as internal detail pages; original-source contract enforced. |
| 040 | Louer budget visual only | Budget constraints are applied server-side. |
| 047 | CTA label/destination mismatch | Human-advisor CTA reaches human accompaniment, not buyer-profile onboarding. |
| 048 | Four parallel buyer journeys | Functional routes converge on Companion → Mon Projet; legacy URLs remain redirects only, not separate state machines. |
| 051 | Three disconnected geo sources | Canonical Geo Entity Registry is the identity source for SEO/Map/Search adapters. |
| 052 | Geo entity normalization gap | Public Search canonicalizes known city/neighborhood aliases; aliases cannot create separate user-facing entities. |
| 058 | Map intelligence disconnected from SEO neighborhoods | SEO neighborhood pages resolve intelligence from the same canonical geo identity used by map points. |
| 063 | Geo taxonomy validation gate | Only validated + explicitly eligible entities can generate SEO routes. |
| 068 | Public Pro CTA points to retired internal surface | Public `/pro` contains no CTA to legacy `/pro/leads`; legacy route remains redirect-only compatibility. |

## Release-gated findings

`001`, `011`, `012`, and `013` require a production runtime/deployment proof. They may be marked `RELEASE_GATED` after all code and preflight checks are green, but never `CLOSED_PROD` before the single end-of-Phase-1 Vercel deployment.

## Definition of done before resuming P1

- No P0 is `OPEN` or `PARTIAL`.
- Every code-actionable P0 is `CLOSED` with a regression check.
- Production-only P0s are `RELEASE_GATED` with exact executable release checks.
- CI, typecheck and build are green.
- No Vercel deployment occurred.
