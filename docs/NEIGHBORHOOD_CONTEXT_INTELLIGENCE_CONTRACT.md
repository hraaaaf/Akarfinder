# AkarFinder — Neighborhood Context Intelligence — CONTRACT V1

Date : 2026-08-24
Statut : **LOCKED — Lot 1 contract**

## Goal

Transformer les briques déjà présentes (`Geo Foundation`, `Vivre ici`, pages quartier, Carte N2 et Market Intelligence) en une seule couche nationale de **repères utiles de quartier**, exploitable par la Carte, les pages quartier et les annonces, sans transformer AkarFinder en clone de Google Maps et sans inventer de précision géographique.

Le produit doit répondre à une question immobilière simple : **« qu’est-ce qui structure réellement la vie autour de ce quartier ? »**

## Fondations déjà mergées à réutiliser

### ANN-L5 — Geo Foundation

PR #739, merge `b44bd5d04299a18e778f7e42251cdcb07b364a77`.

Déjà disponible :
- `GeoTruth` exact / contexte / indisponible, fail-closed ;
- contrats provider-agnostic Nearby / Routing / Isochrone / Street Imagery ;
- preuve provider attribuable + fraîcheur ;
- cache/retention policy ;
- bake-off Maroc réel sur Rabat, Casablanca, Marrakech, Tanger ;
- run exact-head `31943466077` SUCCESS ; live `31943502557` SUCCESS ;
- 32/32 POI réels, 8 catégories par ville, 224/224 routes de benchmark.

Les endpoints publics Nominatim/Overpass/OSRM utilisés au bake-off restent **benchmark-only**, pas une promesse de provider production.

### ANN-L6 — Vivre ici

PR #743, merge `2c1cb0650189397c3c350d6bad30b8f8e1d3cecd`.

Déjà disponible :
- `lib/geo/living-here.ts` ;
- `lib/geo/living-here-service.ts` ;
- taxonomie POI ;
- ranking / déduplication locale ;
- marche / voiture uniquement avec route réellement mesurée ;
- isochrones 5/10/15 min uniquement depuis une origine exacte ;
- quartier-centroid = contexte sans faux temps ;
- city-centroid = module masqué ;
- MapLibre + filtres côté annonce ;
- run `31947615421` SUCCESS, 8/8 captures, 0 finding, 0 overflow.

### P6 — Ville / Quartier experience reconciliation

PR #839, merge `e7f7ac753b1fbb41303cd19f0cb0377bff070512`.

Déjà disponible :
- parcours `Territoire → Marché → Vie locale → Biens → Décision` ;
- page quartier avec mini-carte canonique ;
- `Vie locale` et repères existants ;
- run `32496690996` SUCCESS, 8/8 captures, 0 finding, 0 overflow.

### HVR-4 — Intelligence quartier actionnable

PR #859, merge `993f3bc6d7107d3b9d08ce7efea1f1267c4e87cd`.

Déjà disponible :
- homepage `Comprendre le quartier avant de visiter` ;
- Agdal / Maârif / Guéliz issus de `canonical-neighborhood-data` ;
- max 2 repères + 3 tags + 1 repère prix ;
- run `32579508071` SUCCESS ; score visuel 9,3/10.

### Carte nationale N2

Closeout `docs/CARTE_NATIONAL_N2_HANDOVER.md` :
- Ville → quartier sourcé ;
- Casablanca : 1 617 labels, 134 repères valides ;
- 0 contour quartier publié sans preuve ;
- Search handoff `city + district` ;
- run `32704717514` SUCCESS ;
- score 9,4/10.

### Partner → Neighborhood → Market Intelligence V2

PR #896, merge `cbfd80af575c0eafc58ae0dc4a2273565a2e46d6`.

Déjà disponible : identité partenaire stable, Geo Resolver, Neighborhood ID canonique, agrégations marché et downstream commun Search / Carte / fiche quartier.

## Gap exact à fermer

La fondation POI existe, mais **le quartier national n’a pas encore un read-model POI canonique**.

État actuel :
- `lib/map/neighborhood-data.ts` contient encore un petit jeu curaté de `proximityHighlights` et `lifestyleTags` ;
- la page quartier réutilise ces strings statiques ;
- `ANN-L6 Vivre ici` sait interroger des providers autour d’une annonce, mais n’est pas un registre national de quartier ;
- aucun modèle unique ne relie aujourd’hui POI → provenance → quartier canonique → sélection d’anchors → Map / page quartier / listing ;
- aucune règle nationale n’explique quand un POI est **dans** un quartier versus simplement **autour du repère quartier** ;
- aucune couverture / fraîcheur / qualité nationale n’est certifiée.

