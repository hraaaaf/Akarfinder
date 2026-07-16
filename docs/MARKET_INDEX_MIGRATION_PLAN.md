# Market Index — Migration Plan

All 5 migrations below are purely additive (`CREATE TABLE`, `ADD COLUMN` nullable, `CREATE INDEX`,
`CREATE UNIQUE INDEX`, `CHECK` constraints that are always satisfied by `NULL`). None contains `DROP
TABLE`, `DROP COLUMN`, a destructive rename, `UPDATE`, `DELETE`, `TRUNCATE`, or any change to
`property_listings`. Each file carries its own header comment with objective/preconditions/impact/lock
estimate/re-run behavior/rollback, per mission section 12 — this document summarizes them.

| # | File | Creates | Touches existing tables? |
|---|---|---|---|
| 1 | `20260716140000_create_discovery_candidates.sql` | `discovery_candidates` table | No |
| 2 | `20260716140100_create_property_clusters.sql` | `property_clusters` table | Adds a nullable, unique FK column referencing `property_listings.id` — no column added *to* `property_listings` |
| 3 | `20260716140200_create_property_cluster_members.sql` | `property_cluster_members` table | References `property_clusters.id` and `listing_sources.id` — no column added to either |
| 4 | `20260716140300_create_source_offer_observations.sql` | `source_offer_observations` table | References `listing_sources.id` — no column added to it |
| 5 | `20260716140400_add_source_offer_columns_to_listing_sources.sql` | 9 nullable columns + 2 indexes + 2 check constraints on `listing_sources` | Yes — the **only** migration touching an existing table, additively |

## Application order

Migrations 1-4 have no ordering dependency on each other except migration 3 depends on migration 2
(FK to `property_clusters`) and migration 4 depends on `listing_sources` already existing (it does).
Migration 5 can run independently of 1-4. The filenames' timestamp ordering (`140000` → `140400`) is
sufficient for the project's existing migration runner to apply them in a safe order.

## Local validation performed

See `data/audits/market-index-foundation-local-validation.json` for the executed result. Summary: no
ephemeral PostgreSQL instance was available in this environment to `CREATE TABLE`/apply-and-rollback
against (no local `postgres`/`pg_ctl` binary, no Docker requirement accepted per mission section 5's
prohibition on adding Docker as a mandatory dependency). Per mission section 20, this is classified:

**`LOCAL_DB_APPLICATION_NOT_EXECUTED`**

This status does **not** authorize a Production migration. In its place, this mission performed:
- Full static review of every statement (idempotent `IF NOT EXISTS`/`IF EXISTS` guards on every object).
- A dry-run read-only audit against the actual Production schema (`data/audits/market-index-foundation-
  prod-readonly-dry-run.json`) confirming the tables/columns these migrations reference (`property_
  listings`, `listing_sources`) exist with the exact shape assumed here (see `docs/
  MARKET_INDEX_EXISTING_MODEL_AUDIT.md`).
- Confirmation that every new unique index is either on a brand-new empty table, or a **partial** index
  (`WHERE column IS NOT NULL`) on `listing_sources`, so it cannot conflict with any of the 321 existing
  rows (which all have `NULL` in the new columns before this migration runs).

## RLS

See `docs/MARKET_INDEX_SECURITY_AND_RLS.md`. Every new table has `ENABLE ROW LEVEL SECURITY` and
deliberately **zero** policies — matching the existing project pattern (`listing_observation_history`,
`search_gateway_cache`), which means only the service-role key (used exclusively server-side) can access
them; `anon`/`authenticated` roles are denied by default with no policy granting them anything.

## Re-execution safety

Every `CREATE TABLE`, `CREATE INDEX`, `ADD COLUMN`, and constraint drop/add uses `IF [NOT] EXISTS` —
running any of these 5 files twice in a row is a no-op the second time, by design (mission requirement:
"comportement en cas de réexécution").
