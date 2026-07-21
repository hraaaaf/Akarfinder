# Property Detail V2 — Public Contract

Status: mission #19.

## Purpose

Property Detail V2 is the structured public read-model for an authorized AkarFinder property page. It consumes the canonical property/intelligence foundations already delivered in #11–#18 and renders only information that can be supported by the current data model.

## Eligibility

A full internal `/listings/[id]` detail page is allowed only for `first_party` or `partner_authorized` sources.

External web results, persisted OpenSERP rows, third-party legacy rows and benchmark-only sources must never be upgraded into a full AkarFinder property detail page.

A missing structured DB row returns 404. There is no fallback to mock listings.

## Public structure

The V2 page contains, when data is available:

1. Hero / permitted media
2. Price and essential characteristics
3. Conclusion AkarFinder
4. Personalized-fit placeholder with an explicit `not calculated` state until #19D/#19E
5. Market position only when Market Intelligence has an evaluable result
6. Source description
7. Detailed characteristics
8. Environment using factual location data only
9. Costs/investment with explicit `not provided` state when absent
10. Real history only
11. Multi-source signal only when supported
12. Public attention/anomaly summary without internal engine fields
13. Provenance
14. Professional/source information without inventing a professional profile
15. Authorized user actions

## Integrity rules

- Missing means `Non renseigné`, never synthetic filler.
- No mock listing fallback.
- No heuristic neighborhood amenities, travel times or generic neighborhood prose presented as property facts.
- No synthetic former price or price-history event.
- No false documentary verification.
- No personalized Fit Score until a real SearchProfile + Property Fit Engine exist (#19D/#19E).
- No commercial badge may be interpreted as relevance.
- AkarScore, completeness and future Fit Score remain distinct concepts.
- Raw internal intelligence fields remain private, including anomaly scores, duplicate scores, raw benchmark math, evidence refs and linkage internals.

## Provenance display

The public read-model distinguishes:

- `declared`: source/partner-provided structured fact;
- `calculated`: deterministic AkarFinder calculation (for example price/m²);
- `inferred`: only when explicitly marked as such;
- `verified_document`: only when documentary evidence exists.

The current V2 implementation never fabricates a `verified_document` claim. If no documentary evidence is exposed by the underlying model, the page states that no documentary verification is displayable.

## Deferred layers

The following are deliberately not implemented by #19 and remain separate roadmap missions:

- #19B professional auth, ownership and profiles;
- #19C partner commercial activation;
- #19D dynamic SearchProfile engine;
- #19E personalized Property Fit and ranking;
- #19F Companion state machine;
- #19G homepage/search-entry orchestration;
- #19H user continuity.

Property Detail V2 must be ready to consume these layers later without pretending they already exist.
