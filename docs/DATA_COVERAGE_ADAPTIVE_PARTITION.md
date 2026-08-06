# DATA-COVERAGE-2 — Adaptive Partition Enumerator

## Purpose

Close proven coverage gaps by subdividing only segments for which DATA-COVERAGE-1 reports both a measurable gap and pagination-cap evidence.

## Contract

The enumerator is source-agnostic and dependency-injected. It does not know portal URL syntax and does not perform network requests by itself. A source adapter supplies a `probe(node)` function and explicit partition strategies.

Default strategy order for a future Mubawab adapter is:

1. district when a verified public district vocabulary and URL/filter mapping exists;
2. price ranges;
3. surface ranges;
4. room ranges.

A strategy is skipped when its dimension is already present. Children must be distinct, increase depth exactly once and materially change the filter set.

## Stop conditions

A node becomes a leaf when the coverage auditor no longer requires partitioning. Enumeration stops fail-closed when maximum depth or node budget is reached, or when no strategy can make progress.

Blocked, unavailable, captcha/login-wall and robots-disallowed behavior remains the responsibility of the existing source adapter and must never be bypassed.

## Deduplication

Listing URLs are normalized and deduplicated globally across all visited nodes. Overlapping partitions therefore cannot inflate the resulting inventory.

## Non-goals

- no live Mubawab filter syntax is guessed;
- no scraper policy change;
- no robots bypass, CAPTCHA handling, proxy rotation or authentication bypass;
- no database migration;
- no publication-policy change.

A source-specific activation must be a separate proof-bearing lot after public filter semantics are verified.
