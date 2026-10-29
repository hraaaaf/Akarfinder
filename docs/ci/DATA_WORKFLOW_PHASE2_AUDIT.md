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

## Elevated service-role workflow isolation — 2026-10-29

Scope: **specific Data-4 workflows**, not universal DATA security. The issue is operational: the historical credential-bearing live evidence jobs ran after PR contract checks with `SUPABASE_SERVICE_ROLE_KEY`. Some scripts are GET-only today; this is **not** sufficient reason to run privileged production reads automatically for every PR. The correction removes automatic privileged execution while preserving all bounded proof logic for authorized manual use.

| PR/merge HEAD | Privileged job restricted to explicit `workflow_dispatch` on `main` | PR outcome | AFTER proof |
| --- | --- | --- | --- |
| [#1125](https://github.com/hraaaaf/Akarfinder/pull/1125) `fda6b6bc0b9f31573cf389e751c6237246128117` | DATA-4.3G/H `live-dry-run` | **5/5 PR checks SUCCESS**; privileged PR jobs `skipped` | [shared build 40970467436](https://github.com/hraaaaf/Akarfinder/actions/runs/40970467436) **SUCCESS** |
| [#1126](https://github.com/hraaaaf/Akarfinder/pull/1126) `6d047c84bbff4672d788ea774da5dbd9a9363896` | DATA-4.7B `post-write-certification` | **4/4 PR checks SUCCESS**, credentialed certifier `skipped` on PR and main push contract run | No new build split; dedicated contract run [40970753365](https://github.com/hraaaaf/Akarfinder/actions/runs/40970753365) **SUCCESS**, privileged job `skipped` |
| [#1127](https://github.com/hraaaaf/Akarfinder/pull/1127) `d2683f233e87e76a41db8df354ac1d905b2de744` | DATA-4.5B `live-read-only-preflight`; explicit `DATA_4_5B_APPLY=false` and empty sitemap evidence | **4/4 PR checks SUCCESS** | [read-only build 40971238006](https://github.com/hraaaaf/Akarfinder/actions/runs/40971238006) **SUCCESS** |
| [#1128](https://github.com/hraaaaf/Akarfinder/pull/1128) `67fe7261b1e2eca0b5a6843f9a32838a545b2c48` | DATA-4.3E/F `live-dry-run` / `live-design-audit` | **5/5 PR checks SUCCESS** | [shared build 40971587486](https://github.com/hraaaaf/Akarfinder/actions/runs/40971587486) **SUCCESS** |

These modifications kept PR local unit/regression/TypeScript/security tests; production-build steps were moved to new targeted `push main` AFTER workflows without Supabase secrets. `cancel-in-progress` affects superseded **PR checks only** in credentialed workflows; explicit manual main audits are not cancelled by a PR. No live/manual job was dispatched in these batches.

**Safety-specific source review:** `data-4-3g-first-persistent-freshness-batch.ts`, `data-4-3h-controlled-expansion-to-500.ts`, `data-4-3e-first-freshness-write-canary.ts`, and `data-4-3f-controlled-promotion-design.ts` audit entrypoints implement GET-only reads and local proof manifests. DATA-4.7B's actual writer contains PostgREST `PATCH` and three explicit confirmations; its post-write certifier is GET-only and now manual. DATA-4.5B's actual writer also has a `PATCH` path, evidence digest / confirmations / rollback; its CI preflight explicitly disables APPLY. These static checks prove the **reviewed source**, not absence of all potential future side effects. Security tests guard the contracts against regressions.

**Completed follow-up:** [PR #1129](https://github.com/hraaaaf/Akarfinder/pull/1129) merged to `main` as `c02d0b73ed18b0e136d478fab39e71df425173a7` after **6/6 PR checks SUCCESS** (Product Constitution, CI Efficiency, canonical compile, 4.3D/4.4A/4.4B contracts). Credentialed live audits for these three workflows are **manual-main-only**, unit/type/security guards remain on PR. The shared [read-only AFTER 40972045869](https://github.com/hraaaaf/Akarfinder/actions/runs/40972045869) **completed SUCCESS** on exact merge HEAD. Duplicate [#1130](https://github.com/hraaaaf/Akarfinder/pull/1130) was closed **unmerged** after verifying the five overlapping changed file paths; no unsafe forced merge. After #1130, consider DATA-MASS-3A/3B/3C and MASS-4 (all still automatically expose a service-role credential to PR live audits in the reviewed main configurations). Do not move writer, Neon migration, recrawl, cron or protected data operations to automatic jobs.

**Limit:** this is a series of tightly scoped changes under [#1119](https://github.com/hraaaaf/Akarfinder/issues/1119), **not** a security clearance for every one of the historic 549 workflow files. No Vercel deployment or production data write was performed by these corrections.
