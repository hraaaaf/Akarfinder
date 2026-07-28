# AkarFinder Freshness & Lifecycle V1

## Status

Internal deterministic foundation. No public activation.

## Source of truth

`source_offer_observations` remains the factual append-only stream. Freshness and lifecycle signals are projections, never replacements and never proof of real-world availability.

## Lifecycle taxonomy

- `unknown`
- `newly_observed`
- `active`
- `recently_updated`
- `price_changed`
- `content_changed`
- `probably_stale`
- `withdrawn`
- `reactivated`

Age alone can produce only `probably_stale`; it can never produce `withdrawn`.

## Internal signals

- freshness score and band;
- lifecycle state and score;
- volatility score;
- observation density;
- confidence score;
- next recheck timestamp;
- recrawl priority;
- evidence event keys and blockers.

## Security

`source_offer_lifecycle_signals` is internal-only:

- RLS enabled;
- no access for `anon` or `authenticated`;
- service-role-only SELECT/INSERT;
- RPC uses `SECURITY INVOKER`;
- `publication_eligible` is permanently false in V1;
- no public view and no SERP wiring.

## Production state — 2026-07-26

Migration applied to Supabase project `kusfiyimwvxblvsrhaes`.

The observation stream contained no factual rows at activation time, therefore no lifecycle signal backfill was executed. The system will only calculate signals after real observations exist.

## Certification

- empty history remains unknown;
- cross-offer evaluation refused;
- old observation is probably stale, never withdrawn;
- withdrawal and reactivation require explicit status evidence;
- deterministic output independent of input ordering;
- persistence constrained and internal;
- TypeScript and production build required.