## Doctrine produit verrouillée

1. AkarFinder montre **les repères qui aident une décision immobilière**, pas tous les commerces disponibles.
2. Vue quartier par défaut : **5 à 8 anchors utiles maximum** lorsque les données le permettent.
3. Diversité : maximum 2 anchors d’une même catégorie dans la sélection par défaut ; viser plusieurs fonctions de vie locale plutôt qu’une liste de lieux similaires.
4. Les catégories canoniques restent compatibles avec `LivingHereCategory` ; la présentation peut regrouper :
   - Transport ;
   - Éducation ;
   - Santé ;
   - Courses / marchés ;
   - Parcs / sport ;
   - Shopping / services ;
   - Repères structurants ;
   - restauration / culte / banque / parking / côte en contexte, sans obligation d’affichage permanent.
5. Aucun score subjectif de « bon quartier », sécurité, prestige, rentabilité ou attractivité sans contrat séparé et preuves défendables.
6. Aucun temps de trajet depuis un simple centroïde quartier. Les minutes restent réservées à une origine exacte + route mesurée, doctrine ANN-L6 conservée.
7. Aucun `dans le quartier` sans preuve territoriale suffisante. Sans frontière certifiée : wording **« autour du repère quartier »** ou relation équivalente.
8. Aucun provider réseau communautaire implicite dans le rendu production. L’acquisition nationale doit être découplée du render path et traçable.
9. Attribution, licence/source, `observed_at`, fraîcheur et preuve restent attachées aux données.
10. Search, Carte, page quartier et annonce réutilisent les mêmes IDs canoniques ; aucune seconde taxonomie géographique.

## Contrat de données cible

### `NeighborhoodPoiV1`

- `poi_id` stable ;
- `source_id` + `source_entity_id` ;
- `name` + nom normalisé ;
- `category` canonique compatible `LivingHereCategory` ;
- latitude / longitude valides ;
- `source_url` si disponible ;
- `attribution` ;
- `license_policy` / droit d’usage ;
- `observed_at` ;
- `freshness_status` ;
- `confidence` ;
- `status = active | stale | rejected`.

### `NeighborhoodPoiRelationV1`

- `canonical_neighborhood_id` ;
- `poi_id` ;
- relation géographique :
  - `inside_certified_boundary` ;
  - `authority_linked` ;
  - `near_certified_reference` ;
  - `unresolved` ;
- `distance_to_reference_m | null` ;
- preuve / méthode d’assignation ;
- confiance ;
- aucune promotion automatique de `near_certified_reference` vers `inside_certified_boundary`.

### `NeighborhoodAnchorV1`

Projection produit, jamais nouvelle source de vérité :
- `canonical_neighborhood_id` ;
- `poi_id` ;
- `rank` ;
- `category` ;
- `anchor_role = structural | daily | contextual` ;
- raison de sélection déterministe ;
- wording territorial correspondant à la relation ;
- aucune durée de trajet au niveau quartier sauf preuve distincte autorisée par le contrat.

## Règles de sélection

Ordre de décision :
1. POI valide + preuve fraîche suffisante ;
2. relation quartier exploitable ;
3. déduplication par identité/source + nom + distance ;
4. priorité aux anchors structurants et aux besoins du quotidien ;
5. diversité de catégories ;
6. distance utilisée seulement comme signal parmi d’autres, pas comme preuve de frontière ;
7. tri déterministe ;
8. si la qualité est insuffisante : liste plus courte ou état explicite `insufficient_context`, jamais remplissage artificiel.

## Semantic zoom cible

- National / faible zoom : aucun nuage de POI.
- Ville : seulement anchors structurants lorsque pertinent.
- Quartier : anchors sélectionnés, puis catégories à la demande.
- Bien exact : `Vivre ici` peut enrichir avec routes / isochrones mesurés selon ANN-L6.

Les seuils de zoom exacts sont à mesurer et figer au Lot 5 après BEFORE + mockup, pas dans ce contrat DATA.

## Sécurité produit

- pas de localisation privée d’annonce exposée ;
- pas de faux temps ;
- pas de fausse frontière ;
- pas de faux POI ;
- pas de compte « commerces » présenté comme exhaustif ;
- pas de changement ranking Search ;
- pas de déploiement Vercel sans autorisation explicite.
