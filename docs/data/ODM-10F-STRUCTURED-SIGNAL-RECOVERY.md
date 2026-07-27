# ODM-10F — Structured Signal Recovery

## Objective

Recover explicit economics already present in stored public-index result metadata. No source page is fetched and no missing value is guessed.

## Evidence source

`source_offer_seeds.metadata.serper_search.title` and `snippet`, observed during the existing public-index acquisition lane.

## Rules

- price requires exactly one plausible MAD/DH candidate in the title, otherwise exactly one in the snippet;
- surface requires exactly one plausible m² candidate in the title, otherwise exactly one in the snippet;
- conflicting candidates are rejected;
- accepted price range: 500–1,000,000,000 MAD;
- accepted surface range: 9–100,000 m²;
- price/m² is computed only when both price and surface are present;
- ranking and display eligibility are not modified.

## Production result

Run: `production-v2`

- real-estate rows evaluated: 33,360
- metadata candidates: 1,413
- prices recovered: 152
- surfaces recovered: 36
- newly comparable rows: 121
- comparable rows total: 717
- ambiguous prices rejected: 22
- ambiguous surfaces rejected: 44
- ranking rows changed: 0

## Initial zero run

`production-v1` correctly wrote no enrichment because it scoped candidates to C/D, while the stored Serper metadata was already attached to A/B representations. The corrected migration expands only the evidence-bearing scope; it does not weaken extraction rules.
