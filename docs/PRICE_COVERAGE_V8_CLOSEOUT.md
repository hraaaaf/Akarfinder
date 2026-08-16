# SEARCH Price Coverage v8 — canonical closeout

## Scope

Masaken-only bounded production write, built from the v7 qualified reservoir, with a mandatory read-only canary and an exact human confirmation gate before mutation.

## Functional implementation

- PR #711 merged as `ccaeaa12ae64ee8a4ae44eb64b743756d7f8e3bd`.
- Source constrained to `masaken.ma`.
- Null-price LISTING rows only.
- Live HTTP fetch + strict v5 identity/price audit immediately before each write.
- Only `normalized_price_mad` may be updated.
- Maximum 100 writes per dispatch.
- Exact confirmation phrase required at both workflow and script layers: `WRITE_100_MASAKEN_RELIABLE_PRICES`.

## Read-only canary

Run `31924021599` completed SUCCESS on `main` with write disabled.

Exact result:

- candidates: 544
- fetched: 156
- identity: 156
- reliable: 100
- failed: 18
- written: 0

The production write job was skipped, proving the read-only path remained non-mutating.

## Authorized production write

A later workflow dispatch was explicitly authorized by the human operator for a bounded write of up to 100 reliable Masaken prices.

Final run: `31925287425`.

Jobs:

- `certify`: SUCCESS
- `production-canary-read-only`: SUCCESS
- `production-bounded-write`: SUCCESS

The workflow verified the exact confirmation phrase and production credentials before running the mutation step.

Exact production write result from job `95112097219`:

- source: `masaken.ma`
- write: true
- page size: 120
- pages: 5
- max writes: 100
- candidates: 544
- fetched: 156
- identity: 156
- reliable: 100
- failed: 18
- written: **100**

The 18 failures were HTTP 410 stale/deleted listings and were not written.

## Database evidence and attribution

Pre-write snapshot taken immediately before the authorized run:

- total LISTING representations: 15,546
- LISTING representations with price: 2,936
- coverage: 18.89%
- Masaken LISTING representations: 754
- Masaken with price: 210
- Masaken coverage: 27.85%

Post-write public-search snapshot later observed:

- public search representations: 22,034
- with price: 3,077
- coverage: 13.96%
- Masaken representations: 1,178
- Masaken with price: 310
- Masaken coverage: 26.32%

The public stock changed materially in parallel, so those total/coverage deltas are not attributed to v8. The only direct write attribution is the workflow's exact **100 written Masaken rows**. The observed Masaken priced count also increased from 210 to 310, consistent with that direct write count, while the denominator concurrently increased.

## Safety conclusion

v8 completed the intended bounded production mutation with explicit human authorization and exact dual-layer confirmation. No rollback is indicated by the available evidence: all 100 written rows passed live HTTP revalidation, strict canonical identity matching, reliable v5 price extraction, source constraint, and null-price-only mutation immediately before write.

## Canonical caveat

`docs/ROADMAP.md` and `docs/SESSION.md` are intentionally not rewritten in this closeout because the connector cannot safely retrieve their complete current contents without truncation. This document is the non-destructive canonical evidence for v8 until those larger canonical files can be updated through a safe full-file workflow.
