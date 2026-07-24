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

## 4. Canonical V1 families

### Property types
- Appartement
- Villa
- Terrain
- Maison
- Riad
- Studio
- Duplex
- Penthouse
- Bureau
- Commerce
- Ferme / propriété rurale
- Programme neuf

### Intent
- Acheter
- Louer
- Vendre

### Services / intelligence
- Crédit / financement
- Estimation
- Quartier / carte
- Comparaison
- Mon Projet
- Compagnon
- Alertes

### Professional ecosystem
- Agence partenaire
- Promoteur

Do not create Gold/Premium/verified semantics unless the corresponding entitlement exists in product truth and commercial rules.

### Identity states
- no results
- no image
- project empty
- favorites empty
- data limited

Loading, generic error/success and basic form feedback remain functional UI patterns unless a later UX audit justifies a larger identity illustration.

## 5. Naming convention
Canonical location:

`/public/brand/visual-system/`

Prefixes:

- `property-` — property types
- `intent-` — buy/rent/sell
- `service-` — financing, valuation, comparison, companion, project, alerts
- `pro-` — agency/developer ecosystem
- `state-` — selected empty/unavailable editorial states
- `city-` — city marks, produced under the separate architectural-fidelity gate

Use lowercase kebab-case.

## 6. Asset registry

| Concept / family | Decision |
|---|---|
| Hero photography | KEEP |
| City photography | KEEP until each city mark passes fidelity QA |
| Listing/source imagery | KEEP / EXCLUDE from brand redesign |
| Header logos light/dark | KEEP |
| Lucide functional UI icons | KEEP |
| Property-type identity illustrations | CREATE — V1 library present |
| Intent illustrations | CREATE — V1 library present |
| Services / intelligence illustrations | CREATE — V1 library present |
| Agency / developer ecosystem | CREATE — V1 library present |
| Selected empty/fallback states | CREATE — V1 library present |
| Generic loading/error/success controls | KEEP as functional UI patterns |

The machine-readable registry is `lib/brand/visual-assets.ts`.

## 7. Photography vs illustration vs icon
Use **photography** when truth matters: a real home, real city, real neighborhood, or sourced listing.

Use **AkarFinder illustration** when the concept is abstract or categorical: property type, intent, service, ecosystem, onboarding, empty editorial state.

Use **Lucide** for controls: search, favorite action, filters, close, menu, map-pin controls, share, sort, external link, theme, form/status actions.

Do not redraw functional icons merely to force branding.

## 8. City marks — strict fidelity gate
City marks are governed separately because architectural fidelity is mandatory.

Founder-locked first pack:

- Casablanca — CFC skyline + Mosquée Hassan II
- Rabat — Prince Moulay Abdellah stadium complex + Mohammed VI Tower
- Marrakech — Koutoubia
- Fès — Bab Boujloud / medina gateway identity
- Tanger — Kasbah/medina + bay relationship, no generic lighthouse
- Agadir — Kasbah Oufella + crescent bay, no invented skyline

Pipeline:

1. verified real reference photos;
2. identify invariant silhouette and proportions;
3. simplify into AkarFinder Style 3;
4. compare side-by-side with the real landmark;
5. only then integrate.

No city photography is replaced until the corresponding mark passes this gate.

## 9. QA gallery
A branch-only review route is available at:

`/demo/visual-system`

It displays the full V1 library by family before mass integration.

Validation checklist:

- same palette;
- similar optical weight;
- recognizable at small card size;
- no embedded text;
- no unexplained gradients;
- light-surface readability;
- dark usage evaluated before dark-background integration;
- mobile card readability checked.

## 10. Registry statuses
Canonical statuses:

- `KEEP`
- `REDESIGN`
- `REPLACE`
- `CREATE`
- `REMOVE`
