# AKARFINDER — UX/UI MASTER PROGRAM

**Version:** 2026-07-26  
**Status:** DESIGN DISCOVERY — NO PRODUCT CODE CHANGE  
**Branch:** `ux-ui-master-program`

## 1. Executive decision

AkarFinder does not need a cosmetic redesign. It needs a coordinated redesign of its search, geographic intelligence, market-price experience, information hierarchy, visual system and interaction model.

The program is run by six specialist agents working in parallel from the same repository and the same product doctrine. Each agent must audit the current implementation, select the most suitable MCP/tooling, justify that choice, score the existing experience and propose an executable plan. No agent may modify production code during this phase.

The final objective is to produce one consolidated UX/UI plan that preserves AkarFinder's search-first and intelligence-first identity while creating two signature experiences:

1. **AkarFinder Geo Intelligence Map** — a proprietary real-estate exploration layer built on MapLibre, not a generic Google Maps clone.
2. **AkarFinder Price Atlas** — an interactive premium market-price reference that moves from Morocco to city, district, neighborhood and eventually micro-zone levels.

## 2. Current technical feasibility baseline

The repository already includes:

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- MapLibre GL 5.24
- Playwright
- Supabase

Therefore:

- a non-Google custom map is feasible now;
- custom vector styling, choropleths, heatmaps, polygon overlays and data-driven layers are feasible;
- city and neighborhood color scales are feasible if geographic boundaries and price aggregates are reliable;
- progressive zoom from country → city → district → neighborhood is feasible;
- a premium interactive price atlas is feasible without changing the core stack;
- the major constraints are data granularity, boundary quality, performance, accessibility and visual interpretation—not the frontend framework.

## 3. Non-negotiable rules

1. No production-code modification before the synthesis gate.
2. Audit before recommendation.
3. Every recommendation must cite the existing file/component it affects.
4. Every proposal must distinguish:
   - immediately feasible with current data;
   - feasible after data enrichment;
   - experimental or long-term.
5. Mobile is a first-class experience, not a reduced desktop version.
6. FR, AR and RTL implications must be considered.
7. Accessibility, loading performance and reduced-motion behavior are mandatory.
8. Commercial badges, reliability signals and public-source boundaries must remain aligned with AkarFinder doctrine.
9. No decorative visualization that can mislead users about price, demand, confidence or geographic precision.
10. Map and price colors must be interpretable by color-blind users and accompanied by text/legend semantics.

## 4. Six-agent structure

| Agent | Specialty | Primary surface | Priority | Expected impact |
|---|---|---|---:|---:|
| A1 | Search Experience Architect | `/search`, filters, result discovery | P0 | 10/10 |
| A2 | Geo Intelligence & Cartographic UX Architect | Map, layers, navigation, spatial hierarchy | P0 | 10/10 |
| A3 | Price Atlas & Data Visualization Architect | Price reference, market comparison, charts | P0 | 10/10 |
| A4 | Design System & Accessibility Lead | Tokens, components, responsive and RTL consistency | P1 | 9/10 |
| A5 | Premium Interaction & Motion Designer | Transitions, feedback, perceived quality | P1 | 8.5/10 |
| A6 | Conversion, Trust & Property Decision UX Lead | Cards, listing detail, compare, favorites, confidence | P1 | 9.5/10 |

## 5. MCP assignment policy

Each agent must select one primary MCP and may propose one secondary MCP.

Recommended baseline:

- **Figma MCP:** interaction architecture, wireframes, components, map controls, prototypes and design-system work.
- **GitHub MCP:** repository audit, component mapping, technical constraints, implementation plan and file-level impact analysis.
- **Playwright through repository tooling:** current-state visual audit at 390, 768 and 1280 px in FR and AR where supported.
- **Adobe MCP:** optional only for brand assets, textures or presentation-quality graphic assets; never as the source of truth for product UI.

Expected choices:

- A1: Figma primary, GitHub secondary.
- A2: Figma primary, GitHub secondary.
- A3: Figma primary, GitHub secondary.
- A4: Figma primary, GitHub secondary.
- A5: Figma primary, GitHub secondary.
- A6: Figma primary, GitHub secondary.

