# Vivre Ici — L2-D : crédits cartographiques visibles (candidat)
**07/11/2026 · PR Draft dépendante de L2-C / L2-B / L2-A / L1, aucune fusion ou publication.**

## GOAL
Enlever le risque visible de carte sans crédits fournisseurs, rendre les sources vérifiables et conserver les crédits au-dessus de la navigation mobile / feuille de quartier en deux états, sans modifier le contenu géographique ni prétendre détenir une nouvelle licence.

## BEFORE (preuve)
- [L2-A 24 captures initiales #42366604359](https://github.com/hraaaaf/Akarfinder/actions/runs/42366604359) : sur 390/430 les crédits du composant national sont partiellement masqués par la barre inférieure ; les contrôles de zoom empiètent aussi sur cette barre.
- `components/map/MapLibreNeighborhood3D.tsx` désactive explicitement le contrôle d'attribution : `attributionControl: false`, malgré sources `imagery` (© Esri) et `openfreemap` (© OpenStreetMap contributors / OpenFreeMap).
- `PremiumInteractiveMap.tsx` utilisait `pointer-events-none` pour une mention source non cliquable et affichait « navigation prototype » aux visiteurs.

## Vérification externe de la règle
- [MapLibre — AttributionControl / Options](https://maplibre.org/maplibre-gl-js/docs/API/classes/AttributionControl/) : le contrôle rend les crédits des sources ; `compact:false` conserve l'attribution lisible.
- [OpenStreetMap — Copyright](https://www.openstreetmap.org/copyright) : attribution visible et indication de la licence ODbL lorsque des données OSM sont utilisées.
- Cette correction UI **ne certifie pas** les droits spécifiques d'utilisation commerciale, les plafonds de trafic, ni une licence Esri/geoBoundaries ; validation fournisseur distincte nécessaire.

## Cible UX
- Carte nationale : mention lisible et liens externes `geoBoundaries` et `© OpenStreetMap`, sans jargon prototype, au-dessus de la navigation inférieure mobile.
- Carte quartier MapLibre : contrôle natif d'attribution visible (texte fournisseur), pas masqué sous la fiche mobile fermée ou ouverte.
- Quatre formats 390/430/768/1280, conserver l'expérience de navigation et le CTA Search.

## Code candidat et preuves requises
- Contrôle natif MapLibre activé avec `{compact:false}`, annotations sur le composant national, CSS de positionnement dédié `app/map/l2d-attribution.css` importé après la feuille mobile.
- E2E P1A.6 inspecte les liens sources, le texte du contrôle natif et les bounding boxes sur téléphone ; régression structurelle associée.
- **Success/Proof PENDING :** TypeScript, required PR gate, P1A.6 `findings:[]` avec captures AFTER comparées aux BEFORE, visibilité crédits sur 390/430 et absence de collisions avec fiches / CTA. Aucune note globale V1 attribuée avant preuves.
- Aucune modification de DB prod, géométries shadow, secrets, merge ou Vercel.
