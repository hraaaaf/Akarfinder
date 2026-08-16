# C8D — Agenz surface recovery gate

## Goal

Recover only page-scoped, defensible surface evidence from the already bounded Agenz × Diour Jamaa detail cohort, without any production write.

## Accepted evidence

1. existing high-confidence JSON-LD `floorSize`, or
2. a single consistent `m²` value exposed by page-scoped title metadata (`og:title`, `twitter:title`, or `<title>`).

Whole-body regex extraction remains forbidden because similar-listing cards can contain unrelated surface values.

## Fail-closed rules

- conflicting title-metadata surface values => reject;
- multiple surface values in one title => reject;
- hectare labels => reject;
- values below 8 m² or above 100,000 m² => reject;
- no DB write path is added;
- no public price/m² metric is authorized by this change.

## Success criterion

Contract tests and TypeScript pass, then the existing bounded manual live dry-run is re-executed on `main` with `diour-jamaa`, limit `9`. Only the live artifact can establish the recovered-surface count.