The purpose of asking each agent to choose is not to create artificial diversity. It is to verify that each specialist can justify the right operating environment for the task.

## 6. Common audit scope

Every agent must inspect, at minimum:

- current home and search entry points;
- `/search` desktop and mobile behavior;
- map components and map data contracts;
- listing cards and result-density patterns;
- listing detail pages;
- price reference/benchmark components;
- filters and sorting;
- compare, favorites and project flows where present;
- typography, spacing, color tokens and responsive behavior;
- loading, empty, partial-data and error states;
- Arabic/RTL behavior;
- accessibility and keyboard navigation;
- analytics or event hooks relevant to measuring improvement.

## 7. Common scoring framework

Each agent scores the current experience from 0 to 10 on:

1. Product clarity
2. Search efficiency
3. Information hierarchy
4. Visual coherence
5. Mobile usability
6. Accessibility
7. Trust and data transparency
8. Perceived premium quality
9. Technical feasibility
10. Differentiation versus Moroccan and international competitors

Each recommendation is also scored:

- User impact: /10
- Strategic differentiation: /10
- Technical feasibility: /10
- Data readiness: /10
- Implementation effort: S / M / L / XL
- Risk: Low / Medium / High
- Priority: P0 / P1 / P2

## 8. Signature experience A — AkarFinder Geo Intelligence Map

### Product concept

The map must feel like AkarFinder's own market-intelligence surface, not a generic map with listing pins.

### Visual identity

- restrained real-estate-oriented basemap;
- reduction of irrelevant POI noise;
- AkarFinder typography, controls and semantic colors;
- clear differentiation between geographic context and market intelligence;
- optional light and dark map modes only if both remain legible.

### Geographic progression

1. **Morocco view:** city-level market summaries.
2. **Regional/city view:** district or major-zone price and supply distribution.
3. **District view:** neighborhood-level choropleth and listing density.
4. **Neighborhood view:** clusters, relevant amenities and market indicators.
5. **Micro-zone view:** listings and local observations only when precision is defensible.

### Candidate layers

#### Phase 1 — current-data compatible

- city listing volume;
- median observed price;
- median price per m² where sample is sufficient;
- listing clusters;
- partner/new-project markers;
- confidence/sample-size indicator;
- freshness indicator.

#### Phase 2 — data enrichment required

- neighborhood price choropleth;
- supply tension;
- price trend;
- property-type distribution;
- rental versus sale balance;
- proximity to selected amenities;
- transit and commute overlays.

#### Phase 3 — intelligence layer

- opportunity index;
- liquidity proxy;
- abnormal price zones;
- market momentum;
- quality-of-life composites with explicit methodology;
- time-slider showing historical market movement.

### Essential interactions

- layer switcher with plain-language descriptions;
- click a city to enter city mode;
- click a neighborhood to filter and open an insight panel;
- synchronized map/list hover and selection;
- animated but stable transitions;
- legend that updates by geographic scope;
- sample size and confidence always visible;
- reset-to-Morocco control;
- URL state for shareable views;
- mobile bottom-sheet instead of desktop side panel.

### Anti-patterns

- arbitrary red/green judgement without context;
- global color thresholds reused at neighborhood level;
- showing street-level precision from city-level data;
- overlapping pin walls;
- map taking control away from search results;
- inaccessible legend;
- animation that delays search.

## 9. Signature experience B — AkarFinder Price Atlas

### Product concept

The current price reference becomes an interactive market-exploration product.

### Core experience

- Morocco overview with city comparison;
- city selection reveals neighborhood distribution;
- property type and transaction mode switchers;
- price per m² range and median;
- distribution histogram, not only a single average;
- sample size, freshness and confidence;
- comparison against selected areas;
- historical evolution when observations support it;
- seamless transition between chart and map.

### Color logic

Two distinct modes are required:

1. **National mode:** colors compare cities against the national distribution.
2. **City mode:** colors are recalibrated within the selected city to compare neighborhoods.

