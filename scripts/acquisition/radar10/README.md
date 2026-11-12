# Akarfinder Radar10 — PRIVATE STAGING ONLY

## Goal / Success / Proof
Goal: scraper V646 -> HMAC-authenticated immutable exporter -> AkarParser V3 ->
private staging candidates in one Supabase database; schedule interval 10min.

Success (offline): deterministic canary, unique URLs, insert/update/replay counters,
transaction rollback, cross-process lock, 0 writes into public.property_listings.

Proof: GitHub Actions ephemeral PostgreSQL 17 service. This is not a production
permission, nor a live crawl/published-date certification.

## Scope
- V646 currently supports only 3 Mubawab first-page sale shards, not nationwide.
- Only the active Supabase reference mgqsckxsqdqbzqwkgvwo may be targeted.
- Source first_seen/last_seen are NOT source published_at dates.
- Dates of newly discovered URLs are not evidence of recent publication.
- Every row remains publication_eligible=false in a private, non-API schema.
- Physical duplicate properties across URLs remain subject to review.
- No bypass of robots, blocking, source terms or consent gates.

## Source gate / Supabase gate (separate, both off by default)
1. Live collection requires --collect-v646 AND environment
   RADAR_LIVE_COLLECTION_APPROVED=approved.
2. Private DB writes require --commit-private-staging AND environment
   RADAR_STAGING_WRITE_ENABLED=approved.
3. DB connection must be RADAR_DATABASE_URL pointing to the pinned active project.
4. Source code, HMAC key and trusted monotonic head must be provisioned outside Git.
   A local trusted-head file alone is not an anti-rollback guarantee.
5. No code path writes public property_listings or listing_sources.

## Dry-run command (after provisioning a verified V646 local snapshot)
python scripts/acquisition/radar10/run_cycle.py --v646-root /var/lib/akarfinder/v646

A fresh source cycle is only attempted with --collect-v646 and the source gate.
The program refuses to consume a V646 export unless the authenticated reader passes.
For production source operation, the separate Chromium/network and anti-replay
certifications remain mandatory. Production status is NO_GO_LIVE.

## Staging schema / migration
private_schema.sql is PROPOSED SQL, NOT a production migration. Once approved,
create a canonical Supabase migration using the CLI, review access grants and
RLS, and canary on isolated database before application.

Use a persistent Linux runner with the provided disabled systemd service/timer
templates. Required dependencies are pinned in requirements.txt. Store all
credentials in a protected EnvironmentFile outside Git. No Vercel deployment.
Do not enable the timer before the separate live-source and staging-write gates.

## Monitoring and failure cases
- 10-minute cadence: systemd OnCalendar every 10 minutes, Persistent true.
- Hard 8-minute timeout: no unbounded backlog.
- PostgreSQL transaction advisory lock prevents cooperative multi-host overlap.
- Every commit writes the candidate changes and run audit atomically.
- Replay of identical candidates does not insert duplicates.
- Incomplete / unverified snapshots abort; no fall-through to stale exports.
- On error: nonzero exit and structured log without credentials / raw payloads.
- Database outage and concurrent lock fail closed; new source run after repair.
- Human gate before DB staging activation, and independent gate before any
  public listing promotion or site deployment.

## Dedicated Postgres role (still an unapproved proposal)
The schema creates non-login role radar10_ingest with SELECT/INSERT/UPDATE
only on private candidates and INSERT on private run logs, protected by RLS.
A separately provisioned login radar10_runtime must inherit that role.
Do NOT use the Supabase postgres administrator DSN for this persistent service:
the CLI rejects that username. Provision login/password, SSL server CA file
(RADAR_DB_CA_CERT) and the pinned project DSN only after a human gate.
No production role or login was created by this PR.

## Runner fixture and filesystem trust
CI additionally invokes the actual runner against an HMAC-authenticated V646
offline fixture from the pinned V646 commit. This still is not a live crawl.
Code files in the V646 runtime directory must be owned by root and immutable
to the service account; only SQLite/export state is writable. The outside
trusted-head directory requires separate secure write permissions and true
rollback protection (local signed file alone is NOT that protection).
