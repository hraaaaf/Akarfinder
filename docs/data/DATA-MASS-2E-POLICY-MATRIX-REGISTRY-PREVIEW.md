# DATA MASS-2E — Policy Matrix & Registry Preview

Status: ACTIVE

## Purpose
Consolidate the certified MASS-2B, 2C and 2D review outputs into one deterministic 101-source policy matrix and a production-schema-compatible Registry preview. This lot performs no Registry write, no ingestion and no Search activation.

## Certified input distribution
- 101 domains total
- 43 `PERMISSION_REQUIRED`
- 58 `HOLD`
- 43 `CANONICAL_LINK_ONLY_CANDIDATE`
- 0 canonical-link approved
- 0 public activable

Certified yield handoff:
- 22,656 URL representations
- 19,665 likely Morocco real-estate signals
- 4,114 likely listing-detail structures

## Preview doctrine
A candidate is not authorization. Every preview row therefore remains machine-gated as `internal_signal_only`, ingestion-gated as `internal_signal_only`, and `display_gate=hidden`. `allowed_discovery_channels=[]` for all 101 rows.

`PERMISSION_REQUIRED` becomes a preview with `authorization_status=permission_required` and action `REQUEST_PERMISSION`.

`HOLD` becomes a preview with `authorization_status=unverified` and action `RESOLVE_POLICY`.

## Production safety
The live audit reads `source_policy_registry` only to measure overlap/drift. It does not insert, update, delete or mutate policy. Source sites are not fetched by the CI audit.

## Predecessor
MASS-2D merge `cd59dc98e63ddbcb26bdcf10ff7bc764ccae2d7d`; run `31652317798`; artifact `9163075972`; digest `sha256:679367384ce3ca1cc183e496c41209ccd1900698ce706a8321fd868937be69e5`.
