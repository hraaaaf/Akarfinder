# Q1E — Description audit (Neon Recovery versus private Windows export)

**Current proof:** on Neon Recovery, 14,950 of 151,900 property_listings have nonblank description_snippet. A distinct deterministic SQL sample of 1,000 rows (200 each: Mubawab, Avito, Agenz, Domio, other) found 121 populated descriptions in total (0 / 9 / 10 / 75 / 27). The private Windows AkarParser canary is a **different** SHA-stratified sample and returned **0 / 1,000 descriptions**. This discrepancy is real but is **not yet evidence of a parser defect**: the private export's complete schema and selected sample must be examined privately.

## Run locally on Windows with the real export and original canary

From a trusted local checkout of the PR #1188 commit (never upload or commit the private input):

\`\`\`powershell
$private = 'C:\Users\lenovo\Desktop\AkarFinder-DataMass-2026-11-07'
$canary = Join-Path $private 'Q1E_CANARY_20261107_233845'
python scripts/acquisition/akarparser_v2_description_audit.py \`
  --source (Join-Path $private 'neon_recovery_export_20261107.jsonl.gz') \`
  --sample (Join-Path $canary 'private_sample_1000.jsonl.gz') \`
  --parsed-dir (Join-Path $canary 'parser_output') \`
  --out (Join-Path $canary 'description_coverage_aggregate.json')
\`\`\`

**Output is aggregate-only:** overall description counts, by-group counts and recognized alias counts in the full export and selected input, parser output description count, and an explicit finding. No source URL, description text, names, file paths or data rows are written to the report or stdout. Originals are never modified. Repeated writes to the same report path fail closed.

## Interpret the finding

- \`NO_RECOGNIZED_DESCRIPTIONS_IN_EXPORT\`: compare private exporter field selection to the historical Neon schema; do not assign missing text.
- \`NO_DESCRIPTIONS_IN_SELECTED_SAMPLE\`: verify stratification and sample identities; do not assume the parser dropped descriptions.
- \`SELECTED_DESCRIPTIONS_LOST_BY_PARSER\`: a true parser or alias/provenance mismatch; reproduce with private rows, amend aliases/tests, then re-run into a *new* private result directory.
- \`DESCRIPTION_COVERAGE_PRESENT_CHECK_PROVENANCE\`: examine aggregate counts and individual private proofs, not public logs.

The fact that 14,950 descriptions exist in Neon Recovery does not mean the private export includes those columns or the selected 1,000 overlap those rows. No new certified detailed observations or production writes. **100 independent human reviews remain outstanding.**
