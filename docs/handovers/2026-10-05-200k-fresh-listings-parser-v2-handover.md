# AkarFinder — 200K Fresh Listings / Parser V2 Handover

Date: 2026-10-05

## Goal

>= **200,000 fresh, unique, exploitable listings** with canonical URL + city + district + price + surface.

A `parser_miss` requires positive source evidence that the field exists.

## Verified freeze baseline

Artifact `10910779576` / SHA-256 `e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953`.

- 226,286 rows / 226,286 unique URLs
- 222,359 scope eligible
- 225,952 KEEP
- DB access/write 0/0

Mixed freeze schema:
- universal URL/crawl metadata;
- optional enrichment on deep-observed rows.

Verified enriched subset:
- HTTP-200 rows 8,487
- title 8,487
- description 8,487
- published_at 8,487
- city 8,454
- district 6,296
- price 3,770
- surface 4,567
- URL+city+district+price+surface complete: **1,191**

Global structured route evidence, state `recoverable_from_url`:
- city 61,547
- district 48,023
- transaction 60,761
- property type 61,543

## Mubawab lot

- raw URLs: **82,796**
- detail routes: **81,996**
- non-detail routes: **800**
- unique detail identities: **74,867**
- historical duplicate URL rows: **7,129**
- total raw overcount: **7,929 / 9.577%**
- scope-eligible dedup live plan: **74,486**
- identity scheme: `a:<id>` / `pa:<id>`
- tests: **6/6 PASS**

URL evidence:
- transaction 48,739 recoverable / 306 conflict
- property type 63,013 recoverable / 4,532 conflict
- surface 10,331 high / 10,160 review / 389 conflict
- free-slug city remains review-only

## Safety state

- branch: `data/200k-fresh-parser-v2`
- PR #1105: **closed**, not merged
- reason: PR opening unintentionally queued the separately human-gated Neon preflight workflow
- Neon run `37296096590`: last verified state **queued**
- Desktop Commander is connected but quota-blocked; no retry in this session
- no Neon result is claimed
- no DB write
- no Vercel deploy

Mubawab benchmark workflow is now **push-only** to avoid needing a PR.

## Next exact

1. Read the push-only Mubawab 100-identity live benchmark.
2. Convert actual source-visible-but-missed fields into true `parser_miss` metrics.
3. Fix Mubawab parser and rerun bounded benchmark if required.
4. Continue Sarout offline identity adapter in parallel.
5. Scale source refresh only after source-specific parser yield is certified.
