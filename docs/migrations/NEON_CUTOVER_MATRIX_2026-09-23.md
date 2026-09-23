# Supabase → Neon cutover matrix — 2026-09-23

## Goal

Move AkarFinder's database read path to Neon without treating Supabase-specific Auth,
Storage, roles, or policies as portable PostgreSQL by accident.

Success for the DB-first lot means:

1. the minimum public listing read dataset can be exported from the source;
2. the selected dump restores cleanly into vanilla PostgreSQL 17;
3. row counts match source → scratch → Neon for the selected tables;
4. AkarFinder's Neon read-path tests pass;
5. production is **not** switched until the separate Vercel human gate.

No step in this document authorizes a Vercel deployment or Supabase deletion.

## Verified classification

| Area | Current dependency | Classification | Cutover treatment |
| --- | --- | --- | --- |
| Public listing reads | `property_listings`, `listing_sources` | PostgreSQL core | DB-first |
| Market Index reads | `property_clusters`, `property_cluster_members` | PostgreSQL core | DB-first |
| Structured district totals | `property_listings` exact-count filters | PostgreSQL core | provider-aware Neon path added |
| ODM public search | `search_public_representations_v2` + thin-index/policy tables/functions | PostgreSQL + Supabase RPC coupling | block full cutover until ported |
| Owner public search | `search_owner_public_representations_v1` + owner projection | PostgreSQL + Supabase RPC/Auth coupling | defer/port explicitly |
| Search Gateway cache | `search_gateway_cache` | PostgreSQL cache, Supabase client coupling | non-critical adapter required |
| Consumer auth | Supabase Auth sessions/users | Supabase-specific | defer + adapter |
| Professional auth | Supabase Auth + `app_metadata.akarfinder_staff` | Supabase-specific | defer + adapter |
| Professional ownership | public tables with FKs to `auth.users` + `auth.uid()` policies | coupled | defer until Auth mapping |
| Seller drafts/photos | public tables + Supabase Storage | coupled | defer until DB + object storage adapter |
| Seller media bytes | bucket `seller-property-drafts` | object storage | separate storage migration |
| Neighborhood media | bucket `neighborhood-visuals` | object storage | separate storage migration |
| Supabase roles | `anon`, `authenticated`, `service_role` grants/revokes | Supabase-specific | do not assume portable |
| Supabase Storage catalog | `storage.buckets` | Supabase-specific | never replay blindly on Neon |

## Evidence from repository migrations

The repository contains direct Supabase coupling that makes a monolithic
`pg_dump --schema=public` restore unsafe:

- `20260721231500_professional_auth_ownership_profiles_v1.sql`
  references `auth.users(id)` and uses `auth.uid()` in policies.
- `20260806090000_b3_5_1_professional_identity.sql`
  directly queries `auth.users`.
- multiple migrations grant/revoke `anon`, `authenticated`, and
  `service_role`.
- `20260805153000_seller_secure_photo_upload_v1.sql` and
  `20260811211500_neighborhood_visual_p0_7_storage_bucket.sql`
  write to `storage.buckets`.

Therefore the first target is deliberately narrower than "all public schema".

## DB-first core candidate

Initial candidate tables:

- `public.property_listings`
- `public.listing_sources`
- `public.property_clusters`
- `public.property_cluster_members`

This list is a **candidate**, not an assertion that all dependencies are closed.

The migration workflow must prove closure by restoring the selected archive
into a clean PostgreSQL 17 scratch database. If restore fails because a
referenced object is missing, expand the candidate set deliberately and rerun.
Do not bypass the scratch restore.

## Direct connection contract

Use separate secrets:

- `SUPABASE_DATABASE_URL_DIRECT` — source, migration tooling only.
- `NEON_DATABASE_URL_DIRECT` — target, migration tooling only.
- `NEON_DATABASE_URL` — pooled/serverless runtime application URL.

Migration URLs must not be committed. Production runtime must never use the
direct migration URL.

## Core migration gate

Workflow: `.github/workflows/neon-core-db-migration.yml`

Default mode is `validate`.

### validate

1. fail if source direct URL is missing;
2. create a custom-format PG17 dump for the four candidate tables;
3. restore into a clean PostgreSQL 17 scratch database;
4. compare source and scratch row counts for every selected table;
5. stop on the first schema/dependency/count error;
6. perform **no Neon write**.

### apply

All `validate` gates still run first, then:

1. require `NEON_DATABASE_URL_DIRECT`;
2. fail closed if any selected target table already exists;
3. restore with `--single-transaction --exit-on-error --no-owner --no-acl`;
4. compare source and Neon row counts;
5. fail if any count differs.

No `--clean`, no target drop, no source write.

## Auth migration status

Current Neon Auth is Managed Better Auth, not the Stack Auth implementation used
by Neon's March 2025 Supabase migration article.

Current evidence supports two distinct facts:

- `@neondatabase/auth` provides a Supabase-compatible adapter for application
  API migration;
- Better Auth itself documents Supabase/bcrypt migration.

What is **not yet proven** is a supported Managed Neon Auth mechanism for
importing the existing Supabase password hashes while preserving login
continuity. Do not run a password migration until that exact managed-service
path is verified.

## Cutover sequence

1. Freeze write-heavy Supabase automation (#1084).
2. Validate selected core dump against vanilla PG17.
3. Apply core dump to empty Neon target.
4. Validate counts + Neon read-path behavior.
5. Port remaining server-side DB writers/readers required for production.
6. Migrate Auth with a verified Managed Neon Auth identity strategy.
7. Migrate both object-storage buckets and signed-URL paths.
8. Run parity tests.
9. Human gate: Vercel environment switch/deployment.
10. Post-cutover verification.
11. Only after proven stability: retire remaining Supabase dependencies.

## Runtime parity finding — district totals

The legacy search path used a Supabase-only exact count for district searches.
Without a Neon equivalent, `DATABASE_PROVIDER=neon` would keep listing rows on
Neon but could report a city-wide total for a district query.

This gap is now closed on the migration branch:

- `queryNeonStructuredDistrictTotal()` performs the same structured filters
  with parameterized SQL;
- city aliases are handled through a parameterized `ANY(text[])` condition;
- `queryStructuredDistrictTotal()` routes by DB provider;
- offline coverage verifies district, alias, property/transaction and price/
  surface filter parameterization.

This is a parity fix only. It does not activate Neon in production.
