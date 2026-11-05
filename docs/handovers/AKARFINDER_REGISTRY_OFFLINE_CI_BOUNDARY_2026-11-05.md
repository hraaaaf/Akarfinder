# AkarFinder — P1B.11 / P1B.13C offline CI boundary (2026-11-05)
**Status:** Draft only. Not merged. No hosted Supabase calls performed.

## Goal / Success / Proof
Prevent automatic PR and push CI from reading the hosted Supabase source. Success: both historical registry SQL checks and PGlite local semantic rehearsals run without injecting any cloud DB secrets, and a boundary regression test fails if live predecessor scripts or remote secret interpolation return. Proof: exact GitHub CI runs of this Draft PR (not established merely by code review).

## Prior verified violations on main
- P1B.11: `pull_request` / `push main` ran `p1b9-tier-a-registry-candidate-review.ts` with `secrets.SUPABASE_URL` and `secrets.SUPABASE_SERVICE_ROLE_KEY`. It calls `getSupabaseServerClient()`.
- P1B.13C: same triggers, job-level cloud secrets; live predecessor `p1b13a-oasis-registry-candidate-review.ts` calls `getSupabaseServerClient()`.
- These are **remote reads** even if the workflows are named production write gates. Unacceptable for dev/CI under owner's current policy.

## Changed (Draft)
- Rename two workflows to **Offline Design Gate**, remove live predecessor reads, secret injection and live verdict enforcement.
- Preserve certified SQL equality/rollback/ineligibility static invariants, local PGlite rehearsal, TypeScript, and PR/push triggers.
- Install from lockfile without lifecycle scripts; call local `tsx` / `tsc` executables; fail if hosted DB variables exist.
- `scripts/audits/tests/registry-offline-ci-boundary.test.mjs` checks both workflows.
- **Removal of live predecessor checks is not evidence for production write readiness.** Production live gate remains **UNKNOWN / not certified**, requiring separate explicit permission.

## Other known independent risks
`neon-migration-validation-suite.yml` manually `pg_dump`s the cloud source, and `openserp-github-native-ingestion.yml` manually injects hosted Supabase secrets. Neither is invoked or changed here. Other workflows and previews are NOT certified offline. See security issue #1165.

## Remaining sequence
1. Verify exact Draft PR SHA and CI (offline guard tests, SQL PGlite rehearse, TypeScript).
2. If failures, diagnose and patch without relaxing the policy.
3. Audit further hosted DB accesses, prepare repo-wide enforceable guard with exceptions only for separately authorized production actions.
4. No merge, hosted DB action, deletion, Vercel deployment, or production secret change without explicit approval.

## 05/11/2026 — CI first run / fix efficiency policy
First exact-head `2a9d5b13599a72b5ad1d55466a27a1c48f3c8378`: [P1B.11 offline #42112508241](https://github.com/hraaaaf/Akarfinder/actions/runs/42112508241) and [P1B.13C offline #42112508059](https://github.com/hraaaaf/Akarfinder/actions/runs/42112508059) job-level **SUCCESS**, confirming the local PGlite and static boundary tests ran. Independent [CI Workflow Efficiency Policy #42112507910](https://github.com/hraaaaf/Akarfinder/actions/runs/42112507910) **FAILURE** because original workflow files lacked per-PR top-level concurrency. Fix in this commit: each workflow now uses `github.workflow` + `github.event.pull_request.number || github.ref` and `cancel-in-progress: true` (matches real validator). The exact new SHA CI must be checked; do not claim whole PR green before evidence.
