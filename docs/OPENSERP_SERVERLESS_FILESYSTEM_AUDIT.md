# OpenSERP Ingestion — Serverless Filesystem Audit

**Mission:** OPENSERP-SERVERLESS-STATE-PERSISTENCE-1 (section 5)
**Scope:** every `writeFile`/`writeFileSync`/`rename`/`copyFile`/`appendFile`/`mkdir`/`mkdirSync` call
reachable from `lib/openserp-ingestion/*`, and the two named helpers `saveUniverse`/`saveBudgetState`.
Read-only audit — no runtime code changed by this document.

## Root cause confirmed

`app/api/internal/cron/openserp-ingestion/route.ts` calls `runIngestionCycle({ runId, scheduledAtIso, write: true })`
with no `universePath`/`budgetStatePath`/`rawResultsDir` overrides. Inside
`lib/openserp-ingestion/run-orchestrator.ts`, two `writeFileSync` calls are **unconditional** — they run on
every invocation regardless of the `write` parameter, before `writeNationalIngestionRun` (the actual DB
write) is ever reached:

- line 247: `saveUniverse(universePath, universe)` — rewrites `data/openserp/query-universe-v1.json` in
  place with updated `last_executed_at`/`successful_run_count` rotation fields.
- line 286: `writeFileSync(budgetStatePath, ...)` — rewrites `data/openserp/engine-budget-state.json` in
  place with the post-run budget/backoff state.

Both target `process.cwd()/data/openserp/*.json`, which on Vercel resolves inside `/var/task` — the
deployed function bundle, mounted read-only. The first of the two (`saveUniverse`) is the one that threw
`EROFS: read-only file system, open '/var/task/data/openserp/query-universe-v1.json'` during the live
authenticated run on 2026-07-18T13:17Z. Since it runs before `writeNationalIngestionRun` (line 256), the
crash happened **before any DB write was attempted** — confirmed by code order, not just by absence of
new rows.

This was never caught by Gate A, Gate B, or the three bootstrap waves because all of them invoked
`runIngestionCycle` via local `tsx` CLI execution (`scripts/openserp/run-openserp-national-bootstrap.ts`),
where the working directory is genuinely writable. The deployed serverless route had never actually
reached `write: true` until this mission's first authenticated `workflow_dispatch` test — every prior
`workflow_dispatch` test hit the `NOOP_FLAGS_DISABLED` short-circuit in route.ts, which returns before
`runIngestionCycle` is ever called.

## Inventory

| Call site | Classification | Reachable from serverless route? |
|---|---|---|
| `run-orchestrator.ts:126` `loadUniverse()` reads `query-universe-v1.json` | `immutable_bundle_read` | Yes — read-only, safe on Vercel |
| `run-orchestrator.ts:127-129` reads `engine-budget-state.json` if present | `immutable_bundle_read` (current) → becomes legacy seed only post-migration | Yes — read-only, safe on Vercel |
| `run-orchestrator.ts:70-94` `saveUniverse()`, called at line 247 | **`forbidden_serverless_write`** | **Yes — unconditional, independent of `write` flag. Root cause of the EROFS crash.** |
| `run-orchestrator.ts:286` `writeFileSync(budgetStatePath, ...)` | **`forbidden_serverless_write`** | **Yes — unconditional, independent of `write` flag. Would crash identically once `saveUniverse` is fixed, since it runs later in the same function.** |
| `run-orchestrator.ts:250-251` `mkdirSync`/`writeFileSync` into `input.rawResultsDir` | `local_cli_only` | No — `rawResultsDir` is never passed by `route.ts`; only the bootstrap CLI script supplies it |
| `run-lock.ts` | n/a — no filesystem calls at all (already DB-backed, sentinel row pattern) | Yes, and already safe |
| `national-writer.ts` | n/a — no filesystem calls; imports only the pure `buildOpenSerpPropertyRow` from `pipeline.ts`, never its file-touching exports | Yes, and already safe |
| `pipeline.ts:75-76,80-82` `mkdir`/`writeFile` (manifest loader + report writer) | `local_cli_only` | No — these exports are only imported by `scripts/audits/openserp-first-write-*.ts`, `scripts/ingest-openserp-listings*.ts`, and their test; never by `national-writer.ts`'s reachable path (confirmed: only `buildOpenSerpPropertyRow` is imported, a pure function with no I/O) |
| `scripts/openserp/build-query-universe.ts:264` `writeFileSync` | `local_cli_only` | No — build-time universe generation, run manually, never deployed |
| `scripts/openserp/run-openserp-national-bootstrap.ts` (3 write sites) | `local_cli_only` | No — bootstrap wave CLI runner |
| `scripts/openserp/__gate__/gate-a-pglite-national-writer.ts:264` | `test_only` | No — Gate A test script |

**Confirms the ODM's expectation exactly:** `query-universe-v1.json` behaves as `immutable_bundle_read` in
the current code except for the rotation-state write-back, which must move to PostgreSQL.
`engine-budget-state.json` is read at startup and rewritten at the end of every run — after migration it
becomes a legacy seed/read-only artifact only, per section 7.

## Guard-rail against reintroduction

A regression test is added (`scripts/scrapers/__tests__/openserp-serverless-filesystem-guard.test.ts`,
section 13) asserting that `lib/openserp-ingestion/run-orchestrator.ts` contains no `writeFileSync`/
`writeFile`/`mkdirSync`/`mkdir` call reachable outside an `if (input.rawResultsDir)` (or equivalent
explicitly-CLI-only) guard, by statically checking the file's source text for write calls that aren't
inside a recognized CLI-only conditional. This is a blunt but effective static guard: any future PR that
reintroduces an unconditional filesystem write into the serverless-reachable path fails CI immediately.
