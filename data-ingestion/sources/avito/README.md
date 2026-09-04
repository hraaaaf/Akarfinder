# Avito Immobilier — Phase 0 Coverage Proof

**Status:** 🟡 OPEN — public discovery lanes qualified, certification pending

## Goal

Prove the complete, authorized and relevant Avito real-estate coverage model before any Full Harvest.

## Public-policy facts verified — 2026-09-04

`https://www.avito.ma/robots.txt` is public and advertises:

```text
Sitemap: https://www.avito.ma/sitemap.xml
```

The observed file contains crawler-specific groups and no visible `User-agent: *` group. It also disallows `/api/v1` for named crawler groups.

This is not treated as blanket permission. The project robots checker must evaluate the current policy against the exact identifiable AkarFinder user-agent before every live lane is certified.

Absolute rule:

- no private API harvesting;
- no CAPTCHA/access-control bypass;
- no rotating-proxy bypass;
- no request to a route that the current applicable robots policy disallows.

## Alternative public discovery strategy

Avito is too important to abandon merely because one technical route is inconvenient. Phase 0 therefore uses multiple independent public lanes.

### Lane A — advertised sitemap — PRIMARY CANDIDATE

Use the sitemap advertised by Avito itself as the preferred inventory discovery surface if it is retrievable and applicable policy allows it.

Goal:

```text
sitemap URLs
→ isolate real-estate detail URLs
→ extract source IDs
→ deduplicate
→ classify geography/type/transaction dimensions
```

No detail content or images are required during coverage proof.

### Lane B — public Avito category/search pages — PRIMARY CANDIDATE

Inventory the public HTML/category surfaces visible to ordinary unauthenticated users.

These are used only when the exact route form passes the current robots policy for the AkarFinder bot.

### Lane C — public external indexes — CONTROL / SEED ONLY

Public real-estate indexes already expose direct links back to Avito listings. They may be used as a bounded coverage-control surface to detect Avito IDs or route families missed by Lane A/B.

They are **not** an authority for Avito listing content and are not ingested as if they were Avito.

Rule:

```text
external public index exposes Avito source URL/ID
→ preserve only source URL/ID + control provenance
→ require native Avito confirmation before canonical ingestion
```

This turns third-party aggregators into a coverage oracle, not a data supplier.

Public seed evidence observed on 2026-09-04 includes direct Avito URL shape:

```text
/fr/{district}/{category}/{slug}_{numericId}.htm
```

Example source ID observed through a public direct source link:

```text
58413694
```

Candidate identity rule:

```text
source.name = "avito"
source.source_id = trailing numeric ID before .htm
```

Native bounded confirmation is still required before this identity rule becomes certified.

### Lane D — public search-engine index — SECONDARY CONTROL

Search-engine results may be used only as a residual detector / seed source for publicly indexed Avito URLs.

They never replace Avito as provenance and do not authorize fetching an otherwise disallowed Avito route.

## Why this matters

A single blocked route must not be confused with a blocked source.

The Phase 0 proof asks:

```text
Can the complete public Avito universe be explained through
sitemap
+ allowed native public surfaces
+ external public control indexes
+ explicit restricted remainder?
```

If yes, Avito remains viable even without private APIs or aggressive crawling.

## Gates

| Gate | Status | Current fact |
|---|---:|---|
| P0-A route families | 🟡 | sitemap + native category + external-index control lanes identified |
| P0-B dimensions | 🟡 | detail URL exposes district/category structure; full matrix pending |
| P0-C reachability | 🟡 | external indexes already expose direct Avito IDs; overlap with sitemap/native surfaces pending |
| P0-D authorized traversal | 🟡 | robots is crawler-specific; exact AkarFinder matching + sitemap/native lane authorization still to prove |
| P0-E denominator | ⚪ | no certified Avito-native unique-ID denominator yet |

## Next exact

1. fetch/evaluate current robots policy against the exact AkarFinder user-agent;
2. qualify the advertised sitemap structure;
3. extract a bounded real-estate ID sample from the sitemap if allowed;
4. native-confirm the trailing numeric detail-ID pattern;
5. build a bounded control sample from public external-index Avito source links;
6. compare `external-control IDs ⊆ sitemap/native IDs`;
7. enumerate residual IDs and explain every residual by route/dimension/restriction;
8. only then decide whether a complete authorized Full Harvest is possible.

No DB write. No image download. No Vercel deployment. No merge.
