# Avito — Indirect Discovery Plan

**Status:** 🔵 ACTIVE DESIGN — no anti-bot bypass
**Date:** 2026-09-04

## Goal

Maximize discovery of Avito real-estate source URLs and source IDs without depending on direct large-scale crawling of Avito listing pages and without bypassing access controls.

## Core principle

AkarFinder does not need to defeat Avito's anti-bot layer to build a strong Avito coverage graph.

Use multiple independent public/authorized discovery lanes, reconcile them by Avito source URL/source ID, and keep provenance for every observation.

## Discovery lanes

### A — Avito advertised sitemap

Avito's public `robots.txt` advertises:

`https://www.avito.ma/sitemap.xml`

Use the sitemap as the preferred native discovery surface if it is reachable and contains inventory URLs.

Rules:
- no private `/api/v1` usage;
- no CAPTCHA or authentication bypass;
- identifiable AkarFinder user-agent for any direct request;
- stop on explicit 403/429;
- bounded request rate.

### B — Public search/index surfaces

Discover public Avito URLs already indexed by search engines or public web indexes. These are discovery observations, not proof that the underlying Avito page may be bulk-fetched.

Store:
- `source = avito`
- discovered canonical/outbound Avito URL
- parsed Avito source ID when the URL identity is proven
- `discovered_via` provenance
- discovery timestamp

Do not copy unsupported fields from snippets into canonical truth without field-level provenance.

### C — Kaynly coverage oracle

Kaynly publicly presents current Avito-origin listings and redirects users to the original Avito source.

Use Kaynly only as an independent coverage/control surface unless its automated-access policy and terms are separately qualified.

Primary use:

`Avito IDs/URLs observed by Kaynly` vs `Avito IDs/URLs discovered by AkarFinder`

Missing IDs become residual coverage candidates to explain.

Kaynly-derived metadata must never be silently represented as a direct Avito fetch. Provenance remains explicit.

### D — Other public index/control surfaces

Use additional public indexes only as independent discovery/control sources. Cross-source agreement raises confidence; it does not override access policy for the origin portal.

### E — Authorized partner/feed route

Investigate an official/commercial Avito data or partner-feed relationship. Moroccan real-estate software vendors publicly describe Avito integrations through API/XML-style feeds, which is evidence that partner integration paths may exist, but this is not yet proof of an AkarFinder-readable Avito API.

This lane is the preferred long-term route for high-volume freshness if Avito offers suitable rights.

## Explicitly rejected production strategy

Do not base AkarFinder on residential proxy rotation, CAPTCHA solving, user-agent impersonation, private API reverse engineering, session/account cycling, or other anti-bot evasion.

Third-party scrapers may advertise such techniques; their existence is not a coverage or authorization proof for AkarFinder.

## Coverage union

Build a source-ID union:

`U_avito = sitemap ∪ public_index ∪ qualified_kaynly_control ∪ other_qualified_controls ∪ authorized_feed`

For each ID retain all observed discovery surfaces.

## Success criteria

P0-C / reachability can pass when:
- Avito detail identity/source-ID pattern is proven;
- at least two independent discovery lanes produce overlapping Avito IDs;
- residual IDs from the control lane are measured and explained;
- the native/authorized lane covers an acceptably high share of control IDs.

P0-D / authorized traversal can pass only for the specific lanes proven acceptable for automated access.

Full Harvest remains blocked until P0-A..P0-E pass for the chosen production lanes.

## Next exact

1. qualify `https://www.avito.ma/sitemap.xml` structure;
2. prove Avito detail URL/source-ID identity from bounded public evidence;
3. sample Avito-origin records exposed by public control surfaces;
4. build an ID-only overlap manifest across sitemap/index/control observations;
5. investigate official Avito professional/partner feed access;
6. do not touch PROD, images, private APIs or anti-bot bypasses.
