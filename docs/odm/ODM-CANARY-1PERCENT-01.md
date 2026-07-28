# ODM-CANARY-1PERCENT-01

## Verdict

`CODE_READY_NOT_ACTIVATED`

## Boundary

The public canary is capped at 1% and requires all of:

- `ODM_PUBLIC_CANARY_ENABLED=true`
- `ODM_PUBLIC_CANARY_APPROVED=true`
- `ODM_PUBLIC_CANARY_PERCENT=1`
- `ODM_PUBLIC_CANARY_STOP` absent or false

Invalid or excessive values fail closed. ODM errors return the already-computed legacy result.

## Preconditions before production activation

- at least 200 healthy dual-read events;
- divergence analyzer stop gate cleared;
- explicit deployment approval;
- production route and telemetry observation available.

## Rollback

Set `ODM_PUBLIC_CANARY_STOP=true` or disable either approval flag, then redeploy. No database migration or code revert is required.

## Publication policy

ODM rows are adapted to the legacy `SearchResult` contract with source-only access, no contact, no gallery and no unauthorized image reuse.
