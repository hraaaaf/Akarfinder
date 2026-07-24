# AkarFinder Visual System — Golden Master

## 1. Golden reference

**Proposition 3 is the canonical visual reference.**

Every proprietary AkarFinder illustration must be judged against that reference before integration. Matching colors alone is not sufficient: composition, softness, geometry, visual weight and premium perception must belong to the same family.

The visual architecture has three layers:

1. **Photography** for real properties, real cities, real neighborhoods and factual/editorial context.
2. **AkarFinder Golden Illustrations** for proprietary identity concepts: property types, intents, services, professional ecosystem and selected editorial/empty states.
3. **Lucide functional icons** for universal controls and actions.

## 2. Proposition 3 grammar

Required characteristics:

- flat geometric compositions rather than isolated pictograms;
- soft rounded geometry and generous negative space;
- layered background shapes that create depth without fake 3D;
- one dominant subject with one or two secondary shapes maximum;
- readable silhouette at card size;
- premium editorial feel rather than an icon-pack feel;
- consistent optical weight across the entire library;
- no text embedded inside artwork.

Forbidden:

- stock-icon / clip-art appearance;
- random outline thicknesses;
- isolated tiny pictograms floating in empty squares;
- fake isometric perspective;
- tourist-cartoon landmarks;
- decorative bronze/gold/champagne accents;
- approximate monuments presented as factual representations.

## 3. Brand palette

The system is derived from the real AkarFinder identity:

- Deep navy: `#0B1F3A`
- Akar blue: `#0B63CE`
- Mid blue: `#5AA7F8`
- Pale blue: `#DCEEFF`
- Surface blue: `#EEF6FF`
- White: `#FFFFFF`

No bronze, gold or champagne.

## 4. Canonical illustration families

### Property types
Appartement, Villa, Terrain, Maison, Riad, Studio, Duplex, Penthouse, Bureau, Commerce, Ferme / propriété rurale, Programme neuf.

### Intentions
Acheter, Louer, Vendre.

### Services / intelligence
Crédit / financement, Estimation, Quartier / carte, Comparaison, Mon Projet, Compagnon, Alertes.

### Professional ecosystem
Agence partenaire, Promoteur.

Do not create Gold/Premium/verified semantics unless the corresponding entitlement exists in product truth and commercial rules.

### Editorial / empty states
No results, no image, project empty, favorites empty, data limited.

## 5. Canonical renderer

The golden-master renderer is:

`components/brand/GoldenIllustration.tsx`

This is the source of truth for the Proposition 3 grammar and is used by the QA gallery and integrated identity surfaces.

The legacy V1 static SVG set under `/public/brand/visual-system/` is **not a quality reference**. It is considered deprecated for new integration unless an individual asset is explicitly revalidated against the golden master.

## 6. Photography vs illustration vs functional icon

Use **photography** when truth matters: a real home, city, neighborhood, listing or landmark.

Use **GoldenIllustration** for categorical or abstract identity: property type, intent, service, ecosystem, onboarding and editorial empty states.

Use **Lucide** for functional UI: search, favorites, filters, close, menu, map-pin controls, share, sort, external link, theme and basic form/status actions.

Do not redraw functional controls simply to force branding.

## 7. Cities — corrected doctrine

The first City Marks implementation failed the premium/fidelity bar and is rejected as a live visual direction.

For production city cards:

- use **real city photography** when available;
- frame it with the AkarFinder Proposition 3 card grammar;
- never use an approximate monument silhouette as if it were an accurate city identity;
- a future vector city emblem may replace photography only after side-by-side architectural fidelity review and founder validation.

Current founder reference anchors remain useful only for future fidelity studies:

- Casablanca — Mosquée Hassan II + CFC;
- Rabat — Tour Mohammed VI + new Prince Moulay Abdellah stadium complex;
- Marrakech — Koutoubia;
- Fès — Bab Boujloud;
- Tanger — Kasbah / medina + bay relationship;
- Agadir — Kasbah Oufella + bay / relief relationship.

## 8. QA gallery

Route:

`/demo/visual-system`

The gallery must render the full conceptual library from the golden-master system, not from deprecated static assets.

Validation criteria:

- visually belongs to Proposition 3;
- premium at first glance;
- no stock-icon feel;
- consistent palette and optical weight;
- clear at 64–160 px;
- coherent at 390 / 768 / 1280 px;
- no false factual representation;
- dark-mode usage validated before dark-background integration.

## 9. Release rule

A CI-green result is necessary but **not sufficient** for visual approval.

A visual asset can ship only when:

1. it passes technical checks;
2. it belongs clearly to Proposition 3;
3. it does not look cheaper than the surface it replaces;
4. factual subjects remain truthful;
5. the complete family remains coherent when viewed together.
