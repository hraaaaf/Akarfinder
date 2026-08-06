# DATA-COVERAGE-1 — Coverage Gap Auditor

## Scope

This lot measures acquisition coverage gaps from existing evidence. It does not fetch a source, change a scraper, activate a source, bypass pagination controls, or modify publication eligibility.

The auditor answers, per source segment:

- how many results the source announced;
- how many URLs were observed;
- how many URLs remain after canonical URL deduplication;
- how many unique URLs were classified as `LISTING`;
- whether the measurement is complete, incomplete, unknown, or inconsistent;
- whether a measurable gap is associated with pagination-cap evidence and therefore merits later partitioning work.

## Canonical measurement rule

Coverage is:

```text
unique LISTING URLs / announced source results
```

It is not calculated from every discovered URL because category, project, search and ambiguous documents do not represent individual listings.

Aggregate coverage is weighted:

```text
sum(unique LISTING URLs) / sum(announced source results)
```

A mean of segment percentages is forbidden because it overweights small segments.

## Statuses

| Status | Meaning |
|---|---|
| `complete` | The measured gap is within the configured integer tolerance. |
| `gap` | The announced count exceeds unique listing URLs beyond tolerance. |
| `unknown` | No announced count exists; no ratio is fabricated. |
| `inconsistent` | Observed evidence contradicts the announced count. |

Unknown and inconsistent segments are excluded from aggregate coverage.

`partitionRequired` is true only when all conditions hold:

1. status is `gap`;
2. the gap reaches `partitionGapThreshold`;
3. pagination-cap evidence is present.

The auditor recommends no partition merely because coverage is low.

## Input format

```json
{
  "generatedAt": "2026-08-06T16:00:00.000Z",
  "options": {
    "completeTolerance": 0,
    "partitionGapThreshold": 1
  },
  "segments": [
    {
      "source": "example.ma",
      "segmentKey": "casablanca:apartment:sale",
      "categoryUrl": "https://example.ma/casablanca/appartements/vente",
      "announcedResults": 5184,
      "discoveredUrls": [
        "https://example.ma/listing/1",
        "https://example.ma/listing/2"
      ],
      "listingUrls": [
        "https://example.ma/listing/1",
        "https://example.ma/listing/2"
      ],
      "pagesObserved": 40,
      "paginationCapDetected": true,
      "evidence": [
        "category counter snapshot",
        "discovery manifest"
      ],
      "measuredAt": "2026-08-06T15:30:00.000Z"
    }
  ]
}
```

`listingUrls` must be a subset of `discoveredUrls`. URLs are normalized by removing fragments and trailing slashes before deduplication.

## Command

```bash
npx tsx scripts/audits/data-coverage-gap-audit.ts \
  --input artifacts/data-coverage/input.json \
  --json artifacts/data-coverage/report.json \
  --markdown artifacts/data-coverage/report.md
```

Both outputs are deterministic when `generatedAt` and the input evidence are fixed. Segments are sorted by source and segment key.

## Output contract

Schema version:

```text
data-coverage-gap-audit/v1
```

The JSON report contains a weighted summary and per-segment measurements. The Markdown report is a human-reviewable rendering of the same values.

## Fail-closed rules

The command exits non-zero when:

- a URL is malformed;
- a count is negative or not an integer;
- a listing URL lacks discovery evidence;
- timestamps are invalid;
- the input does not contain a segment array.

No network request occurs in the auditor.

## Validation

Dedicated gate:

```text
.github/workflows/data-coverage-gap-auditor-gate.yml
```

The gate runs the focused Node test suite and the production build.
