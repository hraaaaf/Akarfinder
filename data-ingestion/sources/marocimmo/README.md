# MarocImmo — Phase 0 Coverage Proof

**Status:** 🟡 OPEN — robots, pagination and detail identity pending

## Goal

Prove the complete, authorized and relevant MarocImmo real-estate coverage model before any Full Harvest.

## Verified public surfaces — 2026-09-04

National control candidates:

```text
/fr/vente
/fr/location
```

Verified dimension examples:

```text
/fr/vente/appartement
/fr/location/bureau
/fr/vente/commercial
/fr/location/rabat
/fr/location/bureau/casablanca
```

The public pages expose total result counts and rendered page counts. Current observed national anchors are 19,752 sale results and 19,827 rental results. These are reconciliation anchors only, not yet a certified unique-ID denominator.

## Gates

| Gate | Status | Current fact |
|---|---:|---|
| P0-A route families | 🟡 | national/type/geography families observed; completeness unproven |
| P0-B dimensions | 🟡 | sale/rent, types and cities observed; full matrix pending |
| P0-C reachability | ⚪ | overlap between national/type/city surfaces not yet measured |
| P0-D authorized traversal | ⚪ | robots and exact page-N semantics pending |
| P0-E denominator | 🟡 | national counters available but not reconciled to unique source IDs |

## Next exact

1. fetch/evaluate current robots policy with the project checker;
2. enumerate all type and geography route dimensions exposed by the public site;
3. prove exact page-N semantics and terminal behavior only after authorization;
4. prove detail URL/source-ID identity from a bounded sample;
5. compare type/city page-1 IDs against national controls;
6. keep Full Harvest BLOCKED until P0-A..P0-E PASS.

No DB write. No image download. No Vercel deployment.
