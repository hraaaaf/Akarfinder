# Avito Immobilier — Phase 0 Coverage Proof

**Status:** 🟡 OPEN — sitemap/category/detail qualification pending

## Goal

Prove the complete, authorized and relevant Avito real-estate coverage model before any Full Harvest.

## Verified public-policy facts — 2026-09-04

`https://www.avito.ma/robots.txt` is public and advertises:

```text
Sitemap: https://www.avito.ma/sitemap.xml
```

The same robots file explicitly disallows `/api/v1` for named crawler groups. AkarFinder will not use private/API harvesting paths or attempt to bypass access controls.

## Gates

| Gate | Status | Current fact |
|---|---:|---|
| P0-A route families | ⚪ | sitemap/category structure still to qualify |
| P0-B dimensions | ⚪ | real-estate transaction/type/geography matrix pending |
| P0-C reachability | ⚪ | no sitemap/category overlap proof yet |
| P0-D authorized traversal | 🟡 | robots available; each candidate route still requires policy evaluation |
| P0-E denominator | ⚪ | no certified native unique-ID denominator yet |

## Next exact

1. qualify the advertised public sitemap structure;
2. isolate real-estate inventory URLs from non-real-estate Avito content;
3. inventory public category/type/geography routes without using `/api/v1`;
4. prove detail URL/source-ID identity from bounded public evidence;
5. compare sitemap IDs with public category controls;
6. keep Full Harvest BLOCKED until P0-A..P0-E PASS.

No DB write. No image download. No Vercel deployment.
