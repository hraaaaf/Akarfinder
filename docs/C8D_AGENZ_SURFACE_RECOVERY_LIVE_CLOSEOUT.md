# C8D — Agenz surface recovery — live closeout

## Goal

Measure, on the already bounded Agenz × Diour Jamaa cohort, whether page-scoped title metadata improves strict surface recovery without any production write.

## Exact proof

- implementation PR: #768 ;
- implementation merge: `bdc6efa8d9eb959de59b20432d7ff5a980017024` ;
- manual workflow run: `31968348418` ;
- run branch: `main` ;
- run head: `bdc6efa8d9eb959de59b20432d7ff5a980017024` ;
- contract: SUCCESS ;
- live-dry-run: SUCCESS ;
- artifact: `9269109315` ;
- artifact digest: `sha256:a03adfcfdd4911332acfa4f36f285737bc6d041c856a03fee5242bd383bc7f6f` ;
- queried rows: 584 ;
- detail candidates: 9 ;
- fetched: 9/9 ;
- robots skipped: 0 ;
- failures: 0 ;
- recoverable price: 8/9 ;
- recoverable surface: **2/9** ;
- recoverable price + surface: **1/9** ;
- `productionWriteCount=0`.

## Delta versus previous live proof

Previous run `31960247064` on the same bounded cohort produced:

- surface: 0/9 ;
- price + surface: 0/9.

After the page-scoped surface extractor:

- surface: **0/9 → 2/9** ;
- price + surface: **0/9 → 1/9**.

Recovered strict surface values in the artifact are 90 m² and 130 m². No value has been written to production.

## Verdict

The page-scoped title strategy is technically useful but insufficient by itself. Seven of nine detail candidates still lack strict recoverable surface evidence under current rules.

No DB mutation, public activation or price/m² publication is authorized by this result. The next technical step is a read-only diagnostic of the remaining seven pages using derived signal flags only, without persisting raw third-party HTML or page text.
