# AkarFinder Product Experience — Couleurs territoriales par ville

Date : 2026-08-21
Base : `main@842238669d08ea5efe190071b6a6b5af20e03b00`
Statut : **IMPLEMENTED — RUN FINAL / AFTER / HUMAN GATE À CERTIFIER**

## Goal

Au zoom Maroc, rendre les six villes phares immédiatement différenciables par une identité couleur stable sur leurs surfaces administratives réelles, sans fabriquer de frontière géographique. Au zoom ville, préserver les couches quartier existantes.

## BEFORE

Capture dédiée du code non modifié :

- branche de preuve isolée : `agent/product-experience-city-colors-before` ;
- PR de preuve : `#834` — ne doit pas être mergée ;
- run : `32468774958` — SUCCESS ;
- artifact : `9441749487` ;
- route : `/map?layer=explore` ;
- 390×844 / 430×932 / 768×900 / 1280×900 ;
- 4/4 captures ;
- 0 finding ;
- 8 marqueurs ville existants : Casablanca, Rabat, Marrakech, Tanger, Agadir, Fès, Kénitra, Mohammedia ;
- aucune identité couleur ville active dans le BEFORE.

## Mockup

Le premier mockup, limité aux halos et chips, a été refusé au human review : la couleur devait être visible directement sur la carte.

Le mockup surfaces a donc été construit **avant l’implémentation runtime** sur les mêmes 390×844 / 430×932 / 768×900 / 1280×900 avec les géométries validées ci-dessous.

Contrat visuel :

- Casablanca : bleu `#2563EB` ;
- Rabat : teal `#0F766E` ;
- Marrakech : terracotta `#C2410C` ;
- Tanger : violet `#7C3AED` ;
- Agadir : vert `#15803D` ;
- Fès : framboise `#BE123C` ;
- remplissage translucide sur la vraie emprise communale ;
- contour + glow léger sans agrandir la géométrie ;
- marqueurs et chips gardent la même identité couleur comme renfort de lecture ;
- Kénitra et Mohammedia restent neutres ;
- couleur = identité de repérage uniquement, jamais prix, qualité, demande ou frontière inventée.

## Preuve géodata

Préparation reproductible : `scripts/data/fetch-morocco-city-boundaries.mjs`.

Source : OpenStreetMap contributors via Nominatim, relations administratives `admin_level=8`, géométries Polygon/MultiPolygon, centre ville inclus et bbox plausible.

Run de preuve :

- run GitHub Actions : `32473880317` ;
- artifact : `9443583546` ;
- digest : `sha256:09923e8957df092217806167e9fc62d087cbacd2b7a0621e45e0747477c2094d` ;
- 6/6 géométries validées.

Relations retenues :

- Casablanca : OSM relation `4072985` ;
- Rabat : OSM relation `2799215` ;
- Marrakech : OSM relation `2799538` ;
- Tanger : OSM relation `2758781` ;
- Agadir : OSM relation `2529624` ;
- Fès : OSM relation `2799557`.

Snapshot runtime : `public/data/map/morocco-flagship-city-admin-boundaries.geojson`.

Le snapshot est local au produit pour rendre le runtime et la certification déterministes. Il conserve la provenance OSM, les IDs de relations, `admin_level=8`, `identity-only` et la licence ODbL. La simplification web est topologique et n’ajoute aucune limite.

## Implémentation

- source GeoJSON MapLibre locale ;
- fill par propriété `color` ;
- contour + glow sur la même géométrie ;
- `maxzoom: 8` : surfaces nationales non affichées au niveau ville ;
- suppression explicite des couches lorsque la navigation quitte la vue Maroc ;
- contrat runtime exposé uniquement après montage réel des 6 couches/surfaces ;
- aucun appel OSM/Nominatim au runtime.

## Succès

1. six couleurs stables et distinctes sur les six communes urbaines au zoom Maroc ;
2. surfaces administratives réelles visibles avec remplissage léger et contour lisible ;
3. géométries sourcées et traçables par relation OSM ;
4. chips de navigation utilisant la même identité couleur ;
5. Kénitra et Mohammedia restent neutres ;
6. contrat `identity-only` exposé au runtime ;
7. les surfaces colorées disparaissent en entrant dans une ville ;
8. l’exploration quartiers Casablanca reste active, avec le contexte ville et ses contrôles territoriaux, sans fuite des couleurs nationales ;
9. MapLibre réel, exact-white, logo canonique et absence d'overflow préservés ;
10. 8/8 captures AFTER, 0 finding ;
11. P4 territorial et P2 navigation restent verts ;
12. aucun Vercel.

## Gate final requis

Workflow `Product Experience City Colors` :

- contrat palette + 6 relations administratives ;
- régressions P4/P2 ;
- TypeScript ;
- build production ;
- Chromium ;
- 4 viewports nationaux + 4 viewports Casablanca ;
- surfaces nationales actives = 6 et `identity-only` ;
- surfaces nationales absentes dans Casablanca ;
- 8 captures ;
- 0 finding.

Après run vert : inspection BEFORE → mockup surfaces → AFTER, score UX/UI, puis human gate final explicite avant merge.
