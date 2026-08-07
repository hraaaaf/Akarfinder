# DATA-4.3J — Display Trigger Ordering Fix

## Incident

After DATA-4.3I was merged, the 50 typed sitemap-evidence rows were restored from their still-valid `public_sitemap_presence` proof. The freshness state restored correctly, but their Search/display presence changed from **50 → 0**. The restore was immediately rolled back; Search/display returned to **50 → 50** and no public effect remained.

## Root cause

`thin_index_search_documents` has multiple `BEFORE` triggers. PostgreSQL executes same-kind triggers in name order.

The historical display trigger was named:

`thin_index_display_policy_write`

and therefore ran before:

- `thin_index_quality_tier_write`;
- `trg_odm_10d_quality`;
- `zz_enforce_thin_index_vertical_purity_v1`.

A freshness transition could make display policy evaluate the **old quality tier**, while later triggers recalculated the final tier without recalculating display.

The real 50-row cohort demonstrates this stale state: while `seed_only`, rows currently show `quality_tier=D` together with `display_eligibility=eligible_secondary`, a combination that the current ODM06 policy itself would never produce.

A read-only shadow calculation for the exact 50 rows showed the intended post-freshness result is:

`fresh_confirmed → score 39 → tier C → eligible_secondary`

for **50/50 rows**.

## Fix

Migration only:

- drop `thin_index_display_policy_write`;
- create `zzz_thin_index_display_policy_write` with the same event/function;
- `zzz_` makes display policy execute after quality and vertical-purity triggers.

No policy function changes. No backfill. No bulk mutation.

## Post-merge production certification

1. apply migration;
2. verify trigger order in PostgreSQL metadata;
3. restore the exact 50 DATA-4.3G rows from their typed, active sitemap evidence;
4. require 50/50 `fresh_confirmed + public_sitemap_presence`;
5. require Search/display **50 before → 50 after**;
6. then observe/trigger the OpenSERP reconciler from DATA-4.3I and require the 50 foreign-channel rows to survive;
7. rollback immediately on any unexpected public delta.

DATA-4.3H expansion remains paused until this certification succeeds.
