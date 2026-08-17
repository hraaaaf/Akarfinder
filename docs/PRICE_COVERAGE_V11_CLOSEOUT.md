# SEARCH Price Coverage v11 — Closeout

## Goal
Refresh the current null-price reservoir after v10 without mutating production data, then identify the safest next source for price coverage expansion.

## Safety contract

- Read-only audit only.
- Sources: `mubawab.ma`, `masaken.ma`.
- 10 pages maximum per source, page size 120.
- Workflow forces `PRICE_PAGINATION_WRITE=false`.
- `price-coverage-pagination-audit.ts` fails closed if `PRICE_PAGINATION_WRITE=true`.
- No production price write occurred in v11.

## Implementation

- Functional PR: #751
- Functional head: `7e6ec6b195b6ad3dff8dca78f170170d95a9955a`
- Merge SHA: `132f899fd250c2e4ea291fe0cab2212c42177860`
- Workflow: `SEARCH Price Coverage v11 Reservoir Refresh`
- Read-only run: `31949061400`
- PR head gates: 8/8 SUCCESS.
- v11 workflow shards: 20/20 SUCCESS.

## Pre-audit stock snapshot

- LISTING total: 15,546
- LISTING with price: 3,134
- Observed coverage: 20.16%
- Eligible null-price Masaken: 344
- Eligible null-price Mubawab: 1,086

This snapshot is evidence for the cohort size at the audit boundary; live stock can move concurrently.

## Exact read-only results

### Mubawab

- candidates: 1,086
- fetched: 1,086
- identity: 329
- reliable: 266
- failed: 0
- reliable / candidates: 24.49%

Per-page reliable counts, pages 0..9:

`6, 5, 33, 41, 40, 34, 32, 30, 43, 2`

### Masaken

- candidates: 344
- fetched: 272
- identity: 272
- reliable: 109
- failed: 72
- reliable / candidates: 31.69%

Per-page results:

- page 0: 120 candidates, 88 fetched/identity, 0 reliable, 32 failed
- page 1: 120 candidates, 102 fetched/identity, 54 reliable, 18 failed
- page 2: 104 candidates, 82 fetched/identity, 55 reliable, 22 failed
- page 3: 0 candidates

Observed Masaken failures were HTTP 410 stale/deleted URLs.

### Combined

- candidates: 1,430
- fetched: 1,358
- identity: 601
- reliable: 375
- failed: 72
- reliable / candidates: 26.22%

## Decision

Both sources still contain reliable null-price inventory, but Mubawab is the preferred next bounded-write candidate because it has the largest absolute verified reservoir (266 reliable rows) and zero fetch failures in this audit. Masaken retains 109 reliable candidates but has a materially dirtier remaining cohort with 72 HTTP 410 failures.

A future production mutation is not authorized by this closeout. Any bounded write requires a new source-specific canary, exact write confirmation phrase, live revalidation immediately before each write, null-only update semantics, a hard maximum batch size, and a new explicit human production gate.

## Closeout status

v11 read-only reservoir refresh is evidenced and functionally complete. No production mutation occurred.
