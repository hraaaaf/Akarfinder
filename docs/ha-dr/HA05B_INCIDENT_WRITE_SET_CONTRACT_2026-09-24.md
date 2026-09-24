# AkarFinder — HA05-B Incident Write Set Contract

Date: 2026-09-24  
Status: DRAFT / OFFLINE / NOT PROVIDER-CERTIFIED

## Goal

Define the smallest application write set that may remain available while Neon is the authoritative incident writer.

The objective is not feature completeness. The objective is:

- preserve the highest-value user write path;
- minimize incident delta volume;
- avoid writes to tables outside the HA dataset;
- avoid cross-provider partial transactions;
- fail closed instead of silently writing back to Supabase.

## Doctrine

During `NEON_PRIMARY` and `FAILBACK_SYNC`:

1. Supabase application writes remain fenced.
2. Background acquisition/ingestion/recrawl writes are disabled.
3. Professional/admin/content-maintenance writes are disabled unless separately provider-routed and certified.
4. User-continuity and auxiliary telemetry writes are disabled unless their tables join the HA allowlist.
5. A route touching any non-HA table is disabled as a whole unless its incident-safe branch is explicitly separated and tested.
6. No write may fall back from Neon to Supabase.

## V0 approved incident-write candidate

### `buyer_leads`

Reason:

- it is already in the approved 16-table HA candidate set;
- it carries the highest-value conversion/visit continuity;
- two current write paths are naturally bounded to this table:
  - `app/api/visit-requests/route.ts` — INSERT;
  - `app/api/leads/[id]/route.ts` — CRM UPDATE.

Status:

`CANDIDATE ONLY / NOT YET NEON-ROUTED / NOT PROVIDER-PROVED`

Provider routing must not be activated until restored Supabase and Neon prove the exact `buyer_leads` schema, defaults, constraints, sequence/identity behavior and parity.

## Mixed lead endpoint

`app/api/leads/route.ts` is **not** in the V0 incident write set yet.

Although it writes `buyer_leads`, some branches also write:

- `seller_property_drafts` — HA candidate;
- `professional_activation_requests` — not in current HA candidate set;
- conversion tracking through `conversion_events` — not in current HA candidate set.

Therefore the endpoint is incident-disabled until it is split into an explicitly provider-routed buyer-only path and separately handled seller/promoter behavior.

No partial lead creation is allowed.

## Explicitly incident-disabled domains

### Alerts

- `saved_alerts` is outside the current HA allowlist.

### Seller workflow

The seller write surface includes HA tables and non-HA event/photo tables:

- `seller_property_drafts` — HA candidate;
- `seller_listing_publications` — HA candidate;
- `seller_listing_publication_events` — not current HA candidate;
- `seller_property_draft_review_events` — not current HA candidate;
- `seller_property_draft_photos` — not current HA candidate.

Until the dependency closure is moved into the HA set and proved, seller mutation routes are incident-disabled.

### Professional / commercial

Current writers touch non-HA tables including:

- `professional_organizations`;
- `professional_memberships`;
- `professional_property_submissions`;
- `professional_media_assets`;
- `professional_activation_requests`.

Incident-disabled.

### User continuity

Current writers touch non-HA tables including:

- `user_search_projects`;
- `user_favorites`;
- `user_saved_searches`;
- `user_search_history`;
- `user_comparisons`;
- `user_eliminated_properties`;
- `user_learned_preferences`.

Incident-disabled.

### Background ingestion / acquisition / recrawl

Even when some target tables are in the HA dataset, these jobs are incident-disabled by default:

- trusted seed materialization;
- OpenSERP national writer/pipeline;
- query rotation/budget state;
- ingestion lock;
- Serper harvest;
- autonomous recrawl;
- observation-ledger persistence;
- public-index/cache maintenance;
- property-intelligence persistence.

Reason: these writes are not necessary to keep user search/read service available and would increase reverse-delta complexity during an incident.

## V0 degraded behavior

During a future certified Neon incident:

- reads may continue through the proved Neon read paths;
- buyer-lead visit/CRM writes may continue only after provider routing is implemented and certified;
- all other mutation domains return an explicit temporary-unavailable result or remain background-disabled;
- no hidden queue/retry may later replay against the wrong writer without an explicit replay contract.

## Promotion gate for `buyer_leads`

Before enabling a Neon buyer-leads writer, prove all of:

1. exact source/target schema fingerprint equality;
2. primary key and replica identity;
3. column/default/generated behavior;
4. sequence/identity safety if applicable;
5. INSERT parity;
6. UPDATE parity;
7. DELETE behavior required by rollback/cleanup paths;
8. rate-limit query equivalence;
9. single-writer fence behavior;
10. Neon parameterized write implementation;
11. reverse-delta propagation back to restored Supabase;
12. final parity after failback.

Provider-specific rehearsal is mandatory.

## Expansion rule

The incident write set may expand only one dependency-closed domain at a time.

Every expansion requires:

- HA dataset inclusion for all mutated tables;
- provider-routed implementation;
- tests;
- exact-provider rehearsal;
- rollback/failback evidence.

Prepared code alone never expands the certified incident write set.
