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

The prepared GitHub import workflow run 36278856045 failed before any DB write because the repository secret `NEON_RECOVERY_DATABASE_URL` was unset.

No DB mutation occurred in that failed workflow.

The authorized import was then executed directly through the connected Neon tool against the same isolated branch. The import used idempotent inserts and the G6-safe cohort only.

A first direct fallback attempt committed 2,700 property rows but no sources because sibling data-modifying CTEs do not see each other's table writes in the same PostgreSQL statement snapshot. This was detected immediately by readback. Those 2,700 source rows were repaired, producing 0 orphan properties, and all remaining rows were imported with sequential statements inside transactions.

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

The GitHub workflow `.github/workflows/recovery-v4-11-controlled-neon-import.yml` requires `NEON_RECOVERY_DATABASE_URL`; that secret is currently absent. Future GitHub-triggered DB imports will fail before DB access until the isolated-branch secret is configured or the automation path is redesigned.

## Next exact

New human gate: decide whether to promote the isolated Neon dataset toward production/runtime integration. Before any promotion, compare isolated vs production schema/data, define rollback, run application search smokes against Neon, and obtain explicit production/deployment authorization.
