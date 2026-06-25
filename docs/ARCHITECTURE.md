ARCHITECTURE.md - AkarFinder Technical Architecture

Architecture principle

Keep the architecture simple, modular, and easy to evolve.

Do not overengineer before market validation.

The system must support:

* search;
* listings;
* maps;
* data ingestion;
* deduplication;
* reliability scoring;
* MRE filters;
* lead capture;
* promoter workflows;
* admin monitoring;
* Sakan Expo integration.

Recommended initial stack

Frontend:

* Next.js App Router
* TypeScript
* Tailwind CSS
* Component-based UI

Backend/database:

* Supabase PostgreSQL
* Supabase Auth if needed
* Supabase Storage if needed

Search:

* Start with PostgreSQL search/simple filters.
* Upgrade later to Typesense or Meilisearch when listing volume requires it.

Maps:

* Mapbox or equivalent.
* MVP can start with map UI and coordinates when available.

Data ingestion:

* Scripts under /scripts.
* Scraping/import logic separated from UI.
* CSV/XML imports supported.
* Public scraping only after source review.

Suggested project structure

akarfinder/
├─ AGENTS.md
├─ README.md
├─ package.json
├─ app/
│  ├─ page.tsx
│  ├─ search/
│  ├─ listings/
│  ├─ promoteurs/
│  └─ admin/
├─ components/
│  ├─ layout/
│  ├─ search/
│  ├─ listings/
│  ├─ map/
│  ├─ leads/
│  └─ ui/
├─ lib/
│  ├─ listings/
│  ├─ search/
│  ├─ scoring/
│  ├─ dedupe/
│  ├─ leads/
│  ├─ sources/
│  └─ utils/
├─ scripts/
│  ├─ scrapers/
│  ├─ imports/
│  └─ seeds/
├─ supabase/
│  └─ migrations/
└─ docs/
   ├─ START.md
   ├─ PRODUCT.md
   ├─ ROADMAP.md
   ├─ ARCHITECTURE.md
   ├─ SCRAPING.md
   ├─ MONETIZATION.md
   ├─ DECISIONS.md
   └─ SESSION.md

Core data entities

Listing

Represents a property listing.

Suggested fields:

* id
* title
* description
* price
* currency
* surface_m2
* price_per_m2
* city
* neighborhood
* address_text
* latitude
* longitude
* property_type
* transaction_type
* bedrooms
* bathrooms
* images
* source_id
* source_url
* source_type
* first_seen_at
* last_seen_at
* reliability_score
* duplicate_group_id
* is_mre_friendly
* created_at
* updated_at

Source

Represents where a listing came from.

Fields:

* id
* name
* type
* url
* is_partner
* is_public
* scraping_allowed_status
* notes
* created_at
* updated_at

Duplicate group

Groups similar listings.

Fields:

* id
* canonical_listing_id
* duplicate_count
* confidence_score
* created_at
* updated_at

Lead

Represents qualified buyer intent.

Fields:

* id
* name
* phone_whatsapp
* email
* budget_min
* budget_max
* city
* neighborhood
* property_type
* purchase_timeline
* is_mre
* country_of_residence
* financing_type
* lead_temperature
* linked_listing_id
* linked_project_id
* linked_promoter_id
* source_channel
* created_at

Promoter

Represents a real-estate developer/promoter.

Fields:

* id
* name
* contact_name
* phone
* email
* website
* verification_status
* package_type
* created_at
* updated_at

Project

Represents a promoter project.

Fields:

* id
* promoter_id
* name
* city
* neighborhood
* property_types
* starting_price
* delivery_date
* brochure_url
* is_expo_linked
* created_at
* updated_at

Reliability scoring V1

Reliability score should be deterministic first.

Avoid AI scoring in V1 unless justified.

Possible scoring signals:

* recent listing update;
* complete price;
* complete surface;
* valid city/neighborhood;
* source type;
* partner source;
* duplicate conflict;
* suspicious price per m²;
* verified promoter/agency;
* contact availability.

Suggested score range:

* 80-100: high reliability
* 50-79: medium reliability
* 0-49: low reliability

Deduplication V1

Start simple.

Compare:

* title similarity;
* price similarity;
* surface similarity;
* city;
* neighborhood;
* images if available;
* source URL;
* phone number if available.

Avoid deleting duplicates automatically at first.

Prefer:

* flag duplicates;
* group duplicates;
* select canonical listing;
* allow admin review later.

Lead scoring V1

Lead temperature:

Hot:

* budget clear;
* city clear;
* purchase timeline under 3 months;
* WhatsApp provided.

Warm:

* budget clear;
* city clear;
* timeline 3 to 6 months.

Cold:

* vague budget;
* vague timeline;
* missing contact quality.

Coding rules

* Keep business logic out of React components.
* Put scoring logic in lib/scoring.
* Put deduplication logic in lib/dedupe.
* Put data source logic in lib/sources.
* Put scraping scripts in scripts/scrapers.
* Put import scripts in scripts/imports.

Testing priorities

Test first:

* normalization;
* deduplication;
* reliability scoring;
* lead scoring;
* search filters.

Future upgrades

Only after MVP validation:

* Typesense/Meilisearch;
* queue system;
* crawler scheduler;
* AI price estimation;
* automated market reports;
* CRM-like promoter dashboard;
* billing/payment system.
