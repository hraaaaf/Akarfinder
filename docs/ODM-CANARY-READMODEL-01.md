# ODM-CANARY-READMODEL-01

## Status

Preparation only. No public route imports the canary controller and no environment value is committed.

## Objective

Prepare a reversible 1% read-model canary comparing the current legacy search pipeline with the ODM Shadow read model without changing public behavior before an explicit activation decision.

## Hard invariants

- Legacy remains the default and rollback path.
- The canary is disabled unless both variables are explicitly valid.
- `ODM_CANARY_READMODEL_ENABLED` must equal `true` exactly.
- `ODM_CANARY_READMODEL_PERCENT` must be greater than zero and cannot exceed `1`.
- A stable request or session key is mandatory; missing keys always use legacy.
- Any malformed configuration fails closed to legacy.
- No write, ranking, display-policy or SERP mutation belongs to this lot.

## Prepared flags

```text
ODM_CANARY_READMODEL_ENABLED
ODM_CANARY_READMODEL_PERCENT
```

No values are committed. Activation requires a separate authorized change in the deployment environment.

## Deterministic routing

`stableCanaryBucket()` hashes a stable request/session key into 10,000 buckets. At 1%, only buckets 0–99 are eligible. The same key receives the same decision, preventing request-to-request oscillation.

Eligibility is not sufficient to serve ODM. The automatic stop gate must also be green.

## Observation metrics

The activation lot must emit aggregated, non-personal metrics for both pipelines:

- sample size;
- request/error rate;
- canonical-link divergence rate;
- trusted price divergence rate;
- trusted surface divergence rate;
- suppressed field rate;
- unresolved Source Registry policy rate.

Do not log raw search text, user identity, full IP addresses or listing payloads for the purpose of this canary.

## Stop thresholds V1

| Metric | Automatic stop threshold |
|---|---:|
| Evidence window | fewer than 200 evaluated requests |
| Error rate | greater than 0.5% |
| Canonical-link divergence | greater than 1% |
| Trusted price divergence | greater than 2% |
| Trusted surface divergence | greater than 3% |
| Suppressed field rate | greater than 15% |
| Unresolved source policy | greater than 5% |

A threshold breach returns `stop: true`; the serving decision must immediately fall back to legacy.

## Activation sequence for a later lot

1. Confirm main and ODM CI are green.
2. Confirm Shadow report gates remain green on current production data.
3. Wire dual-read comparison without changing the response.
4. Run a zero-traffic rehearsal with synthetic stable keys.
5. Verify dashboards and rollback alerting.
6. Set the percentage to `1` while keeping serving disabled; validate configuration parsing.
7. Explicitly enable the canary.
8. Observe at least 200 evaluated requests and the agreed time window.
9. Disable immediately on any stop-gate breach.
10. Produce a signed evidence report before proposing expansion.

## Rollback

Primary rollback requires only:

```text
ODM_CANARY_READMODEL_ENABLED=false
```

The controller then returns legacy for every request regardless of percentage. If an application integration defect exists, revert the separate activation commit; this preparation module has no route integration itself.

## CI evidence

The dedicated workflow verifies:

- all configuration is false/fail-closed by default;
- percentages above 1% are rejected;
- deterministic routing stays within the safe bound;
- missing stable keys use legacy;
- every threshold breach triggers stop;
- the controller is not imported by public application paths;
- no active canary environment value is committed.
