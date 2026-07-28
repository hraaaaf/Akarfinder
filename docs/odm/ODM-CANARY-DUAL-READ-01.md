# ODM-CANARY-DUAL-READ-01

## Verdict

`SHADOW_WIRED_NOT_ACTIVATED`

## Objective

Execute the ODM public read model after the legacy `/api/search` response has been produced, compare both outputs, and emit structured divergence metrics without allowing ODM to influence the response.

## Public boundary

- `/api/search` continues to return `searchListings(query)` unchanged.
- ODM execution is scheduled with Next.js `after()`.
- ODM errors are logged and never alter status, body, ranking or fallback behavior.
- No database write is introduced.
- No production environment variable is changed by this LOT.

## Flags

Both variables are required:

- `ODM_DUAL_READ_ENABLED=true`
- `ODM_DUAL_READ_SAMPLE_PERCENT=<value>`

The sample is deterministic and capped at 5%. Invalid, missing, zero or excessive values fail closed to 0%.

## Metrics

The structured `odm_dual_read_v1` event reports:

- legacy and ODM result counts;
- canonical URL overlap and overlap rate;
- overlap in the first ten ranked results;
- trusted price comparisons and divergences;
- trusted surface comparisons and divergences;
- a truncated hash of the stable query key;
- generation timestamp.

Raw search terms and user identifiers are not emitted.

## Activation sequence

1. Merge this preparation and wiring LOT with both flags absent.
2. Confirm production build and route health with 0% sampling.
3. Set the flag and a low shadow sample through the deployment environment only.
4. Observe metrics for a bounded window.
5. Disable immediately if errors, latency or divergence collection are unreliable.

## Rollback

Set either:

- `ODM_DUAL_READ_ENABLED=false`, or
- `ODM_DUAL_READ_SAMPLE_PERCENT=0`.

The legacy response path remains structurally independent, so rollback does not require a database migration or code revert.

## Explicit non-goals

This LOT does not:

- serve an ODM result;
- activate the 1% public canary;
- change the SERP or Search JSON contract;
- modify ranking;
- write comparison results to a database;
- change source policy or display eligibility.
