# Public Index POC Migration — Quarantine

**Mission:** AKARFINDER-PUBLIC-INDEX-POC-MIGRATION-QUARANTINE-1

## What was found

During `AKARFINDER-MARKET-INDEX-FOUNDATION-PROD-ACTIVATION-2`'s pending-migrations
gate (mission section 14), `supabase/migrations/` was found to contain 6 files
instead of the 5 authorized Market Index migrations:

- The 5 approved migrations, all dated `20260716140xxx` — unaffected by this
  mission, unchanged, still present in `supabase/migrations/`.
- `20260709193000_create_public_property_index_poc.sql` — an older, unrelated
  file, not part of the Market Index Foundation work, not on the approved
  list.

Because the pending-migrations gate requires the pending set on Production to
be exactly the 5 approved migrations, this discovery blocked the activation
mission (status `ACTIVATION_BLOCKED_PENDING_MIGRATION_GATE`) and required a
dedicated, narrowly-scoped correction mission — this one — before Market
Index activation could resume.

## Original file

- **Original path:** `supabase/migrations/20260709193000_create_public_property_index_poc.sql`
- **Introducing commit:** `162fff0` — `feat(search): add public async index OpenSERP POC`
- **SHA-256 (before move):** `cd6443e466d29340b879d569259438649f2dbad1583a1aed4e567e5d97a8b2e3`
- **Content:** creates `public_property_index` (FTS + trigram indexes), part of
  the OpenSERP async public-index proof of concept.

## Historical objective

The migration supported `docs/PUBLIC_INDEX_ASYNC_OPENSERP_POC.md`, a LAB-only
proof of concept for an asynchronous, OpenSERP-fed public property index,
served through an internal-only route
(`app/api/internal/public-index/search/route.ts`) gated behind
`PUBLIC_INDEX_POC_ENABLED`. That document's own stated limits (section 14)
included "pas de modification Supabase production" — Production was never
meant to be touched by this POC, and its GO/NO-GO criteria (section 15) were
never exercised to promote it beyond the LAB.

## Why it is being quarantined now

A migration file living in `supabase/migrations/` reads, to any later
audit or activation mission, as "destined for the Production migration
chain." This file was left there after the POC concluded without being
either applied or removed, which is what allowed it to surface as an
unexplained foreign pending migration during the Market Index activation's
gate. Quarantining it (moving it, unmodified, out of the active migrations
directory) removes that ambiguity permanently without destroying the
historical artifact.

## Production status (verified read-only, PostgREST)

- `public_property_index` table: **does not exist** in Supabase Production
  (`HTTP 404`, `PGRST205`, `"Could not find the table 'public.public_property_index'"`).
- `PUBLIC_INDEX_POC_ENABLED` is **not set** in Production
  (`vercel env ls production`), so `createPublicPropertyIndexStore()`
  (`lib/public-property-index/index-store.ts`) always resolves to the inert
  `NoopPublicPropertyIndexStore` in Production regardless of this migration's
  status.
- No Search Gateway code, no public-facing route, and none of the 5 Market
  Index Foundation migrations reference or depend on `public_property_index`.
- No secrets, tokens, connection strings, or business data appear anywhere in
  the migration file (verified by grep before this quarantine).

## Conditions for a future reintroduction

Reintroducing `public_property_index` into the active Production migration
chain requires a dedicated ODM that re-validates the POC against current
Production data, current Search Gateway behavior, and the current feature-flag
convention — this quarantine does not authorize or schedule any such work.

## Where it lives now

- **New path:** `docs/archive/public-index-poc/20260709193000_create_public_property_index_poc.sql`
- **SHA-256 (after move):** `cd6443e466d29340b879d569259438649f2dbad1583a1aed4e567e5d97a8b2e3` (identical)
- See `docs/archive/public-index-poc/README.md` for the archive-local status
  manifest.
