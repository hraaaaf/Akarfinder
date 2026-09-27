# AkarFinder — Clean Corpus V4.11 → Neon isolated import — Closeout — 2026-09-26

## Goal

Certify the recovered Clean Corpus V4.11 offline, select a conservative import cohort, import only that cohort into an isolated Neon branch, and prove database integrity/readback without touching Neon production or Vercel.

## Certified offline corpus

- Rows: 226,286
- KEEP: 225,952
- EXPIRED: 45
- NON_REAL_ESTATE: 289
- Product-scope eligible: 222,359
- Product-scope ineligible: 3,927
- Short-stay: 3,613
- Deep observations: 10,500
- Deep unique URLs: 10,495
- HTTP200 observations: 8,492
- Unique HTTP200 URLs: 8,487
- Rematerialization run: 36259114168 — SUCCESS
- Artifact: 10910779576
- Artifact digest: sha256:63b93f5b27434b545ec9196b571d6bc89b1da5350c6115fdbe977991d1c39c81
- Core gzip SHA256: e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953
- V4 safety tests: 36262662757 — SUCCESS
- Efficiency Policy: 36262666227 — SUCCESS

## Conservative Neon cohort

Initial mechanically safe candidates: 8,388.

Selection requirements:
- KEEP
- scope_eligible
- direct HTTP200
- no contradiction flag
- deterministic source-route property type
- deterministic source-route transaction type
- title present
- city present
- published_at <= 365 days

Type normalization:
- Neon surface_m2 is integer.
- Two decimal values (68.42 and 88.5) were explicitly rounded to nearest integer while raw values were retained in the candidate artifact.

G6 cross-source identity audit:
- Run: 36278625327 — SUCCESS
- Artifact: 10918695596
- Artifact digest: sha256:3ea1d6571e7c58c5f10fc6daf4cf2fac4ac6ef7db5df0d57f5ef938b876fe055
- Strong cross-source collision groups: 0
- Broad ambiguous groups: 2
- Quarantined rows: 21
- Final G6-safe cohort: 8,367
- Safe JSONL SHA256: 18b810d3eb07e0fb293cc815d6f4c5506126fa1ed3926b6f4fc14abbd67fb695
- Domains: MarocImmo 4,473 / Domio 3,462 / Sarout 432
- Existing isolated-Neon direct URL overlap: 0
- Schema compatibility errors: 0

## Human gate

User explicitly authorized the isolated import with: `Go import`.

Approval payload:
- commit: 9d406ea10b43969bd06812f69c5c2e09b7407867
- rows: 8,367
- cohort SHA256: 18b810d3eb07e0fb293cc815d6f4c5506126fa1ed3926b6f4fc14abbd67fb695
- target project: ancient-violet-43534870
- target branch: br-cold-mouse-b2a50yaa
- target database: AkarFinder

## Import execution

Pre-import isolated-Neon readback:
- property_listings: 177
- listing_sources: 177
- V4.11 sources: 0

GitHub import workflow run 36278856045 attempt 1 failed before DB access because the repository secret `NEON_RECOVERY_DATABASE_URL` was unset. After the secret was added, attempt 2 passed the approval payload, isolated-endpoint guard, artifact download, and staging of all 8,367 rows. The workflow then reported a SQL quoting error in the import step. An independent Neon readback immediately afterward verified the complete selected cohort present and consistent on the isolated branch, so no retry or duplicate import was performed.

## Final independent readback

- property_listings: 8,544
- listing_sources: 8,544
- V4.11 sources: 8,367
- V4.11 active sources: 8,367
- orphan properties: 0
- duplicate listing URLs: 0
- duplicate canonical fingerprints: 0
- V4.11 missing core fields: 0
- V4.11 bad provenance: 0

Source distribution:
- domio.ma: 3,462
- marocimmo.com: 4,473
- sarout.ma: 432

Search smoke examples returned non-empty filtered cohorts for Casablanca, Rabat, Tanger, Bouskoura, Agadir, Marrakech and additional cities.

## Gate result

- G1 PASS
- G2 PASS
- G3 PASS
- G4 PASS
- G5 PASS
- G6 PASS
- G7 PASS
- G8 PASS
- G9 PASS_FOR_SELECTED_COHORT
- G10 PASS
- G11 PASS
- G12 PASS

Status: SELECTED_COHORT_IMPORT_CERTIFIED.

## Safety boundaries

- Neon production branch writes: 0
- Vercel deployment: 0
- Supabase reads after certified freeze: 0
- This closeout certifies only the selected 8,367-row cohort on the isolated Neon branch.
- It does not authorize promotion to Neon production, app runtime migration to Neon, Vercel deployment, or bulk import of the remaining eligible corpus.

## Known follow-up

The GitHub Actions secret `NEON_RECOVERY_DATABASE_URL` is now configured for the isolated Neon branch. Workflow attempt 2 confirmed the secret and endpoint guard worked. The controlled-import workflow still needs its SQL quoting bug corrected before it should be reused; the certified 8,367-row cohort must not be re-imported merely to test that workflow.

## Next exact

New human gate: decide whether to promote the isolated Neon dataset toward production/runtime integration. Before any promotion, compare isolated vs production schema/data, define rollback, run application search smokes against Neon, and obtain explicit production/deployment authorization.
