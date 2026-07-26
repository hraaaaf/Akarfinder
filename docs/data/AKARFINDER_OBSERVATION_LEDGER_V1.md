# AkarFinder Observation Ledger V1

## Status

Implementation candidate. Internal only. No SERP activation and no production database write in this lot.

## Purpose

The ledger derives factual temporal events from the existing append-only `source_offer_observations` stream. It does not replace observations and does not invent history.

Canonical flow:

`SOURCE OFFER → APPEND-ONLY OBSERVATIONS → EVENT DERIVATION → TIMELINE → FRESHNESS → FUTURE DISPLAY ELIGIBILITY`

## Invariants

- `source_offer_observations` remains the source of truth;
- events are deterministic projections and retain both observation identifiers;
- comparisons are allowed only inside one `source_offer_id`;
- an empty history remains unknown;
- no availability claim is promoted to a verified real-world fact;
- no event is publicly exposed by this lot;
- repeated derivation produces the same `event_key` values;
- no update or delete is required on the append-only observation stream.

## V1 event taxonomy

- `first_observed`
- `price_decreased`
- `price_increased`
- `price_disclosed`
- `price_removed`
- `content_changed`
- `surface_changed`
- `withdrawn`
- `reactivated`
- `availability_changed`

A price event records previous value, current value, exact delta and percentage when computable.

## Timeline metrics

For one source offer:

- first and last observed timestamps;
- observation count;
- observed lifespan in days;
- change count;
- price-change count;
- withdrawal count;
- reactivation count;
- last known source status;
- last observed price;
- freshness age, score and band.

## Freshness V1

Freshness is calculated from the last observation timestamp with a deterministic 14-day exponential decay.

Bands:

- `fresh`: 24 hours or less;
- `recent`: more than 24 hours and up to 7 days;
- `aging`: more than 7 days and up to 30 days;
- `stale`: more than 30 days.

The score is an internal temporal signal, not proof that the property remains available.

## Security and publication

This lot adds pure domain logic and tests only. It does not:

- create a public API;
- alter RLS;
- grant access to `anon` or `authenticated`;
- persist derived events in production;
- display price history or lifecycle claims in the SERP.

A later persistence lot must use an additive internal table, deterministic event-key uniqueness, service-role-only writes, revocation from public roles and a controlled backfill.

## Certification gates

- event taxonomy tests;
- deterministic idempotency-key test;
- price delta test;
- withdrawal/reactivation tests;
- cross-offer comparison refusal;
- unknown-history test;
- freshness degradation test;
- TypeScript;
- production build.
