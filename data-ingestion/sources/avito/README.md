# Avito Immobilier — Phase 0 Coverage Proof

**Status:** 🟡 OPEN — native sitemap lane 🔴 BLOCKED (HTTP 403); indirect/public-index lanes continue

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

Under RFC 9309 matching semantics, if no group matches a crawler product-token and no `User-agent: *` group exists, no robots rules apply to that crawler. On the robots snapshot observed on 2026-09-04, no `AkarFinderCoverageBot` group and no wildcard group were visible. Therefore the robots matching sub-check had no applicable disallow rule for this exact product-token.

That robots result is not blanket permission. Actual HTTP behavior is an independent gate.

Absolute rule:

- no private API harvesting;
- no CAPTCHA/access-control bypass;
- no rotating-proxy bypass;
- no request to a route that the current applicable robots policy disallows;
- explicit 403/429 => stop the native lane rather than evade it.

## Lane A — advertised sitemap — 🔴 BLOCKED FOR CURRENT BOT/ENVIRONMENT

A bounded GitHub-hosted probe performed exactly one request to:

`https://www.avito.ma/sitemap.xml`

with:

`AkarFinderCoverageBot/0.1 (+https://akarfinder.vercel.app)`

Observed result:

```text
HTTP status: 403
Content-Type: text/html; charset=UTF-8
Body bytes: 5585
XML structure: unknown
<loc> count: 0
Control IDs matched: 0
```

Evidence:

`data-ingestion/sources/avito/evidence/sitemap-probe-github-2026-09-04.json`

Workflow/run provenance is preserved in that evidence file.

Decision:

- the sitemap remains advertised by Avito, but is not retrievable by the identifiable AkarFinder bot from the tested GitHub-hosted environment;
- do not retry it through alternate identities, proxy rotation, CAPTCHA/access-control workarounds or other evasion;
- do not request child sitemaps because no valid sitemap index was obtained;
- this result does **not** prove the sitemap does not exist for other legitimate clients. It proves this production-candidate lane is blocked in the tested configuration.

## Lane B — public Avito category/detail surfaces — 🟡 BOUNDED QUALIFICATION

Public HTML/category/detail surfaces may be used only when the exact route form and observed HTTP behavior allow the identifiable AkarFinder client.

### Native source-ID identity proof

A public Avito detail page reached through an already-public source link was boundedly verified:

```text
URL suffix: ..._57568471.htm
Native page: Réf de l'annonce : #57568471
```

Therefore, for this bounded native sample, the trailing numeric token before `.htm` equals Avito's displayed source reference.

Verified extraction rule:

```text
source.name = "avito"
source.source_id = trailing numeric ID before .htm
```

The parser may use this identity rule for Avito URLs matching the verified shape while retaining URL provenance. Broader route-shape coverage remains Phase 0 work.

## Lane C — public external indexes — CONTROL / SEED ONLY

Public real-estate indexes expose direct links back to Avito listings. They may be used as bounded coverage-control surfaces to detect Avito IDs or route families missed by native lanes.

They are **not** an authority for Avito listing content and are not ingested as if they were Avito.

Rule:

```text
external public index exposes Avito source URL/ID
→ preserve only source URL/ID + control provenance
→ native/source-specific evidence required before unsupported fields become canonical truth
```

The bounded Kaynly control fixture contains 12 real Avito outbound URLs:

`data-ingestion/sources/avito/evidence/kaynly-avito-sample-2026-09-04.json`

Parser / overlap implementation:

`data-ingestion/sources/avito/overlap.ts`

## Lane D — public search-engine index — SECONDARY CONTROL

First bounded exact-ID baseline over the 12-ID control sample:

```text
hits = 0 / 12
coverage = 0%
```

Interpretation:

- exact-ID generic web search is not sufficient as a primary Avito discovery lane;
- this does not prove those IDs are absent from every public index;
- use search engines only as residual detectors / seeds.

## Lane E — Common Crawl / public crawl indexes — 🟡 ACTIVE CONTROL

Common Crawl public URL indexes are queried without requesting Avito directly.

Current bounded probe:

`scripts/scrapers/avito-commoncrawl-control-probe.mjs`

Budget:

```text
12 Avito control URLs × 3 Common Crawl indexes = 36 requests max
```

It writes:

`data-ingestion/runs/avito/commoncrawl-control-probe/report.json`

A Common Crawl capture is historical discovery evidence only. It is never proof that the Avito listing remains active today.

## Lane F — authorized partner/feed route — 🟡 RESEARCH

Investigate official/commercial Avito professional, XML/feed or partner integration access for high-volume freshness.

Research notes:

`data-ingestion/sources/avito/PARTNER_FEED_RESEARCH.md`

Third-party claims that Avito integrations exist are evidence that a professional integration ecosystem may exist, not proof that AkarFinder currently has read/feed rights.

## Coverage model

```text
U_avito =
  allowed_native_public
  ∪ qualified_external_controls
  ∪ public_crawl_indexes
  ∪ authorized_partner_feed
```

The currently blocked sitemap lane is kept as an explicit explained remainder rather than silently bypassed.

## Gates

| Gate | Status | Current fact |
|---|---:|---|
| P0-A route families | 🟡 | native detail/category + external-index + public-crawl + partner candidates identified; sitemap lane blocked |
| P0-B dimensions | 🟡 | verified detail URL exposes route semantics; full transaction/type/geography matrix pending |
| P0-C reachability | 🟡 | 12-ID control sample exists; exact-ID web search 0/12; native source-ID identity confirmed; Common Crawl overlap pending |
| P0-D authorized traversal | 🟡 / sitemap 🔴 | robots matching had no applicable rule for exact bot token, but actual root-sitemap request returned 403, so that native lane is stopped |
| P0-E denominator | ⚪ | no certified Avito-native unique-ID denominator yet |

## Next exact

1. keep the direct sitemap lane frozen after the documented 403;
2. execute and preserve the 12-URL × 3-index Common Crawl overlap report;
3. measure `control IDs ∩ Common Crawl IDs` and enumerate residuals;
4. expand bounded native source-ID confirmation only through public/allowed routes and stop on 403/429;
5. investigate official/commercial partner-feed access for current high-volume freshness;
6. combine independent lanes into a provenance-preserving Avito ID union;
7. only then decide whether an authorized Full Harvest plan can reach acceptable coverage.

No DB write. No image download. No Vercel deployment. No merge.
