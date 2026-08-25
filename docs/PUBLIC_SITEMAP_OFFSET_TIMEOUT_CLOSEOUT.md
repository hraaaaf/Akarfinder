# Public Sitemap Offset Timeout — Closeout

Status: **CLOSED / RUNTIME CERTIFIED**

## Goal

Eliminate the Supabase/PostgREST timeout reached while reconciling `discovery_candidates` with deep offset pagination around offset 8000.

## Resolution on main

The current `main` implementation uses shared UUID keyset pagination instead of growing `range(offset, ...)` pagination:

- `lib/seed-freshness/keyset-pagination.ts`
- `scripts/openserp/reconcile-commoncrawl-seed-freshness.ts`
- `scripts/scrapers/__tests__/seed-freshness-keyset-pagination.test.ts`
- `.github/workflows/sitemap-public-seed-harvest.yml`

PR #884 proposed an earlier local form of the same fix and is superseded by the cleaner shared implementation already present on `main`.

## Test proof

The canonical keyset test proves:

- traversal beyond 8,000 rows without gaps or duplicates;
- rejection of a non-advancing full page;
- the reconciler uses indexed keyset cursors and contains no range pagination.

## Runtime proof

Public Sitemap Seed Harvest run `32766268682` on `main` (`677c10efe170a5093ffc5ab80c7d9e097570b1fc`) completed successfully.

The scheduled run executed write mode and completed:

- keyset pagination test: **3/3 passed**;
- TypeScript: **passed**;
- public sitemap harvest: **APPLIED**;
- domains checked: 16;
- qualified unique seeds: 13,275;
- exact freshness reconciliation: **APPLIED**;
- total seeds reconciled: 59,723;
- exact fresh overlap: 3,425;
- fresh confirmed: 984;
- aging: 2,441;
- stale: 0;
- seed only: 56,298;
- accepted fresh observations: 13,622;
- changed rows: 6;
- protected foreign-channel rows: 3,456.

No offset pagination failure, PostgreSQL/Supabase statement timeout, or `57014` occurred in the certified run.

## Non-blocking observation

`sarouty.ma` failed closed during sitemap harvesting with `This operation was aborted`. The workflow continued and completed successfully. This is an upstream/domain-specific harvest issue, not the resolved database pagination incident.

## Success criterion

Met: a real scheduled `main` run crossed the deep-pagination path using keyset pagination and completed exact freshness reconciliation successfully.

No Vercel deployment.
