# OPENSERP-NATIVE-CRON-COMPLIANCE-AUDIT-1

Status: **complete**, read-only audit. Verdict: **COMPLIANT_WITH_CONDITIONS**. No workflow triggered, no file outside the audit deliverables modified, no secret value displayed, no Production change of any kind.

## 1. What this audits

A prior mission (outside this audit's scope, evidenced by commit history) already migrated Production OpenSERP ingestion execution from `GitHub Actions -> curl -> Vercel serverless route` to `GitHub Actions -> ephemeral OpenSERP Docker -> scripts/openserp/run-ingestion-github-actions.ts --cron -> Supabase`, and activated it on a `*/30 * * * *` schedule. This audit verifies that migration's ongoing compliance and health, not the migration itself.

## 2. Producer topology

Two workflows exist with OpenSERP ingestion relevance:

- **`openserp-github-native-ingestion.yml`** ("OpenSERP Native Ingestion (GitHub-hosted)") -- `schedule: */30 * * * *` + `workflow_dispatch`. Checks out `fix/openserp-serverless-state-persistence` explicitly (not its own ref), starts `karust/openserp:latest` on port 7070, waits for `/health`, runs `npx tsx scripts/openserp/run-ingestion-github-actions.ts --cron` (schedule events always resolve to `cron` mode; `workflow_dispatch` defaults to `dry-run` and requires an explicit choice for `cron`), dumps container logs, tears the container down `if: always()`.
- **`openserp-ingestion-cron.yml`** (legacy) -- `workflow_dispatch` only since commit `b01502e` ("remove GitHub Actions schedule trigger from openserp cron"). Its job does nothing but an authenticated `curl` to `https://akarfinder.vercel.app/api/internal/cron/openserp-ingestion`. Confirmed via `gh run list`: zero `event=schedule` runs since the removal commit; its 12 most recent runs are all manual, 4 of which failed -- all 4 predate the native workflow's schedule activation and were part of that earlier migration's own pre-cutover debugging, unrelated to ongoing health.

**Single producer confirmed**: only `openserp-github-native-ingestion.yml` fires automatically today.

## 3. Vercel route vs native script -- functional diff

Read both files directly, line by line:

| | `app/api/internal/cron/openserp-ingestion/route.ts` | `scripts/openserp/run-ingestion-github-actions.ts --cron` |
|---|---|---|
| Core call | `runIngestionCycle({ runId, scheduledAtIso, write: true, routeMaxDurationMs: 120000 })` | identical call, identical params |
| Lock | `acquireIngestionRunLock` / `releaseIngestionRunLock`, `LOCK_LEASE_SECONDS = maxDuration + 30 = 150` | identical functions, identical lease formula (150) |
| Flag gate | `isOpenSerpIngestionCronAuthorized()` | identical function |
| Query planner, rotation/checkpoints, engine budgets, admission, writers, time budget | all internal to `runIngestionCycle()` | same internals, not duplicated |
| Auth | HTTP `Authorization: Bearer` header check | none -- not applicable, no HTTP request exists for a CLI |
| `run_id` format | `openserp-cron-<timestamp>` | `openserp-github-<mode>-<timestamp>` |

**No real business-logic difference.** The two structural differences (HTTP auth check, run_id prefix) are artifacts of one being an HTTP endpoint and the other a CLI entrypoint, not behavioral divergence in ingestion logic.

## 4. Permissions and secrets

`openserp-github-native-ingestion.yml` has **no top-level `permissions:` key**. It therefore inherits whatever the repository's default Actions token permission setting is -- not something a workflow-file-only review can confirm as minimal. This is flagged as the primary compliance gap in this audit (see §8).

Secrets referenced: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENSERP_AUTOMATED_INGESTION_ENABLED`, `OPENSERP_INGESTION_WRITE_ENABLED`, `OPENSERP_INGESTION_CRON_ENABLED` -- all pre-existing, all already functioning (6/6 real scheduled runs succeeded). No new secret is required for continued operation. No secret value was displayed or logged during this audit.

Two steps in the workflow are explicitly commented `TEMPORARY diagnostic ... Remove once the SUPABASE_URL issue is confirmed/resolved` and still read `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` beyond the single ingestion step. The underlying issue is demonstrably resolved (every scheduled run since has succeeded), so this residual access is unnecessary surface area -- not a leak (no value is ever printed, only structural facts like hostname/protocol/status code), but worth removing as a hardening measure.

No `timeout-minutes` is set at the job level; GitHub's default is 360 minutes. The business-logic lease (150s) self-heals independently of this, but an unbounded job timeout means a genuine hang would consume Actions runner time for up to 6 hours before GitHub itself intervenes.

## 5. Run health (18 runs reviewed, 100% of available history)

6 `schedule` runs, **6/6 success**, every one `status: COMPLETED`, `planned_unit_count == executed_unit_count == 4` (matches the current serverless batch floor), zero NOOP, zero errors surfaced in any of the per-call `db-call` diagnostic log lines, `release_ingestion_run_lock` present in every run's log. Timing breakdown is stable across all 6: container start 7.2-14.5s, health-wait ~1.0-1.2s, ingest phase 22.2-36.8s, total job wall time 59-83s.

12 `workflow_dispatch` runs, all dated 2026-07-19 (the day before this audit), all part of the earlier migration's own pre-cutover validation: 8 success, 4 failure. All 4 failures occurred strictly before the schedule was activated (23:28:21) and are not part of the live schedule's track record.

## 6. Cadence vs nominal

Nominal cron `*/30 * * * *` implies a run every 1800s. Actual gaps observed between the 6 real scheduled runs: 5869s, 14205s, 12000s, 10676s, 7436s, 7357s (average 9590s, ~2h40m -- roughly **5.3x slower** than nominal). Across the ~16h window between the first and last observed scheduled run, ~32 runs were nominally expected; only 6 actually fired.

This is consistent with GitHub's own documented behavior for the `schedule` trigger: runs are explicitly best-effort, can be delayed under platform load, and lower-activity repositories can see reduced effective frequency. It is a platform characteristic of GitHub Actions' free/shared scheduler, not a defect in this workflow's YAML or in `run-ingestion-github-actions.ts`. For AkarFinder's current ingestion volume and business tempo (real-estate listing discovery, not a latency-sensitive path), this cadence is assessed as acceptable -- but it should be treated as a known, documented operating characteristic rather than an unstated assumption that "every 30 minutes" is actually happening.

## 7. Consumption

- GitHub Actions: 6 runs x avg 66.3s = ~6.6 runner-minutes observed in the 16h window on `ubuntu-latest`. A read-only call to the repository's Actions-permissions API was declined during this audit; no further billing/quota API call was attempted afterward in respect of that instruction, so no plan-vs-quota comparison is included here -- only directly observed run-minutes.
- OpenSERP: ephemeral container per run, no persistent hosting cost, average startup 9.2s.
- Supabase: `discovery_candidates` = 7756 rows, `property_listings` = 577 rows as of this audit. Every `ingestion_run_id` found in the 60 most recent `discovery_candidates` rows carries the native script's `openserp-github-cron-` prefix -- zero rows in this sample carry the Vercel route's `openserp-cron-` prefix, directly evidencing that recent business writes originate exclusively from the native runner.
- Vercel: zero scheduled ingestion traffic since cutover; the route remains reachable manually only, for fallback/debug, per the prior migration's explicit decision to keep it (not remove it).

## 8. Risks and recommendations

| Risk | Severity | Recommendation |
|---|---|---|
| No explicit `permissions:` block | Medium | Add `permissions: contents: read` (or narrower) at workflow level |
| 2 residual TEMPORARY diagnostic steps read Supabase secrets beyond current need | Low | Remove, issue they diagnosed is resolved |
| No `timeout-minutes` at job level | Low | Add an explicit cap (e.g. 10 minutes) |
| Cadence ~5.3x slower than nominal | Informational | Document as accepted GitHub platform behavior, not a regression |
| GitHub Actions billing/quota not independently verified | Informational | Check via repository Settings UI if a precise comparison becomes necessary |
| Stuck lock | Not observed | `openserp_ingestion_run_lock` is currently empty; every sampled run released cleanly |
| Recurring failures | Not observed | 6/6 scheduled runs succeeded; all 4 historical failures predate go-live |

## 9. Verdict

**COMPLIANT_WITH_CONDITIONS.** Single scheduled producer confirmed, zero business-logic divergence between the Vercel route and the native script, zero recurring failures in live operation, shared lock demonstrably operational with no stuck state, and writes traced exclusively to the native runner via both code inspection and direct DB evidence. Falls short of strict `COMPLIANT` on exactly two of the stated success criteria: explicit-and-minimal permissions (no `permissions:` block exists at all) and fully-documented costs (run-minutes observed directly, but the billing/quota API comparison was not completed after the user declined that specific API call mid-audit).

Per this audit's own routing rule, the appropriate next step is **`OPENSERP-NATIVE-CRON-REMEDIATION-1`** (not `OPENSERP-LEGACY-VERCEL-CRON-DECOMMISSION-GO-NO-GO-1`) -- scoped narrowly to: add the explicit `permissions:` block, remove the two residual temporary diagnostic steps, add `timeout-minutes`. Not started; out of this audit's read-only scope.