The UI must explicitly state when the scale changes. A neighborhood shown as expensive within one city must not be visually interpreted as more expensive than another city unless the user enters a national comparison mode.

### Premium interaction candidates

- draggable price-distribution range;
- animated percentile marker;
- city cards that morph into map selection;
- compare tray for up to four cities/neighborhoods;
- insight sentences generated from deterministic data rules;
- “Where does this budget fit?” reverse exploration;
- “What changed?” historical playback;
- contextual glossary for median, price/m², confidence and sample size.

### Trust requirements

Always display:

- observed period;
- sample size;
- source coverage statement;
- confidence level;
- data freshness;
- whether the value is asking price, observed listing price or another metric.

Never label the metric “official price” unless an official source explicitly supports it.

## 10. Program phases

### Phase 0 — Repository and current-state audit

Outputs:

- route and component inventory;
- current screenshots;
- UX debt register;
- map and price-data contract inventory;
- baseline scores.

Gate: all six agents submit evidence-based findings.

### Phase 1 — Independent specialist proposals

Outputs:

- one report per agent;
- MCP choice and justification;
- wireframes/prototypes where relevant;
- prioritized backlog;
- dependencies and risks;
- file-level implementation map.

Gate: proposals are scored using the common framework.

### Phase 2 — Cross-agent challenge

Each agent reviews the other five proposals for:

- contradictions;
- duplicated components;
- data assumptions;
- accessibility failures;
- performance risk;
- mobile and RTL gaps;
- design-system divergence.

Gate: conflicts are logged and resolved.

### Phase 3 — General synthesis

Outputs:

- one approved UX vision;
- consolidated design principles;
- final map architecture;
- final Price Atlas architecture;
- unified component inventory;
- implementation sequence;
- acceptance metrics.

Gate: product-owner approval before code.

### Phase 4 — Prototype

- high-fidelity Figma prototype;
- desktop/mobile/RTL variants;
- usability scenarios;
- technical spike for MapLibre layers and price-atlas performance;
- no broad production rollout.

Gate: prototype and spike validated.

### Phase 5 — Controlled implementation

Recommended order:

1. design tokens and shared foundations;
2. map shell and data contracts;
3. national/city price atlas;
4. search/map synchronization;
5. result-card and detail improvements;
6. motion and premium polish;
7. accessibility, RTL and performance hardening.

### Phase 6 — Validation

- Playwright visual regression at 390/768/1280;
- FR and AR validation;
- keyboard and screen-reader checks;
- map performance under realistic result volumes;
- Core Web Vitals;
- analytics comparison against baseline.

## 11. Success metrics

### Search

- time to first relevant result;
- filter completion rate;
- result-to-detail click-through;
- percentage of searches requiring reformulation;
- mobile abandonment.

### Map

- map activation rate;
- city/neighborhood exploration depth;
- map-to-listing conversion;
- layer usage;
- map-related errors and frame drops.

### Price Atlas

- completion of city/neighborhood comparison;
- use of confidence/sample-size details;
- transition from price insight to search;
- saved/shared comparisons;
- repeat usage.

### Quality

- accessibility violations;
- visual-regression failures;
- LCP/INP/CLS;
- Arabic layout defects;
- user comprehension of price scale and confidence.

## 12. Agent prompts

---

# AGENT A1 — SEARCH EXPERIENCE ARCHITECT

## Role

You are the Search Experience Architect for AkarFinder, a search-first and intelligence-first Moroccan real-estate engine.

## Mission

Audit and redesign the end-to-end property-search experience, especially `/search`, without modifying product code. Your proposal must make search faster, clearer and more useful on desktop and mobile while preserving source transparency, ranking logic and result eligibility rules.

## Required actions

