# LOT B3.4.2 — CSV/XLSX Parser

## Scope

Parse partner catalogue files into the B3.4 quarantine only.

## Supported formats

- CSV UTF-8, optional BOM;
- delimiters: comma, semicolon or tab;
- XLSX standard Open XML workbook;
- one selected worksheet, or the first worksheet by default.

## Hard limits

- 20 MiB file metadata limit inherited from B3.4.1;
- 10,000 data rows;
- 200 columns;
- 20 preview rows.

## Security

- XLSM and embedded VBA are rejected;
- formulas are never evaluated;
- formula-like CSV cells are escaped;
- XLSX formula cells are replaced by `[FORMULA_BLOCKED]`;
- no URL is downloaded;
- no listing, ranking or search table is mutated;
- all parsed rows remain `publication_eligible=false`.

## Architecture

The historical `scripts/import-partner-csv.ts` remains available for existing regression coverage, but B3.4.2 introduces a separate package-free parser for the new organization-scoped quarantine contract.

## Output

Both formats produce the same object:

- normalized unique headers;
- raw string rows;
- bounded preview;
- selected sheet name when applicable;
- number of neutralized formula cells.

Canonical mapping, business validation, deduplication and publication remain out of scope for this lot.
