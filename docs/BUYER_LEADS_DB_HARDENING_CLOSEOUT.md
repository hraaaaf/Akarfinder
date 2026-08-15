# buyer_leads DB hardening — closeout

**Status: CLOSED**
**Date: 2026-08-15**

## Scope

Follow-up DB hygiene after #643 Lead API Hardening:
- remove exact duplicate indexes on `public.buyer_leads`;
- make the private server-only access model explicit;
- preserve the anti-abuse composite index;
- align repository SQL with production truth.

## Production migration

Supabase project: `AqarFinder` (`kusfiyimwvxblvsrhaes`).

Migration applied:

`20260815174138 harden_buyer_leads_indexes_and_grants`

### Exact duplicate indexes removed

- `idx_buyer_leads_city`
- `idx_buyer_leads_lead_temperature`
- `idx_buyer_leads_lead_type`
- `idx_buyer_leads_listing_id`
- `buyer_leads_created_at_desc_idx`

Canonical counterparts retained:

- `buyer_leads_city_idx`
- `buyer_leads_temperature_idx`
- `buyer_leads_lead_type_idx`
- `buyer_leads_listing_id_idx`
- `buyer_leads_created_at_idx`

`idx_buyer_leads_visit_status` was intentionally retained because it is a full index while `buyer_leads_visit_status_idx` is partial (`WHERE visit_status IS NOT NULL`), so they are not exact duplicates.

The #643 index remains present:

`buyer_leads_phone_created_at_idx (phone_whatsapp, created_at DESC)`

## Access hardening

Production state verified after migration:

- RLS enabled;
- 0 policies on `buyer_leads`;
- `anon` table privileges: none;
- `authenticated` table privileges: none;
- `service_role` retains SELECT / INSERT / UPDATE / DELETE and the other table privileges required by the server-side client;
- server-side AkarFinder uses `SUPABASE_SERVICE_ROLE_KEY` for `/api/leads`.

The previous repository SQL created a permissive `service_role_all` policy. It has been retired from the canonical script because `service_role` bypasses RLS and the table is intentionally server-only. The canonical SQL now explicitly revokes all table privileges from `anon` and `authenticated` and grants the server role.

## Verification

- production row count observed after migration: 13;
- production relation size observed: 232 kB;
- duplicate index set above no longer present;
- `anon SELECT = false`;
- `authenticated SELECT = false`;
- `service_role SELECT = true`;
- `service_role INSERT = true`.

## Advisors

The former duplicate-index findings for the removed exact duplicates are addressed by this migration.

Supabase still reports `RLS enabled, no policy` for `buyer_leads`. In this access model that state is intentional: public roles have no table grants and the application accesses the table only through the server-side service role. This informational advisor is therefore documented rather than "fixed" by adding a permissive public policy.

Other Supabase advisor findings are outside this lot.

## Remaining debt

No remaining debt in this DB hardening lot.
