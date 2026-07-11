# Price Position Reference V2 Production Activation

## Status

`COMPLETED_PRODUCTION_ACTIVE`

## Controlled activation

The Price Position V2 candidate was activated in production in two controlled
steps:

1. Deploy with `PRICE_POSITION_REFERENCE_ENABLED=false`.
2. Smoke test routes and API.
3. Deploy with `PRICE_POSITION_REFERENCE_ENABLED=true`.
4. Smoke test again.

The preview-only proof route and fixture were removed before production.

## What was validated

- Server-side feature flag behavior
- Public route stability
- `robots.txt` and `sitemap.xml`
- Internal public-index API
- No public leakage of internal benchmark fields
- No forbidden wording in public responses

## Important note

No eligible public listing candidate was observed during inspection, so the ON
deployment did not expose a visible Price Position block on a real listing.
That does not invalidate the activation, but it should be kept in mind for
future observation history work.

## Rollback reference

- Deployment: `dpl_GabHGXXjTevd2AEEoXNwsBf77x4K`
- Alias: `https://akarfinder.vercel.app`

## Next mission

`LISTING-OBSERVATION-HISTORY-1`
