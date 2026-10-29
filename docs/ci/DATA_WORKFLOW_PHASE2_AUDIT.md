# AkarFinder — legacy DATA CI / phase-2 risk audit

Audit date: 2026-10-27. Scope: **8 workflow files examined on `main`**, not the entire 549-file workflow inventory. This is a static code/config audit, not runtime proof or database inspection. Related: [issue #1119](https://github.com/hraaaaf/Akarfinder/issues/1119) and [CI policy](../CI_EXECUTION_POLICY.md).

## Risk-based classification (observed configuration)

| Workflow | PR heavy build | Top-level concurrency before phase 2 | Prod credential or manual-write sensitivity | Next |
| --- | --- | --- | --- | --- |
| `typesense-odm-shadow-incremental-sync-v1.yml` | `npm run build` | Absent | No secrets; unit test uses injected in-memory callbacks | **Converted in PR #1121**: quick PR + main-only read-only AFTER build |
| `data-mass-x1-candidate-promotion.yml` | No | Absent | No secrets; read-only contract assertions | **Per-PR concurrency added in PR #1121**, no trigger or job change |
| `data-4-3e-first-freshness-write-canary.yml` | Yes | Present | Supabase service-role in dry-run job | Keep guarded; audit data-write behavior before any split |
| `data-4-3g-first-persistent-freshness-batch.yml` | Yes | Absent | Supabase service-role in dry-run job | Audit write boundaries before adding cancellation |
| `data-4-3h-controlled-expansion-to-500.yml` | Yes | Absent | Supabase service-role in dry-run job | Audit write boundaries before adding cancellation |
| `data-4-5b-promoimmo-controlled-expansion-write.yml` | Yes | Absent | Supabase service-role and write-oriented operations | Split **only** safe, in-memory tests after source risk review |
| `data-4-7b-lsf-controlled-expansion-write.yml` | No | Absent | Supabase service-role and controlled write path | Preserve non-overlap semantics; never blindly cancel |
| `openserp-ingestion-cron.yml` | No | Absent | Manual dispatch only; schedule deliberately disabled | **Do not reactivate schedule** as part of CI efficiency work |

### First controlled slice — PR #1121
- `typesense-odm-shadow-incremental-sync-v1.yml`: quick focused unit test, TypeScript and shadow isolation guard only on PR; targeted `paths`; workflow/PR concurrency cancels obsolete checks.
- New `typesense-odm-shadow-incremental-sync-v1-after.yml`: `push` restricted to `main` with targeted paths, optional main-guarded manual dispatch, `npm run build`, `contents: read`, no DB/Typesense service secrets and no mutation steps.
- `data-mass-x1-candidate-promotion.yml`: add per-PR concurrency to an existing read-only contract workflow without changing its triggers, jobs, or dispatch.
- Pre-merge gate: cheap tests + workflow efficiency policy + required Product Constitution Gate. Post-merge gate: successful exact-main-head Typesense AFTER build. Do not certify before both.
- No Vercel deployment, DB write, ingestion activation or schedule change.

## Remaining work
Classify further DATA/Neon legacy workflows with source and job analysis rather than the filename alone. Treat any `SUPABASE_SERVICE_ROLE_KEY`, `NEON_DATABASE_URL`, deployment or write-capable job as **protected until proven safe**. Preserve explicit human confirmations, dry-run boundaries, rollback and idempotency, and `cancel-in-progress:false` for ongoing mutations. Create separate PRs for proven read-only AFTER splits.

**Limits:** The initial workflow inventory before #1114 counted 539, then 549 after new AFTER files; this document proves only the eight rows above. The audit and first slice do not demonstrate global compliance.

## Candidate inventory extension — 107 workflow configs read (2026-10-27)

In addition to the eight **deep-reviewed** files above, a **static config sweep** inspected every one of the **107 workflow YAML filenames** matching `data|supabase|neon|ingest|crawl|scrap|backfill|import|sync|pipeline|mubawab|agenz|domio` (case-insensitive) in the initial 549-file `.github/workflows` inventory. All eight scan batches returned a readable file; this is a **name-filtered subset**, not an all-repo exhaustive audit.

For each candidate, the sweep checked textual presence of `pull_request`, `push`, `workflow_dispatch`, `schedule`, top-level `concurrency`, expensive build/Chromium/test tokens, and references to production service/database/deployment credentials. These are **candidate indicators**, not proof that a secret is usable or that a step writes; nor is the absence of keywords proof of safety.

Notable patterns to investigate **before editing**:
- Legacy PR-heavy jobs with credential references: DATA-4.3F/3G/3H, DATA-MASS-3A/3B, and other DATA qualification/audit files. Existing safeguards may rely on read-only flags, confirmations or pinned identifiers that must survive conversion.
- Manual or push execution with sensitive credentials: Neon migration validation, SEO5D price writer, OpenSERP ingestion, and historical Common Crawl pipelines. Do not convert writers to automatic post-merge jobs.
- `openserp-ingestion-cron.yml` intentionally has no active schedule; never reactivate incident-prone cadence implicitly.
- Plain PR jobs with missing concurrency, such as `data-coverage-gap-auditor-gate.yml`, are lower-risk *candidates* for a separate cheap-tests / main-only-heavy split only after verifying their job commands.

The other workflow files outside the 107-name filter remain **unexamined by this sweep**. Record precise write safety by reading called scripts, checking actual env guards and dry-run tests before selecting each subsequent PR.

## First-slice certification
- [PR #1121](https://github.com/hraaaaf/Akarfinder/pull/1121) merged at `e32618462d099da4da0413cc5937d20a4a9ccb89` after **4/4 PR checks SUCCESS** (policy, Typesense, MASS-X1, Product Constitution).
- [Typesense AFTER run 40524923722](https://github.com/hraaaaf/Akarfinder/actions/runs/40524923722) on the exact merge HEAD completed **SUCCESS**. This certifies the scoped build relocation and the changed workflows only, not all DATA pipelines.
- [Issue #1119](https://github.com/hraaaaf/Akarfinder/issues/1119) stays OPEN for risk-screened legacy expansion.

## Second risk-reviewed read-only slice — PR #1123 (2026-10-29)

- [PR #1123](https://github.com/hraaaaf/Akarfinder/pull/1123) merged into `main` at `04514897f37c1a6eb7fdd862e8edbc65f54cfc8a` after **4/4 PR checks SUCCESS**: DATA Coverage Gap Auditor Gate, DATA Coverage Mubawab Baseline, CI Workflow Efficiency Policy and Product Constitution Gate.
- `data-coverage-gap-auditor-gate.yml` is now scoped PR unit tests with per-PR cancellation; its previous `npm run build` moved to `data-coverage-gap-auditor-after.yml`, triggered only on targeted `push main`, with read-only permissions, main-guarded manual dispatch and top-level concurrency.
- `data-coverage-mubawab-baseline.yml` gained only top-level PR cancellation. Its existing local evidence/report generation and artifact collection were retained.
- Source check: `scripts/audits/data-coverage-gap-audit.ts` reads a supplied local JSON and writes local JSON/Markdown reports; unit tests use synthetic data. `scripts/audits/data-coverage-mubawab-baseline.ts` reads repository evidence and writes workspace artifacts. The two changed workflows have no configured DB credentials, automatic production deploy, or mutation steps.
- Exact main [DATA Coverage Gap Auditor AFTER 40969065083](https://github.com/hraaaaf/Akarfinder/actions/runs/40969065083) triggered for the merge. **Completed SUCCESS** on the exact merge SHA; this certifies the scoped read-only build step.
- The protected DATA/Neon write pipelines remain outside this migration. Issue [#1119](https://github.com/hraaaaf/Akarfinder/issues/1119) stays open for later risk-reviewed batches.

## Privileged workflow isolation — risk-reviewed slice (2026-10-29)

**Goal:** keep synthetic/read-only contracts on pull requests while ensuring no privileged production Supabase/Neon or external source audit starts automatically from a PR. Heavy `npm run build` should be scoped to read-only main-only AFTER, with no database credentials. A job `skipped` before secrets are injected is stronger evidence than a proof emitted *after* an automatically started credentialed script.

| Workflow family | Before (source-verified) | Change / gating | Evidence |
| --- | --- | --- | --- |
| DATA-4.3G + 4.3H | PR launched service-role `live-dry-run`, fetched DB+sitemaps and each built | [#1125](https://github.com/hraaaaf/Akarfinder/pull/1125), merged `fda6b6bc0b9f31573cf389e751c6237246128117`: unit/TS/static only on PR; live jobs manual main only, after contract; one shared read-only build AFTER | **5/5 PR workflows SUCCESS**. [G 40970344387](https://github.com/hraaaaf/Akarfinder/actions/runs/40970344387) and [H 40970344463](https://github.com/hraaaaf/Akarfinder/actions/runs/40970344463): `contract=success`, `live-dry-run=skipped`. [AFTER 40970467436](https://github.com/hraaaaf/Akarfinder/actions/runs/40970467436) **SUCCESS**, exact merge SHA |
| DATA-4.7B LSF | PR and push automatically invoked service-role post-write certification of prior 250-row cohort; actual `PATCH` writer is separate | [#1126](https://github.com/hraaaaf/Akarfinder/pull/1126), merged `6d047c84bbff4672d788ea774da5dbd9a9363896`: live cert manual main only; contract/static proof on PR and push; per-PR-only cancellation, never cancel manual main | **4/4 PR workflows SUCCESS**. [PR 40970623730](https://github.com/hraaaaf/Akarfinder/actions/runs/40970623730) and [main 40970753365](https://github.com/hraaaaf/Akarfinder/actions/runs/40970753365): `contract=success`, `post-write-certification=skipped`; main workflow SUCCESS |
| DATA-4.5B Promo Immo | PR and push automatically ran `live-read-only-preflight` with service key, while referenced writer source includes guarded actual `PATCH`; heavy PR build | [#1127](https://github.com/hraaaaf/Akarfinder/pull/1127), merged `d2683f233e87e76a41db8df354ac1d905b2de744`: preflight manual main only and explicit `DATA_4_5B_APPLY=false`, empty evidence path; source write logic untouched; heavy read-only build AFTER | **4/4 PR workflows SUCCESS**. [main contract 40971238119](https://github.com/hraaaaf/Akarfinder/actions/runs/40971238119) **SUCCESS** and [AFTER 40971238006](https://github.com/hraaaaf/Akarfinder/actions/runs/40971238006) **SUCCESS**, exact merge SHA |
| DATA-4.3E + 4.3F | PR automatically ran service-key live dry-run/design audit, duplicated build | [#1128](https://github.com/hraaaaf/Akarfinder/pull/1128), merged `67fe7261b1e2eca0b5a6843f9a32838a545b2c48`: live jobs manual main only; PR quick tests and static security guard; one shared AFTER build | **5/5 PR workflows SUCCESS**; [AFTER 40971587486](https://github.com/hraaaaf/Akarfinder/actions/runs/40971587486) **SUCCESS**, exact merge SHA |
| DATA-4.3D + 4.4A/B | PR automatically ran service-key live audits and three heavy builds; 4.4A/B trigger on README/ROADMAP/SESSION | [#1129](https://github.com/hraaaaf/Akarfinder/pull/1129), merged `c02d0b73ed18b0e136d478fab39e71df425173a7`: live jobs manual-only on main; PR unit/TS/static; 1 shared read-only AFTER; unrelated README/ROADMAP/SESSION triggers removed | **6/6 PR workflows SUCCESS**; [AFTER 40972045869](https://github.com/hraaaaf/Akarfinder/actions/runs/40972045869) triggered; exact conclusion pending initial check |

### Safety decisions — do not reverse silently
- The original DATA-4.3D/E/F/G/H and DATA-4.4A/B audit entrypoints were source-read and use GET-style network calls; the PR quick tests are credential-free. An observed dry-run zero-write proof is **not** permission to expose a service-role credential to PR code. The contract jobs now run independently of credentialed live audits.
- DATA-4.5B and DATA-4.7B **have real PATCH writers in separate scripts**. Their confirmation/evidence/rollback contracts remain intact; this governance change does not invoke these writers. The 4.5B privileged preflight explicitly fixes APPLY false with no evidence path; a later operator must not equate a dry-run artifact with authorization to apply.
- The new shared AFTER jobs are guarded to `refs/heads/main`, paths-scoped, with `contents: read` and **no DB service secrets**. Manual DB audits require `workflow_dispatch` on main, with non-cancelling concurrency; **none was dispatched** by this work.
- Release-Neon Preview Deploy, Vercel preflight and provider certification are branch/path-gated to the special release branch, and OpenSERP native ingestion remains manual-only with a separate `cron` write-capable mode. **Do not broaden triggers or schedule** in a CI-efficiency PR; any Vercel deployment and production data write remain separate approval gates.
- The audit documents *workflow/source static checks and GitHub job conclusions*, not DB change-data-capture, runtime credential exposure, or universally compliant legacy workflows. The overall [#1119](https://github.com/hraaaaf/Akarfinder/issues/1119) remains OPEN.

**Next risk candidates:** remaining 4.3C/4.4C/DATA-MASS family live-key jobs, release workflows and manual writer protections, one reviewed file family at a time. Verify all source scripts, credentials and write guards before changes; never blanket-cancel in-flight DB mutations.

Further job-level evidence: [4.5B PR 40970916799](https://github.com/hraaaaf/Akarfinder/actions/runs/40970916799) and [main 40971238119](https://github.com/hraaaaf/Akarfinder/actions/runs/40971238119) both have `contract=success`, `live-read-only-preflight=skipped`; [4.3E PR 40971199651](https://github.com/hraaaaf/Akarfinder/actions/runs/40971199651) and [4.3F PR 40971199712](https://github.com/hraaaaf/Akarfinder/actions/runs/40971199712) both have `contract=success`, privileged live jobs `skipped`. This verifies non-execution on PR/main automatic triggers, not a run of their manual audit logic.
