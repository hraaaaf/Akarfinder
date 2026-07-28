# A3 — AKARFINDER PRICE ATLAS

**Status:** CERTIFIED_FOR_A4
**Scope:** audit-only; no product code modification
**Dependencies:** A2 Geo Intelligence certified at 9.51/10

## 1. Executive verdict

The Price Atlas must become AkarFinder's public market-reference layer, but only where the observed data supports publication. It must never blur asking prices with transaction prices, national comparisons with intra-city comparisons, or raw listing volume with deduplicated property observations.

The product should launch progressively: national city coverage first, certified city/neighborhood distributions second, history and advanced intelligence only after sufficient longitudinal data.

## 2. Data truth contract

Every published statistic must expose or make accessible:

- metric definition;
- asking-price status;
- transaction and property type;
- canonical geography;
- period and last refresh;
- raw representation count;
- deduplicated property count;
- median;
- P25/P75 or equivalent dispersion;
- confidence tier;
- exclusion rules;
- source/provenance class.

No single-value benchmark may appear without context.

## 3. Statistical policy

Primary metric: median asking price per m².

Secondary metrics:

- median total asking price;
- P25/P75 range;
- observation volume;
- surface distribution;
- freshness distribution;
- property-type share.

Rules:

1. Deduplicate before aggregation.
2. Separate sale and rent.
3. Separate property types unless explicitly viewing a mixed market.
4. Winsorization or outlier exclusion must be documented and reproducible.
5. Suppress cells under the publication threshold.
6. Show confidence as a multifactor contract, not a subjective badge.
7. Never infer transaction prices from asking prices.

Suggested initial thresholds, subject to empirical calibration:

- `N_property < 10`: no price publication;
- `10–29`: indicative range, low confidence;
- `30–99`: median + dispersion, medium confidence;
- `>=100`: high confidence only if freshness and source diversity also pass.

## 4. Atlas modes

### National mode

Purpose: compare cities against a national distribution for the same transaction/property type and period.

Visible:

- city medians;
- percentile rank;
- deduplicated sample;
- confidence;
- coverage/freshness.

### City mode

Purpose: compare certified neighborhoods within one city. Color scale is recalibrated locally and explicitly labelled.

### Area detail

- median and P25/P75;
- histogram or density distribution;
- observation composition;
- freshness;
- comparable areas;
- methodology disclosure;
- link into Search with identical filters.

### Compare mode

Up to four comparable geographies. Comparison is blocked or warned when period, transaction, property type or confidence are incompatible.

## 5. Core user journeys

1. Explore Morocco → select city → inspect distribution → open matching Search.
2. Start with a budget → reveal cities/areas where observed listings fit the budget and target surface.
3. Compare cities or neighborhoods under identical filters.
4. Inspect one area’s Market DNA without treating it as a valuation of a specific property.
5. Share a URL containing geography, metric, period and filters.

## 6. Budget inverse

Inputs:

- budget in MAD;
- transaction;
- property type;
- target surface or household need;
- optional city constraint.

Output:

- areas where the observed distribution intersects the budget;
- expected observed surface range;
- sample and confidence;
- explicit disclaimer that this is market exploration, not financing or valuation advice.

## 7. Visualization system

- Choropleth only for certified polygons.
- H3 or grid cells labelled as analytical cells, never neighborhoods.
- Histogram preferred over a decorative line chart for current distributions.
- Time series only when longitudinal continuity and sample thresholds pass.
- Percentile marker explains relative position.
- Color is paired with labels, patterns or symbols.
- National and city scales use visibly distinct legends.

## 8. API contracts

### `/api/atlas/summary`

Returns national/city aggregates by transaction, property type and period.

### `/api/atlas/distribution`

Returns bins, percentiles, sample counts, exclusions and confidence.

### `/api/atlas/timeseries`

Returns periodized values only when continuity gate passes.

### `/api/atlas/compare`

Returns normalized, compatibility-checked metrics.

Every response includes methodology version and generated-at timestamp.

## 9. Performance budgets

- Atlas shell interactive p75 < 2.5 s on mid-range mobile.
- Cached aggregate response p75 < 500 ms.
- Filter-to-chart update p75 < 300 ms after response.
- Initial chart bundle target < 90 kB gzip incremental.
- No more than one heavy visualization library loaded eagerly.
- Tables remain available without canvas/WebGL.

## 10. Accessibility

- Keyboard-operable chart focus model.
- Text/table equivalent for every chart.
- Screen-reader summary of median, range, sample and confidence.
- Color-blind-safe scales.
- RTL-compatible legends and tooltips.
- Reduced-motion transitions.

## 11. Roadmap

### PA-0 — Statistical foundation

Aggregation schema, methodology version, thresholds, confidence and tests.

### PA-1 — National Atlas

City cards, national map, filters, distribution and Search handoff.

### PA-2 — Certified city detail

Neighborhood/cell views, area detail and compare.

### PA-3 — Budget inverse

Affordability exploration and saved views.

### PA-4 — History

Time series only for certified continuous cohorts.

### PA-5 — Advanced intelligence

Anomaly and opportunity explanations, never opaque scores.

## 12. Backlog

| ID | Task | Priority | Effort |
|---|---|---:|---:|
| ATLAS-01 | Aggregate contract and methodology version | P0 | XL |
| ATLAS-02 | Publication/confidence gates | P0 | L |
| ATLAS-03 | National city summary | P0 | L |
| ATLAS-04 | Distribution endpoint and histogram | P0 | L |
| ATLAS-05 | National/local scale legends | P0 | M |
| ATLAS-06 | Compare compatibility engine | P1 | M |
| ATLAS-07 | Budget inverse | P1 | L |
| ATLAS-08 | Search handoff and URL state | P0 | M |
| ATLAS-09 | Accessible table alternatives | P0 | M |
| ATLAS-10 | Longitudinal continuity gate | P1 | L |

## 13. Reviewer — cycle 1

**Initial score: 8.76/10 — FAIL**

Critical findings:

1. Initial concept permitted trends from changing listing cohorts.
2. Confidence thresholds relied too heavily on sample size.

Major findings:

- asking-price label was not persistent enough;
- national/local color recalibration could be misread;
- raw and deduplicated counts were not both exposed;
- compare mode lacked compatibility blocking;
- budget inverse risked sounding like affordability advice;
- charts lacked guaranteed table equivalents.

## 14. Corrections

- Added longitudinal continuity gate and methodology versioning.
- Made confidence multifactorial: sample, freshness, source diversity, dispersion and geo certainty.
- Persistently qualified all prices as observed asking prices.
- Added distinct national/local legends and scale-change warning.
- Added raw and deduplicated counts.
- Added comparison compatibility engine.
- Reframed budget inverse as exploration, not financial advice.
- Added mandatory text/table equivalents.

## 15. Final scoring

| Criterion | Score /10 |
|---|---:|
| Product doctrine | 9.8 |
| Statistical integrity | 9.8 |
| Geo integration | 9.6 |
| Data architecture | 9.7 |
| Visualization UX | 9.5 |
| Progressive feasibility | 9.7 |
| Accessibility | 9.4 |
| Performance | 9.3 |
| Risk handling | 9.8 |
| Execution readiness | 9.5 |

**Final score: 9.61/10**

Critical findings open: 0  
Major findings open: 0

## 16. Certification

```text
A3 PRICE ATLAS
Cycles of correction: 2
Initial score: 8.76/10
Final score: 9.61/10
Verdict: CERTIFIED_FOR_A4
```
