# OpenSERP Ingestion — Existing Pipeline Audit

**Mission:** AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 (section 8)
**Scope:** `lib/openserp-ingestion/*`, `scripts/ingest-openserp-listings.ts`. Read-only audit,
no code changed by this document.

## Entry point

`scripts/ingest-openserp-listings.ts` — CLI with `--dry-run` (default) / `--write`, plus a
`--manifest` mode that replays a previously locked, human-reviewed candidate selection
(`openserp-first-write-v1`, used by the one-time `OPENSERP-TO-SUPABASE-FIRST-WRITE-1` pilot).
`production_write_authorized` is only set `true` when the dry-run metrics clear fixed minimum
thresholds (>=60 queries executed, >=500 raw results, >=200 candidates, >=200 unique URLs, >=3
cities, and `phone_hits === whatsapp_hits === personal_email_hits === secret_hits === 0`).

## `lib/openserp-ingestion/openserp-live.ts` — engine invocation

Two modes: `OPENSERP_LOCAL_URL` set → HTTP client against a running `openserp serve` instance;
otherwise `OPENSERP_BINARY_PATH` (default `C:\Users\lenovo\go\bin\openserp.exe`) invoked via
`execFile` with `search <engine> <query> --format json --limit N --search-timeout 60 --quiet`.
Only `bing`, `duckduckgo`, `ecosia` are ever passed as `engine` — matches the benchmarked engine
set in `docs/AKARFINDER_WEB_INDEX_STACK_BENCHMARK_1.md` (Phase 2A). Confirmed live and functional
during this audit (binary present at the default path, `search` subcommand verified via
`--help`). **Live smoke test finding:** DuckDuckGo and Ecosia returned correctly on-topic,
Morocco-relevant real-estate results for a real query; Bing consistently returned unrelated
results (a Mozambican betting site, then Polish/generic sites) across two independent calls in
this environment — a silent quality-drift failure mode, not a hard error (HTTP/exit-code level
success). This is not caught by `categorizeAttemptError` (string-matches on error messages only).
The existing classification lane (below) still protects public output, since off-topic domains
fail the real-estate token check and are rejected — but engine-level yield should be tracked per
run so a systematically low-yield engine can be deprioritized by the rotation policy (section 21).

## `lib/openserp-ingestion/classify.ts` — classification lanes

Per-domain `DOMAIN_RULES` (regex path patterns) for 15 known domains
(mubawab.ma, agenz.ma, sarouty.ma, avito.ma, immobilier.trovit.ma, nuroa.ma, immo.mitula.ma,
yakeey.com [reject-all], marocannonces.com, 1immo.ma, barnes-marrakech.com,
kawtarimmobilier.com, mouldar.com, limmobiliersansfrontieres.com, marrakechrealty.com) drive
`forceReject` / `forceDiscovery` / `strongIndividual` signals. Combined with text-derived
signals (real-estate token presence, out-of-scope tokens, tourism/hospitality exclusion, price/
surface/bedroom/transaction/property-type presence, explicit city/district match against the
query), a result lands in one of four lanes: `individual_listing`, `discovery_page`,
`reject_out_of_scope`, `quarantine`. Only `individual_listing` becomes a write candidate.
**Scope limit confirmed:** `extractCity`/`extractDistrict` (in `utils.ts`) only recognize
Casablanca/Rabat/Marrakech and their pre-listed districts — hardcoded, not data-driven from any
shared taxonomy. `OpenSerpIngestionQuery["city"]` is a 3-value union type. This must be
generalized (new module, not a rewrite of this file — see below) for national coverage.

## `lib/openserp-ingestion/utils.ts` — reusable primitives (national-safe, reused as-is)