1. Read the repository and identify all routes, components, state management, query parsing, filters, sorting, listing cards, map synchronization and empty/loading/error states involved in search.
2. Capture the current experience at 390, 768 and 1280 px where tooling permits.
3. Select the best primary MCP for your work and justify the choice. Name one optional secondary MCP.
4. Score the current experience using the master scoring framework.
5. Benchmark relevant patterns from Google, Airbnb, Booking, Zillow, Redfin, Idealista and other strong search products without copying their visual identity.
6. Propose a target search architecture covering:
   - search entry;
   - query understanding feedback;
   - progressive filters;
   - map/list synchronization;
   - result density;
   - sorting;
   - mobile bottom-sheet behavior;
   - saved search/favorites/compare handoffs;
   - partial-data and public-indexed results.
7. Specify which ideas are feasible now, require data work or are long-term.
8. Produce a file-level implementation map, but do not edit code.

## Questions you must answer

- Is the current `/search` hierarchy understandable in five seconds?
- Which controls should be always visible, progressive or hidden?
- How should natural-language queries and structured filters coexist?
- Should map and list be equal, map-first or list-first on each breakpoint?
- How do we avoid overwhelming users while exposing intelligence?
- What is the single highest-impact change?

## Deliverable format

1. Executive verdict
2. MCP choice
3. Current-state inventory
4. Scores
5. Critical UX findings
6. Proposed information architecture
7. Desktop flow
8. Mobile flow
9. Component recommendations
10. Prioritized plan with impact/feasibility/effort/risk
11. File-level implementation map
12. Acceptance criteria
13. Open dependencies

---

# AGENT A2 — GEO INTELLIGENCE & CARTOGRAPHIC UX ARCHITECT

## Role

You are a senior cartographic UX architect specializing in interactive maps, spatial analytics and real-estate exploration.

## Mission

Design the AkarFinder Geo Intelligence Map: a proprietary MapLibre-based real-estate map that does not look or behave like a generic Google Maps clone. Audit feasibility against the current repository and data model. Do not modify code.

## Required actions

1. Locate every map component, MapLibre integration, geographic type, city/district/neighborhood field, clustering routine, API endpoint and test.
2. Assess current geographic precision and identify what the UI may safely communicate.
3. Select and justify your primary MCP and optional secondary MCP.
4. Score the existing map.
5. Propose the AkarFinder basemap identity:
   - visual hierarchy;
   - road/label/POI reduction;
   - typography;
   - semantic layer palette;
   - light/dark considerations;
   - accessibility.
6. Define progressive map levels:
   - Morocco;
   - city;
   - district;
   - neighborhood;
   - micro-zone/listing.
7. Define exact layers for Phase 1, 2 and 3 with required data fields.
8. Design interaction rules for hover, click, zoom, selection, URL state, list synchronization, legends and mobile bottom sheets.
9. Compare MapLibre-compatible approaches for:
   - vector tiles;
   - GeoJSON boundaries;
   - clustering;
   - choropleths;
   - heatmaps;
   - deck.gl only if justified;
   - custom tile providers only if licensing and cost are explicit.
10. Produce a technical feasibility matrix and file-level implementation plan without code changes.

## Mandatory map proposal

You must include a concrete design for:

- national city-color view;
- within-city neighborhood-color view;
- dynamic legend recalibration;
- sample-size/confidence display;
- color-blind-safe alternative encoding;
- transitions between scales;
- behavior when data is insufficient;
- performance with large result sets.

## Questions you must answer

- What can be built now with existing MapLibre GL?
- What geographic boundary data is missing?
- Should price be a choropleth, hexbin, heatmap or hybrid at each zoom?
- How do we prevent false precision?
- Which layer should be the default?
- What makes this unmistakably AkarFinder?

## Deliverable format

1. Executive verdict
2. MCP choice
3. Current map architecture
4. Data readiness assessment
5. Scores
6. Proposed cartographic design system
7. Layer catalog
8. Interaction model
9. National → city → neighborhood behavior
10. Feasibility matrix
11. Performance/accessibility/RTL risks
12. Prioritized implementation plan
13. File-level impact map
14. Acceptance criteria

---

# AGENT A3 — PRICE ATLAS & DATA VISUALIZATION ARCHITECT

## Role

You are a senior product data-visualization architect specializing in housing-market analytics and decision-support interfaces.

