# M7-F — External SERP UI

Date: 2026-08-24
Status: CODE CANDIDATE — production visual proof pending explicit deployment authorization

## Goal

Make external indexed results behave visually like search-engine results rather than pretending to be first-party property cards.

## Success criteria

1. The search toolbar keeps the real gateway `total_count`; loaded results remain cursor-based and progressive.
2. `external_minimal_index` / `Q0_link_only` never shows a synthetic image, inferred price, source snippet, surface, or price-per-m².
3. External minimal results use a dense one-column SERP row with source-first attribution, safe normalized chips, explicit verification wording, and a direct source CTA.
4. Mobile/desktop layout remains readable at 390 / 430 / 768 / 1280.
5. Dedicated contract test + TypeScript compile are green.
6. Production AFTER screenshots are required before production visual certification.

## BEFORE

Current component contract before M7-F:

- `ExternalIndexedResultsSection` uses a 2-column mobile / 3-column desktop property-card grid.
- `ExternalIndexedResultCard` renders contextual artwork when no authorized thumbnail exists.
- it derives an indicative price when no trusted price exists;
- it can render source snippet-derived presentation inputs and rich property facts;
- therefore the visual hierarchy suggests a property portal card even for link-only external index results.

This is incompatible with the current M7 external-minimal serving contract, whose purpose is canonical-link discovery without protected-content reuse.

## External reference pattern audit

Observed search-result conventions across current real-estate references:

- prominent total result count;
- sort and map/list controls adjacent to results;
- progressive result navigation rather than rendering the full corpus at once;
- source/property hierarchy kept readable at scan speed;
- dense repeated rows/cards with consistent metadata placement.

AkarFinder differs in one crucial way: for external minimal sources it does not own or reuse the rich listing payload. Its correct visual analogue is therefore a SERP row, not a copied portal card.

## Locked mockup

```text
387 résultats                                   Pertinence
──────────────────────────────────────────────────────────
mubawab.ma · Source externe
Appartement à Casablanca
Casablanca · Appartement · Vente
Résultat indexé. Prix et détails à vérifier sur la source.
Voir l’annonce source ↗
──────────────────────────────────────────────────────────
100 chargés                         [Afficher plus de résultats]
```

The `387` example is the verified Casablanca gateway total at the time of this lot; `100` is the current configured first batch. They are different concepts and must remain visually distinguishable.

## Implementation

- `lib/search/external-result-presentation.ts`
  - central fail-closed presentation contract;
  - `external_minimal_index` and `Q0_link_only` force snippet / price / surface / price-per-m² to `null`;
  - only generated title, source, canonical URL/display URL, normalized city/type/intent remain visible.
- `ExternalIndexedResultCard.tsx`
  - removes synthetic artwork and inferred price from minimal results;
  - source-first, single-column SERP row;
  - explicit “verify on source” copy;
  - rich facts are reserved for non-minimal authorized presentation only.
- `ExternalIndexedResultsSection.tsx`
  - replaces the 2/3-column portal grid with a dense one-column flow;
  - displays the number currently loaded separately from the page total;
  - similarity input also passes through the fail-closed presentation layer.

## Proof plan

Dedicated CI:

```text
npx tsx --test scripts/scrapers/__tests__/m7f-external-serp-ui.test.ts
npx tsc --noEmit
```

Visual gates:

1. BEFORE: source-level current UI inventory + retained production baseline evidence.
2. MOCKUP: locked above before code.
3. AFTER candidate: render/inspect at 390 / 430 / 768 / 1280.
4. PRODUCTION AFTER: blocked until explicit Vercel deployment authorization.

## Deployment

No Vercel deployment is authorized or performed by this lot.
