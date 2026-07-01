# Market Price Score Product Policy

Date: 2026-07-01

## Scope

This policy defines how AkarFinder should present the Yakeey market price score before any frontend integration.

It applies only to the benchmark score returned by `lib/market/price-gap-calculator.ts` and the Yakeey benchmark registry in `lib/market/market-benchmark-registry.ts`.

It does not change the calculation logic, the `/search` route, or the database.

## Display principles

- Show a score only when a benchmark match exists and the calculator returns a non-`insufficient_data` status.
- Prefer a short user label plus one-line explanation.
- Keep the wording indicative, not absolute.
- Use the benchmark source attribution: `Référence marché Yakeey`.
- Do not imply official, certified, guaranteed, or exhaustive market truth.

## Status policy

### `below_market`

- User label: `Sous le marché`
- Short description: `Le prix/m² affiché est inférieur au repère Yakeey.`
- Recommended color / badge: green
- Confidence level: `high` for quartier match, `medium` for city match
- Forbidden wording: `bon plan`, `garanti`, `officiel`, `vérifié`, `certifié`

### `near_market`

- User label: `Aligné marché`
- Short description: `Le prix/m² est proche du repère Yakeey.`
- Recommended color / badge: blue or neutral
- Confidence level: `high` for quartier match, `medium` for city match
- Forbidden wording: `parfait`, `exact`, `officiel`, `garanti`

### `above_market`

- User label: `Au-dessus du marché`
- Short description: `Le prix/m² dépasse le repère Yakeey sans être extrême.`
- Recommended color / badge: amber
- Confidence level: `high` for quartier match, `medium` for city match
- Forbidden wording: `cher`, `surcoté`, `aberrant`, `officiel`

### `overpriced`

- User label: `Fortement au-dessus`
- Short description: `Le prix/m² est nettement supérieur au repère Yakeey.`
- Recommended color / badge: red
- Confidence level: `high` for quartier match, `medium` for city match
- Forbidden wording: `arnaque`, `trop cher garanti`, `prix réel`, `prix officiel`

### `insufficient_data`

- User label: `Données insuffisantes`
- Short description: `La référence marché manque ou le calcul ne peut pas être établi.`
- Recommended color / badge: gray
- Confidence level: `low`
- Forbidden wording: `sans risque`, `certain`, `garanti`, `validé`

## Confidence rule

- `high` = benchmark found at quartier level.
- `medium` = benchmark found at city level only.
- `low` = missing input, missing benchmark, or partial calculation.

## Conditions for display

- Show the badge only on supported property types: `appartement` and `villa`.
- Hide the score when city, surface, or total price is missing.
- Hide the score when the benchmark lookup returns no match.
- Keep `insufficient_data` in internal analytics, but do not present it as a positive market signal.
- Never display the score as an official valuation.

