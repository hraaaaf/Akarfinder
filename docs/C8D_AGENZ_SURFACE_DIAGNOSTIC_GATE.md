# C8D — Agenz surface diagnostic gate

Goal: explain why 7/9 bounded Agenz × Diour Jamaa detail pages still lack strict surface recovery after PR #768, without storing raw third-party HTML or mutating production data.

The diagnostic may emit only derived booleans/counts per seed:

- strict surface recovered or not ;
- JSON-LD high-confidence surface present or not ;
- page-scoped title contains an m² token or not ;
- page-scoped title surface values are unique, conflicting or absent ;
- page body contains an m² token or not, as a diagnostic signal only and never as accepted evidence.

Forbidden:

- raw HTML/page text persistence ;
- DB writes ;
- public activation ;
- accepting whole-body regex as surface evidence ;
- price/m² publication from this diagnostic.

Success criterion: a bounded live artifact classifies the remaining failures sufficiently to choose the next extractor strategy while `productionWriteCount=0` remains verified.
