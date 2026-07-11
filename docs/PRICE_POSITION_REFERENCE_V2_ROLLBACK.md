# PRICE-POSITION-REFERENCE-V2 Rollback Procedure

## Goal

Provide a safe rollback path for the price position reference POC before any production activation.

## Rollback controls

1. Set `PRICE_POSITION_REFERENCE_ENABLED=false` on the server.
2. Verify that all price position badges and blocks disappear.
3. Confirm the public routes still render normally.
4. Confirm public API payloads do not expose internal benchmark fields.
5. If a deployment must be reverted, roll back the Vercel deployment to the previous stable commit.

## Smoke checks

- `/`
- `/search?q=appartement%20casablanca`
- `/search?q=location%20studio%20casablanca`
- `/immobilier/casablanca`
- `/immobilier/casablanca/maarif`
- `/demo/promoteur`
- `/demo/agence`
- `/robots.txt`
- `/sitemap.xml`

These checks should remain stable with the feature flag disabled.

## Internal checks

- No `value_low`
- No `value_median`
- No `value_high`
- No `evidence_ref`
- No `source_registry`
- No `benchmark_value`
- No `benchmark_methodology`
- No `benchmark_date`

## Non-destructive smoke

The rollback smoke script only validates the logical disable path. It does not perform a real deployment rollback.

## What not to touch

- Search Gateway
- OpenSERP
- Supabase production
- listing data
- ranking logic

## Expected outcome

If the flag is disabled, the product should behave as if the feature does not exist, without any empty placeholders or layout gaps.
