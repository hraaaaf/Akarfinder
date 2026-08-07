# DATA-4.3I — Multi-Channel Freshness Ownership

## Why this lot exists

DATA-4.3G proved that a 50-row `public_sitemap_presence` freshness write could be applied cleanly with no Search/display delta. A later scheduled OpenSERP reconciliation then reset those rows to `seed_only` and cleared `fresh_channels` because the OpenSERP matcher treated absence of its own evidence as absence of all freshness evidence.

The typed sitemap evidence in `metadata.freshness_evidence` survived. The bug is therefore a writer-ownership collision, not missing provenance.

## Root cause

`reconcile-commoncrawl-seed-freshness.ts` used the single-channel matcher output as a complete replacement for:

- `freshness_status`;
- `fresh_last_seen_at`;
- `fresh_channels`.

The matcher knows only `openserp_yandex_discovery`. It cannot authoritatively invalidate another channel such as `public_sitemap_presence`.

## Contract

The scheduled OpenSERP reconciler now owns only `openserp_yandex_discovery`.

- no OpenSERP observation + foreign channel present → no update;
- fresh OpenSERP observation + foreign channel present → merge channels additively;
- OpenSERP aging/stale evidence cannot degrade a stronger foreign-channel state;
- OpenSERP-only rows retain the historical downgrade semantics;
- expiry of a foreign channel belongs to that channel's own lifecycle/TTL logic.

No Source Registry rule changes. No display/publication policy changes. No source-page fetches.

## Production evidence used for certification

The live read-only gate must find exactly the original 50 DATA-4.3G typed evidence markers and confirm their 14-day sitemap evidence is still active. It may observe their current materialized freshness fields as collided; it performs no repair during the PR.

## Recovery sequence after merge

1. confirm 50/50 typed evidence still active;
2. restore only `freshness_status`, `fresh_last_seen_at` and `fresh_channels` from that existing evidence;
3. leave metadata provenance untouched;
4. verify Search/display counts remain unchanged;
5. observe at least one subsequent scheduled OpenSERP reconciliation cycle;
6. require the 50 sitemap channel rows to survive that cycle before resuming DATA-4.3H expansion.

## Exit condition

DATA-4.3I is complete only when multi-channel ownership tests are green, the real 50-row evidence is recoverable, the code is merged, the 50 rows are restored, and a later OpenSERP freshness cycle no longer erases the sitemap-owned state.
