# AkarFinder Product Experience — Couleurs territoriales par ville

Date : 2026-08-21
Base : `main@842238669d08ea5efe190071b6a6b5af20e03b00`
Statut : **PREPARED — SURFACES ADMINISTRATIVES EN COURS DE CERTIFICATION**

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

## Mockup initial

Référence visuelle préparée avant la première implémentation sur les quatre viewports exacts.

Contrat initial :

- Casablanca : bleu `#2563EB` ;
- Rabat : teal `#0F766E` ;
- Marrakech : terracotta `#C2410C` ;
- Tanger : violet `#7C3AED` ;
- Agadir : vert `#15803D` ;
- Fès : framboise `#BE123C` ;
- halos doux autour des marqueurs ville ;
- mêmes couleurs sur les chips de navigation ville ;
- Kénitra et Mohammedia restent neutres ;
- couleur = identité de repérage uniquement, jamais prix, qualité, demande ou frontière.

## Extension surfaces administratives

Le human review du mockup initial a conclu que les couleurs devaient être visibles directement sur les surfaces cartographiques des villes. Le lot reste donc ouvert.

Nouvelle règle :

- utiliser uniquement de vraies limites administratives de commune urbaine ;
- source géométrique reproductible : OpenStreetMap contributors via Nominatim ;
- niveau attendu : `admin_level=8`, correspondant aux communes urbaines marocaines ;
- ne conserver que Casablanca, Rabat, Marrakech, Tanger, Agadir et Fès ;
- simplifier uniquement pour le rendu web, sans inventer ni extrapoler de limite ;
- conserver le contrat `identity-only` ;
- aucune couleur ne signifie prix, qualité, demande ou attractivité.

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

## Preuve requise

1. préparation géodata reproductible : 6 relations administratives `admin_level=8`, géométries Polygon/MultiPolygon valides, centre de ville inclus, bbox plausible ;
2. nouveau mockup 390/430/768/1280 construit avec les vraies surfaces avant implémentation runtime ;
3. workflow `Product Experience City Colors` : contrat truth-safe, régressions P4/P2, TypeScript, build production, Chromium, 4 viewports nationaux + 4 viewports Casablanca, 8 captures, 0 finding ;
4. inspection BEFORE → mockup surfaces → AFTER, score UX/UI, puis human gate final explicite avant merge.
