# AkarFinder Visual System V1

## 1. Purpose
AkarFinder uses a three-layer visual architecture:

1. **Photography** for real properties, real places, and editorial context.
2. **AkarFinder Geometric Illustrations** for proprietary identity concepts such as property types, intents, services, professional ecosystem, and selected empty/editorial states.
3. **Lucide functional icons** for universal UI actions and controls.

The goal is a simple, premium, recognizable visual language that never feels like stock iconography.

## 2. Brand palette
V1 is derived from the current AkarFinder visual identity and site colors.

- Deep navy: `#061B33`
- Akar blue: `#0B63CE`
- Light blue: `#60A5FA`
- Pale blue: `#BFDBFE`
- White: `#FFFFFF`

**No bronze, gold, champagne, or unrelated accent palette is permitted in V1.**

## 3. Illustration doctrine
AkarFinder proprietary illustrations must be:

- geometric and architectural;
- low-detail and instantly readable;
- visually balanced at 64–160 px;
- coherent in optical weight and perspective;
- free of embedded text;
- usable on both light and dark surfaces;
- recognizable without relying on labels where practical.

Avoid:

- cartoon treatment;
- tourist clip-art;
- fake realism;
- decorative gradients without a functional reason;
- multiple unrelated illustration styles;
- random use of 3D/isometric perspective.

## 4. Canonical master family
The first approved family is:

- `property-apartment.svg`
- `property-villa.svg`
- `property-land.svg`

These three files define the grammar for later assets.

## 5. Naming convention
Canonical location:

`/public/brand/visual-system/`

Prefixes:

- `property-` — property types
- `intent-` — buy/rent/sell
- `service-` — financing, valuation, comparison, companion, project
- `pro-` — agency/developer ecosystem
- `state-` — selected empty/unavailable editorial states
- `city-` — city marks, produced under the separate architectural-fidelity gate

Use lowercase kebab-case.

## 6. Asset registry

| Concept / family | Current state | Decision |
|---|---|---|
| Hero photography | Real editorial photography | KEEP |
| City photography | Real location photography | KEEP until city marks pass fidelity QA |
| Listing/source imagery | Data content | KEEP / EXCLUDE from brand redesign |
| Header logos light/dark | Brand identity | KEEP |
| Lucide UI icons | Functional UI system | KEEP |
| Appartement | No proprietary family | CREATE |
| Villa | No proprietary family | CREATE |
| Terrain | No proprietary family | CREATE |
| Maison/Riad/Studio/Duplex/Penthouse/Bureau/Commerce/Ferme/Neuf | Incomplete or text-only | CREATE after master QA |
| Acheter/Louer/Vendre | No proprietary illustration family | CREATE after master QA |
| Crédit/Estimation/Comparaison/Mon Projet/Compagnon | Mixed text/Lucide | CREATE where identity illustration adds value |
| Agence partenaire/Promoteur | Mixed text/Lucide | CREATE without inventing entitlement semantics |
| No-results / favorites-empty / project-empty / unavailable | Mixed states | CREATE selectively |
| Loading/error/success controls | Functional states | KEEP as UI patterns / Lucide |

## 7. Photography vs illustration vs icon
Use **photography** when truth matters: a real home, real city, real neighborhood, or sourced listing.

Use **AkarFinder illustration** when the concept is abstract or categorical: property type, intent, service, ecosystem, onboarding, empty editorial state.

Use **Lucide** for controls: search, favorite, filters, close, menu, map-pin controls, share, sort, external link, theme, form/status actions.

## 8. City marks
City marks are governed separately because fidelity is mandatory.

Current first pack:

- Casablanca — CFC skyline + Mosquée Hassan II
- Rabat — nouveau Grand Stade + Tour Mohammed VI
- Marrakech — Koutoubia
- Fès — Bab Boujloud / medina heritage anchor after verified reference selection
- Tanger — verified identifiable city/heritage anchor
- Agadir — verified real bay/relief/architectural anchor

Pipeline: verified reference photos → silhouette invariants → vector simplification → side-by-side QA → integration.

No city photography is replaced until the corresponding mark passes this gate.
