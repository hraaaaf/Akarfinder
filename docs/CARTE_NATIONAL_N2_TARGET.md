# Carte nationale — N2 Ville → Quartiers

Date : 2026-08-23  
Statut : TARGET APPROVED / REFINED BEFORE IMPLEMENTATION

## Goal

Après la navigation N1 **Maroc → Ville**, rendre la ville explorable par quartiers sans transformer une liste de noms en fausses frontières : **Ville → quartier sourcé → Search**.

## Cible visuelle V3

- **conserver la vraie carte MapLibre/OpenFreeMap de N1** : côte, routes, labels cartographiques et contexte urbain restent visibles ;
- les points/labels N2 sont une surcouche, jamais un substitut à la carte ;
- le mockup V2 à grille était seulement schématique et est explicitement retiré comme référence cartographique ;
- carte dominante, pas de gros panneau desktop concurrent ;
- header ville compact conservé ;
- recherche quartier compacte dans la carte ;
- quartiers disposant d'un repère : point discret + label anti-collision ;
- sélection : anneau accent + fiche compacte ;
- quartier connu sans repère : trouvable par recherche, fiche explicite, aucune position inventée ;
- contour uniquement si une géométrie est explicitement certifiée pour publication ;
- aucune couche Prix / Densité / Annonces dans N2.

Référence visuelle canonique : rendu N1 certifié Casablanca (MapLibre/OpenFreeMap) pour le fond cartographique + hiérarchie/fiche du mockup V2 pour la surcouche quartier. Le fond réel N1 doit rester perceptible sur 390 / 430 / 768 / 1280.

## Vérité source N2

Source de travail : artifact V5 du run `32634250993`.

Promotion conservatrice :

- noms/labels : Barid Al-Maghrib et OpenStreetMap selon provenance du record ;
- repères ponctuels : coordonnées des labels OSM uniquement lorsqu'elles existent ;
- les records V5 de quartier sont `boundaryStatus=not_claimed` / `publicationStatus=label_candidate` ;
- donc **N2 publie 0 polygone de quartier** tant qu'aucune géométrie n'a franchi une certification dédiée ;
- les contours de ville N1 restent des contours OSM candidats/non officiels.

## Interaction

### Desktop

- hover sur un repère quartier : état actif léger ;
- clic : sélection persistante + fiche quartier ;
- recherche : permet aussi d'atteindre les quartiers sans coordonnées.

### Mobile

- tap sur un repère : sélection + fiche ;
- recherche tactile : même fallback pour les labels sans coordonnées ;
- aucune compétition avec le rail P4.

## Handoff Search

Le contrat Search existant utilise `city` + `district`. Le CTA N2 produit donc :

`/search?city=<ville>&district=<quartier>`

## Critères de succès

- Casablanca expose au moins 1 500 labels/quartiers sourcés ;
- au moins 100 repères cartographiés à Casablanca ;
- Maârif est sélectionnable sur la carte ;
- un label Barid sans coordonnées reste trouvable par recherche ;
- 0 contour quartier non certifié publié ;
- 390 / 430 / 768 / 1280 sans overflow ou erreur navigateur critique ;
- sur les quatre viewports, le style MapLibre contient les couches cartographiques de fond et des features de basemap réellement rendues sous les repères ;
- CTA Search conserve ville + quartier ;
- score visuel final cible >= 9.3/10.

## Human Gate

Après revue de la cible N2 initiale (8,8/10), Achraf a demandé l'amélioration vers le niveau premium puis a validé l'exécution par `Ok do it`. Lors de la revue V2, il a signalé que le mockup pouvait laisser croire à une carte remplacée par des repères. V3 verrouille donc explicitement la conservation de la vraie basemap N1 comme couche de fond, les quartiers restant uniquement en surcouche.
