# OPENSERP_LISTING_QUALITY_REMEDIATION_2

## Verdict

- `GO_FOR_FIRST_SUPABASE_WRITE`
- production write authorized in this mission: `false`
- next mission candidate: `OPENSERP-TO-SUPABASE-FIRST-WRITE-1`

- provider: openserp 2.1 (local_cli)
- queries_planned: 200
- queries_executed: 200
- raw_results: 2004
- individual_results_before_dedup: 315
- unique_individual_source_urls: 305
- casablanca_unique_candidates: 123
- rabat_unique_candidates: 92
- marrakech_unique_candidates: 90
- individual_precision: 95%
- category_false_acceptance: 0%
- flag_off_visible: false
- flag_on_visible: true
- external_badge: external_web_result
- idempotence_overlap: 242
- stable_candidate_ids: true

## Before / after

| Metric | Remediation 1 | Remediation 2 | Delta |
| --- | ---: | ---: | ---: |
| Queries planned | 180 | 200 | +20 |
| Queries executed | 178 | 200 | +22 |
| Technical failures | 2 | 0 | -2 |
| Raw results | 1684 | 2004 | +320 |
| Candidates before dedupe | 234 | 315 | +81 |
| Unique source URLs | 228 | 305 | +77 |
| Casablanca | 112 | 123 | +11 |
| Rabat | 79 | 92 | +13 |
| Marrakech | 37 | 90 | +53 |
| Precision | 95% | 95% | +0 |
| Category false acceptance | 0% | 0% | +0 |

## Marrakech coverage

- Gueliz: 23
- Route de l'Ourika: 20
- Hivernage: 18
- Palmeraie: 17
- Targa: 9
- Autres Marrakech: 3

## Controlled display path

- feature flag: `PERSISTED_OPENSERP_LISTINGS_ENABLED`
- default value: `false`
- `flag_off_visible = false`
- `flag_on_visible = true`
- public badge: `Résultat web externe`
- partner badge spoofing: `false`
- original external link validation: `true`
- null image path supported: `true`

## Validation

- `npm run test:openserp-ingestion`: PASS
- `npm test`: PASS
- `npm run build`: PASS
- `build pages`: `63/63`
- `git diff --check`: PASS (CRLF warnings only)

## Notes

- The classifier was intentionally left unchanged to preserve the validated precision baseline from remediation 1.
- The second full dry-run showed natural SERP drift, but no duplicate rows were created in the simulated persistent index and overlapping candidate IDs stayed stable.
- Persisted OpenSERP display remains server-gated behind `PERSISTED_OPENSERP_LISTINGS_ENABLED=false` by default.
- The absolute Marrakech mission threshold is exceeded, but exploratory district coverage remains uneven on `Agdal`, `Route de Casablanca`, and `Autres Marrakech`.
