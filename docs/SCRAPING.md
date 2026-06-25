SCRAPING.md - AkarFinder Data Acquisition Strategy

Purpose

This file defines how AkarFinder approaches data acquisition.

Scraping is important, but it must be controlled, modular, and legally cautious.

Strategic principle

AkarFinder should not depend on one single data source.

The data strategy should combine:

1. public listing analysis;
2. agency imports;
3. promoter imports;
4. Sakan Expo inventory;
5. manually seeded demo data;
6. future partner feeds.

Data acquisition channels

1. Public portals

Possible use:

* discovery;
* market mapping;
* test ingestion;
* deduplication training;
* price comparison.

Rules:

* avoid aggressive scraping;
* track source;
* respect rate limits;
* avoid copying branding;
* avoid presenting unofficial sources as partners;
* avoid storing unnecessary data.

2. Agency CSV/XML import

Priority: high.

Why:

* cleaner data;
* less risk;
* more scalable;
* easier partnership path.

Expected fields:

* title;
* description;
* price;
* city;
* neighborhood;
* surface;
* property type;
* transaction type;
* images;
* contact;
* source reference.

3. Promoter import

Priority: very high.

Why:

* primary monetization target;
* cleaner inventory;
* Sakan Expo synergy;
* direct lead value.

Expected fields:

* project name;
* promoter name;
* city;
* neighborhood;
* unit types;
* starting price;
* delivery date;
* brochure;
* sales contact;
* payment plan if available.

4. Facebook Marketplace

Priority: experimental.

Why:

* high volume;
* noisy but valuable;
* reflects real market behavior.

Risks:

* noise;
* duplicates;
* scams;
* incomplete data;
* technical restrictions.

Approach:

* not first production dependency;
* use carefully;
* filter aggressively;
* prioritize insights over direct republication.

5. Facebook groups

Priority: experimental.

Approach:

* detect patterns;
* extract structured signals only when safe;
* avoid building the core MVP on this channel.

6. Google-indexed public listings

Priority: useful for discovery.

Use:

* discover source pages;
* identify agency/project pages;
* expand coverage.

Avoid:

* presenting Google as a data source;
* copying snippets blindly;
* scraping without source review.

7. Sakan Expo inventory

Priority: strategic.

Why:

* direct access to promoters;
* trusted inventory;
* offline-to-online loop;
* strong monetization.

Use:

* project pages;
* booth QR codes;
* brochure requests;
* visit booking;
* expo lead tracking.

Listing normalization

Every listing should be normalized into a common schema.

Required normalized fields:

* title;
* price;
* currency;
* city;
* neighborhood;
* property type;
* transaction type;
* surface;
* source;
* source URL;
* first seen date;
* last seen date.

Optional fields:

* bedrooms;
* bathrooms;
* floor;
* images;
* latitude;
* longitude;
* phone;
* agency/promoter;
* delivery date;
* payment plan.

Source tracking

Every listing must keep:

* source ID;
* source type;
* source URL;
* first seen timestamp;
* last seen timestamp;
* import method;
* raw reference if needed.

Data quality checks

For every listing, check:

* missing price;
* missing surface;
* missing city;
* invalid price;
* unrealistic price/m²;
* missing source;
* old listing;
* duplicate suspicion.

Deduplication strategy

V1 should not delete duplicates automatically.

V1 should:

* detect likely duplicates;
* assign duplicate group ID;
* choose a canonical listing;
* display duplicate warning if needed;
* allow future admin review.

Signals:

* city;
* neighborhood;
* price;
* surface;
* title;
* images;
* phone;
* source;
* publication dates.

Reliability score input

Data acquisition must support reliability scoring.

Useful signals:

* source type;
* freshness;
* completeness;
* duplicate conflict;
* price consistency;
* partner status;
* verification status;
* contact availability.

Scraping implementation rules

Scrapers should live in:

scripts/scrapers/

Imports should live in:

scripts/imports/

Shared source utilities should live in:

lib/sources/

Normalization should live in:

lib/listings/

Scoring should live in:

lib/scoring/

Deduplication should live in:

lib/dedupe/

First scraping milestone

Goal:

* ingest or seed at least 100 listings;
* normalize them;
* display them;
* test deduplication;
* test reliability score.

Acceptable first data sources:

* manual seed data;
* test HTML;
* CSV sample;
* one carefully selected public source;
* Sakan Expo/promoter sample data.

Do not do yet

Do not implement at project start:

* aggressive multi-site scraping;
* automated Facebook scraping;
* full crawler scheduler;
* paid data partnerships;
* AI extraction pipeline;
* automated source logo display;
* claim of real-time updates.

Legal and credibility caution

This file does not replace legal advice.

Before production-scale scraping:

* review source terms;
* avoid unauthorized brand use;
* avoid misleading source representation;
* minimize stored data;
* keep opt-out/removal path;
* prefer direct partnerships where possible.
