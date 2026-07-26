# ODM-08 — End-to-end DATA certification

## Scope

Certification of the production-like pre-launch database for the complete chain:

`ODM-03 recovery -> ODM-04 normalization -> ODM-05 quality -> ODM-06 display eligibility/ranking -> ODM-07 Search Gateway RPC`

No Vercel deployment is part of this milestone.

## Database target

Supabase project: `kusfiyimwvxblvsrhaes`

The project is not publicly launched, so the existing database was used as the integration environment. No paid Supabase branch was created.

## Certification result

Verdict: `CERTIFIED_WITH_NON_BLOCKING_SECURITY_FINDINGS`

Observed after deterministic backfill repair:

| Metric | Result |
|---|---:|
| Thin Index rows | 55,946 |
| Normalized city | 23,703 |
| Normalized property type | 2,009 |
| Normalized intent | 2,009 |
| Normalized price | 764 |
| Normalized surface | 1,722 |
| Normalized price/m2 | 549 |
| Q0 | 53,706 |
| Q1 | 597 |
| Q2 | 1,047 |
| Q3 | 596 |
| Primary lane | 1,643 |
| Secondary lane | 54,303 |

## Invariants

All certified at zero violations:

- missing quality tier
- missing display eligibility
- Q0/Q1 leak into primary lane
- Q2/Q3 leak into secondary lane
- quality boost outside 0 to 0.35
- unsupported seed provider
- duplicate canonical URL
- price/m2 alias mismatch

`search_thin_index_v3` returned 500 filtered rows for the certification query:

- query: `appartement`
- city: `Casablanca`
- property type: `apartment`
- intent: `sale`

## Defect found and repaired

The original ODM-05 and ODM-06 backfills used no-op updates that did not fire `UPDATE OF` triggers for the required columns. This left pre-existing rows without quality and eligibility values.

ODM-08 adds an explicit idempotent recomputation migration so a clean migration replay produces the same certified state.

## Non-blocking findings

Supabase advisors report pre-existing security hardening work outside this milestone:

- several internal tables have RLS enabled with no policies;
- legacy permissive `service_role_all` policies exist;
- two OpenSERP lock functions have mutable search paths;
- `unaccent` is installed in the public schema.

These findings do not invalidate the ODM-03 to ODM-07 DATA chain, but must be addressed before public launch.

## Exit criteria

- migration chain represented in Git: PASS
- production-like DB migrated: PASS
- deterministic repair persisted: PASS
- audit SQL persisted: PASS
- RPC V3 real-data test: PASS
- DATA invariants: PASS
- Vercel deployment: NOT PERFORMED
