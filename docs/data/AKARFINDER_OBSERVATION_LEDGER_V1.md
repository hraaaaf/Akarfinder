# AkarFinder Observation Ledger V1

## Status

Foundation, internal persistence and upstream observation capture certified. No SERP activation.

Production migrations were applied to Supabase project `kusfiyimwvxblvsrhaes` on 2026-07-26. The canonical observation stream contained zero rows at activation time, so no historical event backfill was executed and no history was fabricated.

## Purpose

The ledger derives factual temporal events from the existing append-only `source_offer_observations` stream. It does not replace observations and does not invent history.

Canonical flow:

`SOURCE OFFER WRITE/CHANGE → APPEND-ONLY OBSERVATION → EVENT DERIVATION → INTERNAL EVENT STORE → TIMELINE → FRESHNESS → FUTURE DISPLAY ELIGIBILITY`

## Invariants

- `source_offer_observations` remains the source of truth;
- events are deterministic projections and retain both observation identifiers;
- comparisons are allowed only inside one `source_offer_id`;
- an empty history remains unknown;
- no availability claim is promoted to a verified real-world fact;
- no event is publicly exposed by this lot;
- repeated derivation produces the same `event_key` values;
- no update or delete is required on the append-only observation stream;
- pre-existing listings are not assigned reconstructed historical snapshots.

## V1 event taxonomy

- `first_observed`
- `price_decreased`
- `price_increased`
- `price_disclosed`
- `price_removed`
- `content_changed`
- `surface_changed`
- `withdrawn`
- `reactivated`
- `availability_changed`

A price event records previous value, current value, exact delta and percentage when computable.

## Timeline metrics

For one source offer:

- first and last observed timestamps;
- observation count;
- observed lifespan in days;
- change count;
- price-change count;
- withdrawal count;
- reactivation count;
- last known source status;
- last observed price;
- freshness age, score and band.

## Freshness V1

Freshness is calculated from the last observation timestamp with a deterministic 14-day exponential decay.

Bands:

- `fresh`: 24 hours or less;
- `recent`: more than 24 hours and up to 7 days;
- `aging`: more than 7 days and up to 30 days;
- `stale`: more than 30 days.

The score is an internal temporal signal, not proof that the property remains available.

## Persistence and security

`observation_ledger_events` is an additive internal projection table.

Controls applied:

- RLS enabled;
- no table access for `anon` or `authenticated`;
- `service_role` receives only `SELECT` and `INSERT`;
- deterministic unique `event_key`;
- source and observation foreign keys retained;
- RPC `persist_observation_ledger_event(...)` uses `SECURITY INVOKER`;
- RPC execution revoked from `public`, `anon` and `authenticated`;
- RPC executable only by `service_role`;
- no public view and no SERP integration.

The Supabase advisor reports the expected informational `RLS enabled, no policy` notice because the table is deliberately inaccessible to public roles. Existing project-wide warnings are unchanged.

## Observation capture wiring

A database trigger on `listing_sources` now records a factual observation when:

- a source offer is inserted;
- its content fingerprint changes;
- its displayed price or currency changes;
- its active/inactive state changes.

The trigger:

- uses `SECURITY INVOKER` and a fixed search path;
- stores source-offer provenance and ingestion run id;
- reads the linked surface and title fingerprint without altering the listing;
- writes append-only rows only;
- ignores unrelated updates;
- uses `ON CONFLICT DO NOTHING` for safe retries.

The observation idempotency index was corrected to include price, surface, status and availability. A real same-hour price change can therefore create a second observation, while an identical retry remains deduplicated.

## Controlled backfill contract

- connected runner is dry-run by default;
- write mode requires two explicit environment flags;
- reads are paginated and capped;
- invalid source identifiers are rejected;
- empty history produces zero events and zero writes;
- every ledger-event write goes through the RPC;
- reruns are idempotent through `event_key` uniqueness.

## Production state — 2026-07-26

At migration activation:

- `source_offer_observations`: 0 rows;
- distinct observed source offers: 0;
- `observation_ledger_events`: 0 rows;
- no synthetic micro-write;
- no reconstructed baseline was inserted.

Trigger validation used a deliberate exception inside one transaction:

- before probe: 0 observations for the selected source offer;
- inside transaction after tracked-field update: 1 observation;
- exception forced full rollback;
- after rollback: source offer restored and observation count returned to 0.

Future qualifying ingestion writes now create real observations automatically. Ledger events become derivable once those observations exist.

## Certification gates

- event taxonomy tests: green;
- deterministic idempotency-key test: green;
- price delta test: green;
- withdrawal/reactivation tests: green;
- cross-offer comparison refusal: green;
- unknown-history test: green;
- freshness degradation test: green;
- Supabase adapter tests: green;
- migration security contract: green;
- TypeScript: green;
- production build: green;
- production RLS/grant verification: green;
- production RPC privilege verification: green;
- production trigger rollback proof: green;
- production rollback cleanliness verification: green.

## Next dependency

The ledger is now waiting for the next genuine source-offer ingestion or tracked change. No manual or synthetic data should be inserted merely to manufacture history. The next meaningful DATA lot is the freshness/lifecycle worker that periodically rechecks eligible source offers and converts accumulated observations into internal ledger events.
