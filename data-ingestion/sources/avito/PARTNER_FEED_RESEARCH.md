# Avito — Partner / Feed Research

**Status:** 🟡 PLAUSIBLE, NOT VERIFIED WITH AVITO
**Date:** 2026-09-04

## Goal

Determine whether AkarFinder can obtain high-volume Avito real-estate freshness through an authorized professional integration instead of direct large-scale crawling.

## Evidence found

Several Moroccan real-estate technology vendors publicly advertise synchronization with Avito using API- or XML-style connectors / feeds.

Examples observed during research:

- Eurastech states that it connects real-estate tools to Avito and other Moroccan portals through API or XML feeds, including listing/status synchronization where supported.
- OneClick Marrakech advertises API/XML bridges for synchronizing agency listings with portals including Avito.
- Roctify advertises compatibility with Avito Pro and says it can use custom connectors or FTP/XML export where no public API exists.

## Important limitation

These claims prove only that professional publishing/integration paths appear to exist in the Moroccan ecosystem.

They do **not** prove:

- that Avito exposes a public read API;
- that the feed is bidirectional;
- that AkarFinder may read the full Avito catalog;
- that an Avito Pro publishing connector grants search/index access;
- that any undocumented endpoint is authorized for AkarFinder.

## Decision

Treat an official/commercial Avito relationship as a high-priority lane, but keep it separate from Phase 0 technical discovery until Avito itself confirms the rights and interface.

Preferred request to Avito:

1. full or incremental real-estate catalog feed, if offered;
2. stable listing source ID and canonical source URL;
3. change events / updated-at / deleted-at semantics;
4. geography, transaction and property-type fields;
5. explicit permission for indexing and redirecting to Avito;
6. rate limits and retention terms;
7. image usage rights separately, not assumed.

## Current production decision

No private endpoint, reverse-engineered API, account/session cycling, CAPTCHA solving or proxy-based anti-bot evasion is part of the AkarFinder Avito production plan.

Until Avito confirms a partner feed, the technical coverage proof continues with:

`sitemap + allowed native public surfaces + qualified external control lanes`
