# AkarFinder — Data Acquisition & Source Governance

Updated: 2026-07-23

The filename `SCRAPING.md` is retained for compatibility. The scope is broader than scraping: it governs every external acquisition and discovery lane.

---

## 1. Principle

AkarFinder should maximize useful Moroccan real-estate coverage without sacrificing:

- legality and source policy;
- provenance;
- freshness;
- data quality;
- deduplication;
- user trust.

No single source or acquisition provider should become a structural dependency for the entire product.

---

## 2. Absolute no-bypass doctrine

Forbidden:

- stealth scraping / anti-bot evasion;
- proxy rotation for restriction circumvention;
- fake Googlebot or identity spoofing;
- CAPTCHA-solving to defeat access controls;
- login/paywall circumvention;
- technical bypass of a source restriction.

Respect applicable:

- robots policy;
- indexing directives;
- contractual/authorization status;
- source-specific display rights;
- opt-out/removal obligations.

When a direct path is blocked or not allowed, use another reviewed acquisition lane rather than bypassing the restriction.

---

## 3. Acquisition lanes

### A. Direct partner / authorized feeds

Preferred structured lane when available.

Supported architecture includes CSV/JSON/XML normalization capability and structured partner submissions.

Benefits:

- explicit rights;
- cleaner identity/provenance;
- richer fields;
- better freshness contracts;
- stronger professional workflows.

A feed still passes canonical validation, normalization, dedupe and publication gates.

### B. First-party / partner submissions

Professional onboarding captures structured declared data with explicit provenance and media/publication rights.

Declared facts cannot masquerade as AkarFinder-calculated, inferred or verified facts.

### C. Public search discovery

OpenSERP/Yandex-style search discovery can identify individual public results/snippets under registry and admission policies.

Search-provider output is evidence from the provider response only.

Do not invent missing listing-page fields.

### D. Search Gateway

Search Gateway provides limited external web results for user discovery.

These remain source-linked external results unless separately admitted under an authorized structured path.

### E. Public sitemap discovery

Only use reviewed domains and source policies.

A sitemap URL is a **seed**, not proof that a current listing should become a structured public AkarFinder property.

### F. Common Crawl URL-index metadata

Common Crawl CDX can be used as an offline/public historical URL discovery reservoir.

Durable boundaries:

- URL-index metadata only in the mass seed lane;
- no WARC/page fetch in that lane;
- no direct source-site request;
- registry-approved domains;
- validated listing URL patterns;
- seed-only persistence before separate confirmation/admission;
- canary-first/fail-soft current architecture.

---

## 4. Source registry is the admission authority

Machine-readable source governance lives primarily in the source registry and associated code/tests.

A source must not be automatically admitted simply because:

- it appears in Google/search results;
- it contains real-estate keywords;
- another aggregator references it;
- it was historically scraped;
- its homepage is accessible.

Automated admission requires an explicit reviewed status and the appropriate source-specific evidence.

Unknown/unclassified sources fail closed for structured automated admission.

---

## 5. URL patterns

Listing URL patterns must be validated using positive and negative real examples.

Avoid patterns broad enough to admit:

- homepages;
- category/search pages;
- profile/login pages;
- general content pages;
- vacation inventory when outside scope;
- meta-aggregator duplicates.

Pattern changes require regression evidence.

---

## 6. Discovery is not publication

Keep these states conceptually separate:

1. discovered URL/result;
2. qualified seed/candidate;
3. confirmed/admitted source offer;
4. normalized structured property representation;
5. publication/display eligibility;
6. ranked public result.

A result can be useful for coverage intelligence without becoming a public structured listing.

---

## 7. Seed doctrine

`source_offer_seeds` is a reservoir of potential offer URLs, not a listing table.

A seed must never gain invented:

- price;
- surface;
- property type;
- contact;
- image;
- availability;
- professional identity.

Seed confirmation paths should remain bounded and conservative.

Current architecture favors exact canonical-URL confirmation and strong explicit listing signals before structured promotion.

Thin indexed search representation is allowed only under its own limited public-result contract and source policy.

---

## 8. Data normalization

All structured lanes should converge toward canonical AkarFinder property/source concepts.

Normalize carefully:

- canonical source URL;
- city/district aliases;
- transaction type;
- property type;
- price/currency/period;
- surface;
- rooms/bedrooms where explicit;
- source/provenance;
- first/last observation clocks.

Missing data stays null/unknown.

Never coerce missing price to zero.

---

## 9. PII and unsafe content

External discovery/admission paths must minimize unnecessary PII.

Do not persist or expose personal contact information from external/public sources unless a lawful, explicit product contract authorizes it.

Reject/clean unsafe URLs and secret-like/PII payloads under the canonical ingestion policies.

External indexed results should redirect users to the original source for source-controlled contact flows.

---

## 10. Freshness and availability

Observation recency is not guaranteed availability.

Track evidence such as:

- first seen;
- last seen;
- source update when available;
- observation channel;
- lifecycle status.

Do not say `available now` because a URL was recently indexed.

Stale volume must not inflate useful-coverage claims.

---

## 11. Deduplication

Preserve all source offers and provenance while building a conservative Property Graph.

Technical URL/idempotency dedupe is different from physical-property identity.

Never auto-merge physical properties solely from loose textual similarity.

Use explicit identifiers or sufficiently corroborated structured evidence, with human review when needed.

---

## 12. Display rights

Source status, display eligibility and intelligence scoring are separate.

For an external source, independently determine whether AkarFinder may show:

- title/snippet;
- price/surface facts;
- thumbnail;
- gallery;
- contact/WhatsApp;
- internal detail;
- only a source link;
- nothing publicly.

A high score never grants additional rights.

---

## 13. Scale strategy

AkarFinder can pursue 100k+ useful observations through multiple lanes, but every scale lane must remain:

- bounded;
- observable;
- idempotent;
- source-governed;
- measurable by yield;
- fail-safe on writes;
- honest about what its count represents.

Measure the funnel per acquisition lane instead of celebrating raw URLs.

---

## 14. Current workflow caution

Cadences, engines and batch limits evolve.

Do not copy an old number such as `30 minutes`, `2,718 queries` or `13 domains` from a historical mission document and treat it as permanent architecture.

For current operational truth inspect:

- `.github/workflows/`;
- `data/openserp/source-domain-registry.json`;
- current query-universe code/data;
- acquisition modules/tests;
- Production flags and metrics.

---

## 15. Audit evidence

One-off source audits, harvest reports, incident analyses and benchmarks belong in:

- `data/audits/`;
- pull requests;
- Git history.

Only durable policies belong in this document.