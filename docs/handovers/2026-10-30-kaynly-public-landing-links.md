# AkarFinder — Kaynly public landing link acquisition (2026-10-30)

**Goal:** Faster independent URL discovery via sitemap and permitted landing pages, without /resultats, API access, protections bypass or direct downloading of photos.

**Pilot actually observed:** 20 public city/category pages (10 cities x sale/rent), 180 distinct direct source URLs: 60 Mubawab, 65 Avito, 28 Yakeey, 25 Sarouty, 2 Noura. Sources and source-page provenance at https://app.notion.com/p/40977c66336281c7ae78c5757dd10c16 . Published sitemap advertises 1452 landing pages; not 1452 listings. Comparison after independent capture: 60 Mubawab IDs vs existing 934 Mubawab candidates → 13 overlaps, 47 new; +120 other-platform references = 1101 platform-ID references. None certified as unique physical properties or active offers.

**Implemented:** scripts/acquisition/kaynly-open-links/collector.py, offline tests, 60-page GitHub Actions probe and evidence artifacts. Neither /api nor /resultats requested by this collector; stops on access restriction/429. No production DB, images, merge, Vercel deployment or commercial reuse license.

**Next exact:** inspect CI and artifact on HEAD, compare further new source IDs against 1101, then expand only authorized sitemap landing coverage if reliable. Fiche details/photos separately require access/rights. PR DRAFT pending human validation.
