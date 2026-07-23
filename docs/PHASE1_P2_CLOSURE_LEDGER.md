# Phase 1 — P2 Residual Closure Ledger

This ledger closes the three audit findings intentionally left outside the P1 closure ledger.

Status vocabulary:
- `CLOSED` — active public/product path corrected and regression-gated.
- `CLOSED_ALREADY` — a previous accepted workstream already removed the original defect; this workstream adds explicit regression evidence.

| Finding | Status | Closure |
|---|---|---|
| AF-AUDIT-P2-009 | CLOSED_ALREADY | The Home final conversion block is buyer-first: Search and Compagnon are the only primary CTAs. Professional discovery is a subordinate text link to `/pro`, so buyer and B2B conversion intents no longer compete at the same hierarchy level. |
| AF-AUDIT-P2-050 | CLOSED_ALREADY | Seller success confirms exactly what happened: declared facts were stored as a non-published, non-verified seller property draft. The next actions are coherent: return to Vendre or inspect comparable Search offers; no fake estimate/publication success is claimed. |
| AF-AUDIT-P2-077 | CLOSED | B2B discovery is explicit across breakpoints: desktop keeps `Espace Pro`, mobile exposes one canonical `Pro` entry for agencies and promoters, the Home retains a subordinate Pro discovery link, and the Footer exposes `AkarFinder Pro`, `Agences`, and `Promoteurs`. |

## Release boundary

P2 closure is code/product closure only. It does not certify the production deployment.

The four release-gated P0 findings (`001`, `011`, `012`, `013`) remain for the single explicit end-of-Phase-1 production release certification.

No Vercel deployment is part of this workstream.
