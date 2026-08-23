# Carte nationale Zillow-like — Closeout N1

Date : 2026-08-23
Statut : CLOSED

## Goal

Livrer une navigation territoriale nationale AkarFinder de type Zillow-like : **Maroc → Ville**, avec préparation vérifiée du niveau quartier, sans inventer de frontières ni de métriques marché.

## Résultat vérifié

- PR #875 fusionnée sur `main`.
- Merge squash : `dfc3e9eeed94cbc018079fd820372cf647f15bf9`.
- Runtime N1 : 341 villes/localités, 292 contours qualifiés, 10 799 quartiers/labels catalogués.
- Source pipeline certifiée : HCP/Barid + Geofabrik/OpenStreetMap, provenance et licence conservées.
- Vue Maroc MapLibre avec labels de villes et contours.
- Desktop : hover = sélection active, click = entrée ville.
- Mobile : premier tap = révélation/sélection, CTA/second geste = entrée ville.
- Vue ville : contour, nom, inventaire de quartiers/labels, retour Maroc, handoff Search.
- Rabat premium conservé ; Prix / Densité / Annonces restent hors scope N1.
- Aucun déploiement Vercel réalisé.

## Preuves finales

### Source

- Source V5 : run `32634250993` — SUCCESS.
- Artifact source : `9491880775`.

### UI / responsive

- HEAD certifié avant merge : `4ae451dabf4a79a0fba81b8816dfe0765ca01885`.
- Carte National Zillow UI Certification : run `32647591301` — SUCCESS.
- Artifact AFTER : `9495339926`.
- Digest : `sha256:56d7426a8cdbbce02470220950aaf6823496219b976c4a2b9f7bb525cc5ceb0a`.
- Product Experience P4 Search Map : run `32647591325` — SUCCESS.
- 12 captures AFTER : Maroc + état actif Casablanca + vue Casablanca sur 390 / 430 / 768 / 1280.
- Overflow horizontal : 0 sur les quatre viewports.
- Hauteur carte = hauteur canvas P4 sur les quatre viewports.
- Aucun `pageerror` critique.
- Interaction tactile mobile et hover/click desktop certifiés.

## Score visuel

Score d'audit visuel final : **9,2 / 10**.

Critères observés : lisibilité nationale, hiérarchie visuelle, sélection active, drill-down, cohérence responsive, absence de collision bloquante, continuité avec le shell P4.

## Limites assumées

- Les contours OSM sont présentés comme candidats/repères, pas comme frontières administratives officielles.
- Le catalogue de 10 799 quartiers/labels n'implique pas que chaque quartier dispose déjà d'une géométrie publique certifiée.
- Les couches Prix / Densité / Annonces restent un lot ultérieur.

## Next

N2 : faire apparaître progressivement les quartiers à l'intérieur d'une ville avec le même contrat de vérité, puis seulement brancher les surcouches marché observées.
