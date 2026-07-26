# AkarFinder — Transactional Recrawl Activation V1

## Objective

Atomically connect the certified source adapter and recrawl worker to the existing observation ledger, lifecycle engine and scheduler.

## Atomic boundary

The RPC `commit_transactional_recrawl_observation_v1` performs, within one PostgreSQL transaction:

1. lock and validate the active recrawl lease;
2. read the previous canonical source observation;
3. append the new factual observation idempotently;
4. derive reproducible ledger events;
5. append the lifecycle/freshness evaluation;
6. record the recrawl attempt;
7. release the lease and set the next recrawl time.

Any exception rolls the complete operation back.

## Invariants

- append-only factual observation history;
- deterministic event keys;
- no inferred price or availability facts;
- no direct public or authenticated access;
- service-role execution only;
- active lease and worker ownership required;
- retries remain idempotent;
- `publication_eligible=false` is returned and remains enforced by downstream tables;
- no SERP activation in this LOT.

## Adaptive schedule

- price change or reactivation: 12 hours;
- content/surface/availability update or first observation: 1 day;
- unchanged active offer: 7 days;
- withdrawn offer: 14 days.

These intervals are internal V1 policy defaults, not claims about source behaviour.

## Certification boundary

CI validates SQL structure, security, atomic wiring, idempotency references, TypeScript and production build. A live production persistence proof is not executed by CI because it requires service-role credentials and must be performed separately against a controlled leased source offer after migration review.
