# Avito Immobilier — Phase 0 Coverage Proof

**Status:** 🟡 OPEN — public discovery lanes qualified, first overlap baseline recorded

## Goal

Prove the complete, authorized and relevant Avito real-estate coverage model before any Full Harvest.

## Public-policy facts verified — 2026-09-04

`https://www.avito.ma/robots.txt` is public and advertises:

```text
Sitemap: https://www.avito.ma/sitemap.xml
```

The observed file contains crawler-specific groups and no visible `User-agent: *` group. It also disallows `/api/v1` for named crawler groups.

The probe user-agent is explicitly identifiable:

```text
AkarFinderCoverageBot/0.1 (+https://akarfinder.vercel.app)
```

Under RFC 9309 matching semantics, if no group matches a crawler product-token and no `User-agent: *` group exists, no robots rules apply to that crawler. On the robots snapshot observed on 2026-09-04, no `AkarFinderCoverageBot` group and no wildcard group were visible. Therefore the **robots matching sub-check currently has no applicable disallow rule for this exact product-token**.

This is not treated as a guarantee that Avito will return HTTP 200, nor as blanket permission outside the exact public surfaces being qualified. Server responses and other applicable access constraints remain independent gates.

Absolute rule:

- no private API harvesting;
- no CAPTCHA/access-control bypass;
- no rotating-proxy bypass;
- no request to a route that the current applicable robots policy disallows;
- explicit 403/429 => stop the native lane rather than evade it.

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

A bounded GitHub-hosted qualification probe now exists at:

`scripts/scrapers/avito-sitemap-probe.mjs`

It performs one request to the advertised root sitemap with the identifiable AkarFinder user-agent and reports HTTP status, content type, XML structure, `<loc>` count and control-ID overlap. It opens no listing detail page.

The existing P0-D workflow contains a dedicated `avito-sitemap-probe` job so this check can run in the already-established authorized-traversal gate.

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

The bounded Kaynly control sample currently contains 12 real Avito outbound URLs. Every sampled URL ends with the trailing numeric source ID before `.htm`.

Evidence fixture:

`data-ingestion/sources/avito/evidence/kaynly-avito-sample-2026-09-04.json`

Parser / overlap implementation:

`data-ingestion/sources/avito/overlap.ts`

Candidate identity rule:

```text
source.name = "avito"
source.source_id = trailing numeric ID before .htm
```

Native bounded confirmation is still required before this identity rule becomes certified.

### Lane D — public search-engine index — SECONDARY CONTROL

Search-engine results may be used only as a residual detector / seed source for publicly indexed Avito URLs.

They never replace Avito as provenance and do not authorize fetching an otherwise disallowed Avito route.

#### First bounded overlap baseline — 2026-09-04

Control sample: 12 Avito IDs exposed by a public Kaynly page.

Exact-ID public web-search check:

```text
hits = 0 / 12
coverage = 0%
```

Interpretation:

- exact-ID web search is not sufficient as a primary Avito discovery lane;
- this result does **not** prove those IDs are absent from every search engine or public web index;
- sitemap/native overlap remains the important next measurement.

### Lane E — Common Crawl / public crawl indexes — SECONDARY DISCOVERY

Common Crawl provides public CDXJ/URL indexes that can be queried without requesting Avito directly. This lane is useful for historical URL discovery and residual coverage, with Common Crawl provenance retained separately from native Avito observations.

It must not be mistaken for current-availability proof: an archived Avito URL may be stale or deleted today.

## Why this matters

A single blocked route must not be confused with a blocked source.

The Phase 0 proof asks:

```text
Can the complete public Avito universe be explained through
sitemap
+ allowed native public surfaces
+ external public control indexes
+ public crawl indexes
+ explicit restricted remainder?
```

If yes, Avito remains viable even without private APIs or aggressive crawling.

## Gates

| Gate | Status | Current fact |
|---|---:|---|
| P0-A route families | 🟡 | sitemap + native category + external/public-crawl control lanes identified |
| P0-B dimensions | 🟡 | detail URL exposes district/category structure; full matrix pending |
| P0-C reachability | 🟡 | 12-ID external control sample exists; exact-ID web search found 0/12; sitemap/Common Crawl overlap pending |
| P0-D authorized traversal | 🟡 | robots matching sub-check has no applicable rule for the exact AkarFinder product-token on the observed snapshot; live sitemap HTTP result pending |
| P0-E denominator | ⚪ | no certified Avito-native unique-ID denominator yet |

## Next exact

1. obtain the bounded root-sitemap HTTP result from the P0-D job;
2. qualify sitemap structure and, if it is a sitemap index, identify inventory-bearing child sitemaps before requesting any child;
3. compare native sitemap IDs with the 12-ID Kaynly control sample;
4. query Common Crawl URL indexes for the same control sample and measure historical discovery overlap;
5. native-confirm the trailing numeric detail-ID pattern when an allowed native surface exposes it;
6. enumerate residual IDs and explain every residual by route/dimension/restriction;
7. investigate an official/commercial partner-feed route for high-volume freshness;
8. only then decide whether a complete authorized Full Harvest is possible.

No DB write. No image download. No Vercel deployment. No merge.