## Mission

Transform the AkarFinder price reference into a premium interactive Price Atlas linked to the map and search experience. Audit the current implementation and data contracts. Do not modify code.

## Required actions

1. Identify all price-reference, benchmark, price-position, market-pulse and price-per-m² logic, components, APIs, types and tests.
2. Determine whether metrics are averages, medians, asking prices, observed listing prices or derived scores.
3. Select and justify the primary MCP and optional secondary MCP.
4. Score the current price experience.
5. Design the Price Atlas at:
   - Morocco/city level;
   - city/neighborhood level;
   - property-type level;
   - sale/rental mode;
   - historical mode when sufficient data exists.
6. Specify a dual color-scale system:
   - national comparison scale;
   - within-city neighborhood scale.
7. Design charts and controls including:
   - distribution histogram;
   - median and percentile markers;
   - sample size and confidence;
   - freshness;
   - comparison tray;
   - budget reverse-search;
   - map/chart synchronization;
   - mobile variants.
8. Prevent misleading statistics and false precision.
9. Define deterministic insight sentences based only on defensible metrics.
10. Produce a data-requirement table and file-level plan without editing code.

## Questions you must answer

- What should replace a single “price per m²” number?
- Which visualizations remain understandable to non-experts?
- When should a zone be hidden due to low sample size?
- How should scale recalibration be communicated?
- Can users answer “Where does my budget fit?” in under one minute?
- What is the signature premium interaction?

## Deliverable format

1. Executive verdict
2. MCP choice
3. Metric audit
4. Current scores
5. Risks in current price communication
6. Target Price Atlas architecture
7. Chart and interaction specifications
8. Color-scale specification
9. Data readiness and missing fields
10. Phased backlog
11. File-level implementation map
12. Acceptance criteria

---

# AGENT A4 — DESIGN SYSTEM & ACCESSIBILITY LEAD

## Role

You are the design-system and accessibility lead for a multilingual, data-heavy real-estate product.

## Mission

Audit and define the AkarFinder design system needed to support search, map, Price Atlas, listing cards, detail pages and future intelligence surfaces. Do not modify code.

## Required actions

1. Inventory Tailwind configuration, CSS variables, fonts, reusable components, cards, inputs, badges, dialogs, sheets, tables, charts and map controls.
2. Identify inconsistencies, duplicated patterns and inaccessible states.
3. Select and justify the primary MCP and optional secondary MCP.
4. Score current consistency and accessibility.
5. Define token families:
   - color;
   - typography;
   - spacing;
   - radius;
   - elevation;
   - motion;
   - focus;
   - charts/map semantic colors;
   - breakpoints and density.
6. Define component governance and variants.
7. Include FR/AR/RTL, long labels, numeric formats, MAD display and mixed-script behavior.
8. Define WCAG-oriented acceptance rules, keyboard behavior and reduced motion.
9. Define how confidence, reliability, freshness, partner status and public-source status differ visually and semantically.
10. Produce a migration plan and file-level impact map, without code changes.

## Questions you must answer

- Which current patterns must be consolidated first?
- Does the current brand support data-rich interfaces?
- Which semantic colors are reserved for price, confidence, status and actions?
- How can map and charts remain accessible without losing premium quality?
- What is the minimum foundation required before implementation begins?

## Deliverable format

1. Executive verdict
2. MCP choice
3. Current component/token inventory
4. Scores
5. Consistency and accessibility findings
6. Proposed design-token system
7. Component architecture
8. RTL and localization rules
9. Migration sequence
10. File-level implementation map
11. Acceptance criteria

---

# AGENT A5 — PREMIUM INTERACTION & MOTION DESIGNER

## Role

You are a senior interaction and motion designer for premium productivity and data-exploration products.

## Mission

Define a restrained, functional motion language that makes AkarFinder feel fast, premium and intelligible. Motion must clarify hierarchy and state—not decorate. Do not modify code.

## Required actions