`sha256`, `normalizeText`, `canonicalizeSourceUrl` (strips tracking params, lowercases host,
forces https, collapses slashes), `extractDomain`, `redactSensitiveText` (phone/WhatsApp/email/
secret-token regex removal + hit counters — this **is** the PII sanitizer required by section 15,
already exercised in production), `scoreCompleteness`, `parseBedrooms`/`parsePriceMad` (handles
`DH`/`MAD`/`million`/`MDH` forms)/`parseSurfaceM2`, `toPropertyType`, `toTransactionType`,
`mentionsTourismOrHospitality`. None of these are city-scoped — fully reusable nationally as-is.
`extractCity`/`extractDistrict` are the only city-scoped functions (3 cities only) — the national
mission will add a parallel, data-driven module rather than editing these (avoids regressing the
locked `openserp-first-write-v1` pilot's tested behavior).

## `lib/openserp-ingestion/first-write.ts` — one-time pilot selection (not reused as a writer)

`ALLOWED_PUBLIC_SOURCE_DOMAINS` (13 domains) is the existing precursor to the domain registry
required by section 12 — reused as the seed set for `data/openserp/source-domain-registry.json`.
`selectFirstWriteCandidates`/`buildLockedFirstWriteManifest` implement a **quota-capped, ranked
selection** (target 180 total across exactly 3 cities) designed for a single human-reviewed
locked manifest — not applicable to a recurring, unattended 30-minute cron (which must write
every eligible candidate each run, not a fixed quota). Not reused by the new writer; its
PII/URL-safety filter pattern (`filterEligibleCandidates`) is reused conceptually in the new
national admission module.

## `lib/openserp-ingestion/pipeline.ts` — dry-run + write orchestration

`executeOpenSerpDryRun`: loads a query matrix JSON, runs `executeQueryAttempts` per query (up to
3 engine attempts per query via `getExecutionPlan`, stopping at first non-empty result),
classifies every raw result, merges duplicate `canonical_source_url`s within the run, writes
JSONL/JSON audit artifacts per run under `data/ingestion-runs/<runId>/`.
`writeOpenSerpCandidatesToSupabase`: **idempotent by upsert**, not by client-computed UUID —
`property_listings` upserted on `canonical_fingerprint` (`sha256("openserp:" + canonical_url)`),
`listing_sources` upserted on `listing_url` (unique constraint). A second run with the same
candidates produces 0 new rows (verified by the existing `runPostWriteIdempotenceCheck`). Batched
(`batchSize`, capped 25), wrapped in try/catch that triggers `rollbackOpenSerpRun` on any error
mid-batch (restores updated-row snapshots, deletes newly-inserted rows only from *this* run,
tracked via `rollbackManifest`). **Gap vs. this mission's requirements:** does not write the new
additive `listing_sources` columns (`origin_type`, `source_offer_key`, `content_fingerprint`,
`ingestion_run_id`, `displayed_price`, `price_currency`, `price_period`, `price_status` — added by
migration `20260716140400`, after this pipeline was built) and does not create
`property_clusters`/`property_cluster_members` rows at all (those tables did not exist yet when
this pipeline was built). Both gaps are additive and will be closed by a new writer function that
wraps this one rather than duplicating its transactional/rollback logic.

## Conclusion — reuse plan for this mission

Reused unchanged: `openserp-live.ts` (engine invocation), `utils.ts` primitives except city/
district extraction, `classify.ts`'s per-domain URL-pattern rules and lane logic (gated by the
new domain registry as an *additional* upstream check, not a replacement), `pipeline.ts`'s
query-execution/dry-run/property+source upsert/rollback machinery.

New, additive only: a national geography module, a domain-registry loader, a national admission
wrapper (adds domain-registry + widened city checks on top of `classifyOpenSerpResult`), and a
writer extension that sets the new `listing_sources` columns and creates the 1:1
`property_clusters`/`property_cluster_members` rows after the existing upsert succeeds — using
the same idempotent-upsert pattern (`onConflict` on each table's existing unique constraint)
already proven by this pipeline, rather than client-computed UUIDv5 (see
`docs/OPENSERP_AUTOMATED_INGESTION_ARCHITECTURE.md` for the explicit rationale for this
adaptation of the mission's illustrative ID scheme).

No second, competing writer is created. `scripts/ingest-openserp-listings.ts` and its 3-city
pilot path remain untouched and usable independently of the new national/cron path.
