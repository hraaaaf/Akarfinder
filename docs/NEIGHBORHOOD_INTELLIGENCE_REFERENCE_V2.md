# Morocco Neighborhood Intelligence Reference V2 — #19D0

## Principle

The retained national price/lifestyle report is V1 input, not something to rebuild. V2 enriches it while preserving the evidence boundary:

1. `objective_facts` — observable/measurable sourced facts.
2. `analysis` — explicit analytical classifications derived from evidence.
3. `akar_scores` — versioned AkarFinder scores with evidence, confidence and method version.

Unknown is a valid value. Missing evidence must never be converted into a neutral or positive score.

## Standing

Standing is relative to each city's apartment reference:
- Accessible: < 85%
- Cœur de marché: 85–115%
- Premium: >115–150%
- Prestige: >150%

This is an AkarFinder analytical method, not an official zoning or social classification.

## Target national dimensions

### Objective facts
Market prices apartment/villa; official city trend; transaction trend; tram; rail; public transport; schools; healthcare; commerce; green space; beach/coast; road accessibility; walkability evidence; nightlife venue density; new-program presence.

### Analysis
Relative standing; dominant and secondary urban types; morphology/density; development stage; market maturity; residential/business/administrative/tourism/student/industrial/heritage/coastal intensity; rental profile; MRE/expat/student/family/corporate audience signals; development outlook.

### AkarFinder scores (0–10 or null)
Calmness, animation, family fit, nightlife, commerce access, school access, public transport, car accessibility, walkability, greenery, coastal lifestyle, tourism intensity, centrality, long-term rental fit, short-term rental fit, student fit, MRE fit, expat fit, corporate fit, development momentum.

Scores are not raw research outputs. Research supplies evidence; the AkarFinder engine calculates scores through versioned deterministic methods.

## Source hierarchy

1. BAM/ANCFCC/IPAI and public authorities — official trend/objective infrastructure where applicable.
2. Agenz — operational city/neighborhood market reference.
3. Yakeey/CNONM — secondary benchmark/corroboration.
4. OpenStreetMap and official transport/equipment data — objective environment signals after validation.
5. Dakimmo — terrain/large-city operational cross-check.
6. Avito/Mubawab/Sarouty — requested-price dispersion or availability signals only, never official truth.

Each value requires source, date, geographic granularity and confidence.

## National research protocol

For each city and neighborhood:
1. Resolve canonical city/neighborhood name and aliases before enrichment.
2. Search objective facts first; record `unknown` where evidence is absent.
3. Record analytical classification separately with rationale/source refs.
4. Never write an AkarFinder score directly from a generic research judgment.
5. Detect contradictory sources; preserve both and lower confidence instead of silently choosing.
6. Record observation date and source granularity (city/neighborhood/microzone).
7. Output strict structured JSON conforming to Schema V2.
8. Run normalization, duplicate/alias checks and evidence validation before publishing a snapshot.

## Deep Research execution prompt

You are a research system working under a fixed data architecture. Do not redesign the schema and do not infer missing values.

Mission: enrich the AkarFinder Morocco Neighborhood Intelligence Reference V2 for Moroccan cities and neighborhoods. Start from the provided V1 records and enrich them; never replace or silently overwrite a sourced V1 value.

For every neighborhood, return only evidence-backed `objective_facts` and clearly labelled `analysis`. Do not generate `akar_scores`; those are calculated later by AkarFinder.

Mandatory rules:
- Use primary/official sources first for transport, infrastructure, public equipment and official trends.
- Preserve exact source title, publisher, URL, observation/publication date and geographic granularity.
- For each field return value, confidence (`high|medium|low|unknown`), source references and observation date.
- Return `null` with confidence `unknown` when evidence is insufficient.
- Distinguish presence from proximity; never convert city-level evidence into a neighborhood-level fact.
- Do not label neighborhoods with socio-economic stereotypes.
- Do not infer family suitability, safety, walkability, investment quality, MRE suitability or tourism intensity scores. Supply factual evidence only.
- Requested prices from portals are not transaction prices.
- Flag conflicts explicitly.
- Normalize Arabic/French/transliterated neighborhood aliases without merging distinct geographic areas.

Output one machine-readable record per canonical neighborhood using the exact Schema V2 field names, plus a source registry and a conflict log.

## Current V2 coverage status

The retained V1 imports 13 city market references and the significant neighborhoods already documented in the report. Market facts and explicit usage classifications are populated. The national 30–40 dimension enrichment remains evidence-driven research work; unsupported dimensions stay null until researched and validated.