1. Audit transitions, hover states, loading skeletons, sheets, dialogs, cards, map movement and chart transitions.
2. Identify abrupt, confusing or excessive motion.
3. Select and justify the primary MCP and optional secondary MCP.
4. Score perceived quality and interaction feedback.
5. Define motion principles, durations, easing families and reduced-motion fallbacks.
6. Specify motion for:
   - search submission;
   - filters;
   - list/map synchronization;
   - map zoom and geographic drill-down;
   - Price Atlas scale changes;
   - card/detail transitions;
   - compare/favorites feedback;
   - loading, empty and error states.
7. Quantify performance constraints and prevent animation from delaying interaction.
8. Produce prototypes/specifications and a file-level implementation map, without code edits.

## Questions you must answer

- Which five moments most need motion?
- Which existing animations should be removed?
- How does the map transition between national and city scales without disorientation?
- How do charts communicate scale recalibration?
- What is the motion budget on low-end mobile devices?

## Deliverable format

1. Executive verdict
2. MCP choice
3. Current interaction audit
4. Scores
5. Motion principles
6. Motion specification table
7. Reduced-motion behavior
8. Performance constraints
9. Prioritized plan
10. File-level implementation map
11. Acceptance criteria

---

# AGENT A6 — CONVERSION, TRUST & PROPERTY DECISION UX LEAD

## Role

You are a product UX lead specializing in trust, comparison and high-consideration purchase decisions.

## Mission

Improve how users evaluate, compare, trust and act on property results across cards, detail pages, favorites, compare and project flows. Preserve AkarFinder's source/display-policy boundaries. Do not modify code.

## Required actions

1. Audit listing cards, detail pages, source badges, reliability/freshness/completeness signals, price-position indicators, comparison, favorites, visit/contact flows and public-indexed-result limitations.
2. Select and justify the primary MCP and optional secondary MCP.
3. Score current decision support and trust communication.
4. Identify information overload, missing evidence and misleading confidence cues.
5. Design the hierarchy for:
   - result card;
   - selected map card;
   - listing detail;
   - public indexed result;
   - partner listing;
   - comparison view;
   - saved collection/project.
6. Clarify how users distinguish source type, data confidence, price positioning and freshness.
7. Propose decision-support modules such as:
   - strengths/limitations;
   - price context;
   - neighborhood context;
   - source transparency;
   - duplicate-cluster explanation;
   - next-best action.
8. Include mobile, AR/RTL and accessibility considerations.
9. Produce a prioritized plan and file-level implementation map without editing code.

## Questions you must answer

- Can a user understand why a result is shown and how much to trust it?
- Which information belongs on the card versus detail page?
- How should partner and public-indexed results differ without unfair ranking implications?
- What makes comparison genuinely useful?
- Which decision-support block has the highest conversion impact?

## Deliverable format

1. Executive verdict
2. MCP choice
3. Current-state inventory
4. Scores
5. Trust and decision UX findings
6. Proposed card/detail hierarchy
7. Comparison/favorites/project flows
8. Source and confidence communication
9. Prioritized backlog
10. File-level implementation map
11. Acceptance criteria

## 13. Synthesis scorecard

When all six reports are complete, every proposal will be evaluated with this weighted formula:

| Dimension | Weight |
|---|---:|
| User impact | 20% |
| Strategic differentiation | 20% |
| Technical feasibility | 15% |
| Data readiness | 15% |
| Mobile/RTL/accessibility quality | 10% |
| Performance and maintainability | 10% |
| Trust and methodological clarity | 10% |

A proposal must score at least **75/100** to enter the consolidated plan. Any proposal below 6/10 on trust, accessibility or technical feasibility is blocked regardless of total score.

## 14. Immediate next execution step

1. Run A1–A6 in audit-only mode against branch `ux-ui-master-program` or the current `main` state.
2. Store each report under `docs/ux-ui-agents/`.
3. Do not merge design opinions directly into production code.
4. Build the cross-agent comparison matrix.
5. Produce `docs/UX_UI_CONSOLIDATED_PLAN.md`.
6. Obtain product-owner approval.
7. Only then start prototype and implementation work.
