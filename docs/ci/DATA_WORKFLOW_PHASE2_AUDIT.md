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
