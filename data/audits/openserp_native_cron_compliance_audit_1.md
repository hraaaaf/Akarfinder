# OPENSERP-NATIVE-CRON-COMPLIANCE-AUDIT-1

Status: **completed, read-only**. Verdict: **COMPLIANT_WITH_CONDITIONS**. Zero files modified, zero workflow triggered, zero secret value displayed, zero Production change made under this mission.

## 1. Single scheduled producer -- confirmed

- `openserp-github-native-ingestion.yml` ("OpenSERP Native Ingestion (GitHub-hosted)") is the **only** workflow with a `schedule:` trigger (`*/30 * * * *`), activated at commit `5975e76`.
- `openserp-ingestion-cron.yml` (legacy curl-to-Vercel) is `workflow_dispatch` only since commit `b01502e`. Its last `event=schedule` run was 2026-07-18T18:53:46Z, before removal. **Zero** schedule-triggered runs since. Its 12 most recent runs are all manual `workflow_dispatch` (4 failures, all on 2026-07-19, pre-dating the native workflow's go-live and unrelated to it).
- No second automatic producer of the Vercel ingestion route was found.

## 2. Functional equivalence, Vercel route vs native script

Both `app/api/internal/cron/openserp-ingestion/route.ts` and `scripts/openserp/run-ingestion-github-actions.ts --cron` call the identical `runIngestionCycle()` (`lib/openserp-ingestion/run-orchestrator.ts`), the identical `acquireIngestionRunLock`/`releaseIngestionRunLock` (`run-lock.ts`), the identical `isOpenSerpIngestionCronAuthorized()` flag gate, with identical `LOCK_LEASE_SECONDS=150` and `routeMaxDurationMs=120000`. **No real business-logic difference found.** The only differences are structural: the Vercel route additionally checks an HTTP bearer token (not applicable to a CLI), and the `run_id` prefix differs (`openserp-cron-` vs `openserp-github-cron-`) for traceability only.

## 3. Permissions -- gap found

`openserp-github-native-ingestion.yml` declares **no top-level `permissions:` block at all** -- it implicitly inherits the repository's default Actions token permissions, which cannot be confirmed as minimal from the workflow file alone. This does not meet the "explicit and minimal" criterion. No new secret is needed anywhere: all 5 referenced secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENSERP_AUTOMATED_INGESTION_ENABLED`, `OPENSERP_INGESTION_WRITE_ENABLED`, `OPENSERP_INGESTION_CRON_ENABLED`) already exist and are already working (6/6 successful scheduled runs). Two steps explicitly marked `TEMPORARY diagnostic ... Remove once the SUPABASE_URL issue is confirmed/resolved` still read Supabase secrets beyond the single ingestion step -- the issue is demonstrably resolved, so this residual access is unnecessary, though not a new leak (no value ever printed). No `timeout-minutes` is set at the job level (GitHub default: 360 minutes).

## 4. Run history (18 runs available, all reviewed)

6 `schedule` runs: **6/6 success**, all `COMPLETED`, all `planned_unit_count == executed_unit_count == 4`, zero NOOP, zero errors in any db-call, lock acquired and released cleanly every time.

| run_id | event | conclusion | created_at (UTC) | job wall | openserp_start_ms | health_wait_ms | ingest_ms |
|---|---|---|---|---|---|---|---|
| 29755243935 | schedule | success | 15:27:24 | 83s | 14458 | 1196 | 36803 |
| 29746141631 | schedule | success | 13:24:47 | 61s | 8890 | 1037 | 24581 |
| 29738228683 | schedule | success | 11:20:51 | 59s | 7824 | 1036 | 22199 |
| 29727691304 | schedule | success | 08:22:55 | 62s | 7239 | 1052 | 26556 |
| 29718229979 | schedule | success | 05:02:55 | 67s | 8266 | 1032 | 27307 |
| 29710423171 | schedule | success | 01:06:10 | 66s | 8649 | 1038 | 29961 |

12 `workflow_dispatch` runs (all 2026-07-19, pre-go-live validation phase): 8 success, 4 failure -- all failures predate schedule activation (23:28:21) and were part of debugging before cutover, not a recurring pattern in live operation.

## 5. Cadence vs nominal

Nominal: `*/30 * * * *` = every 1800s. Observed gaps between the 6 real scheduled runs: 5869s, 14205s, 12000s, 10676s, 7436s, 7357s -- average **9590s (~2h40m), ~5.3x slower than nominal**. Over the 16h observation window, ~32 runs were expected at nominal cadence; only 6 occurred (~81% "missed"). This matches GitHub's own documented behavior: scheduled workflow runs are best-effort and can be delayed or dropped under platform load, with reduced frequency on lower-activity repositories -- an expected platform characteristic, not a defect in this workflow. Assessed as acceptable for this business context (real-estate discovery, not latency-critical) but should be documented as a known, accepted condition rather than assumed away.

## 6. Consumption

- **GitHub Actions**: 6 runs x avg 66.3s wall time = ~398s (~6.6 min) of `ubuntu-latest` runner time in the 16h window observed. A read-only call to the repo's Actions-permissions API was declined by the user during this audit; no further billing/quota API call was attempted afterward, per that instruction -- only directly observed run-minutes are reported, no invented quota comparison.
- **OpenSERP**: ephemeral Docker container per run (avg start 9.2s, avg health-wait 1.1s), no persistent hosting cost.
- **Supabase**: `discovery_candidates` = 7756 rows, `property_listings` = 577 rows (current totals). All 3 distinct `ingestion_run_id` values found in the 60 most recent `discovery_candidates` rows carry the native script's `openserp-github-cron-` prefix; **zero** rows in this sample carry the Vercel route's `openserp-cron-` prefix.
- **Vercel**: no scheduled traffic since cutover; route remains callable manually only.

## 7. Shared lock / write origin

`openserp_ingestion_run_lock` table is currently **empty** (no held lock) -- consistent with every sampled run's log showing a `release_ingestion_run_lock` db-call after `runIngestionCycle` completes. Combined with the code-level proof (§2) and the DB-level `ingestion_run_id` prefix evidence (§6), writes are confirmed to originate exclusively from the native GitHub runner via the shared `runIngestionCycle()` + shared lease, with no observed stuck lock and no double-write signal.

## 8. Risks

| Risk | Severity | Recommendation |
|---|---|---|
| No explicit `permissions:` block | Medium | Add `permissions: contents: read` (or narrower) |
| 2 residual TEMPORARY diagnostic steps still reading Supabase secrets | Low | Remove now that the original issue is resolved |
| No `timeout-minutes` at job level (GitHub default 360 min) | Low | Add an explicit cap (e.g. 10 min) |
| Cadence ~5.3x slower than nominal (GitHub platform throttling) | Informational | Document as accepted/expected, not a regression |
| Billing/quota not independently verified via API | Informational | Check via Settings UI in a future pass if needed |

## Verdict

**COMPLIANT_WITH_CONDITIONS** -- single producer confirmed, zero functional Vercel/native divergence, zero recurring failure, shared lock operational, writes traced exclusively to the native runner. Does not reach strict `COMPLIANT` because the explicit-minimal-permissions criterion is not met and cost/quota is only partially documented (run-minutes observed, billing API not queried).

Next mission per this audit's own rule: **OPENSERP-NATIVE-CRON-REMEDIATION-1** (add explicit `permissions:` block, remove the two residual temporary diagnostic steps, add `timeout-minutes`) -- not started, out of this audit's scope.
