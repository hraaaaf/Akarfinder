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
- Exact main [DATA Coverage Gap Auditor AFTER 40969065083](https://github.com/hraaaaf/Akarfinder/actions/runs/40969065083) triggered for the merge. **Only record SUCCESS after verifying its final conclusion**; triggering alone is not certification.
- The protected DATA/Neon write pipelines remain outside this migration. Issue [#1119](https://github.com/hraaaaf/Akarfinder/issues/1119) stays open for later risk-reviewed batches.
