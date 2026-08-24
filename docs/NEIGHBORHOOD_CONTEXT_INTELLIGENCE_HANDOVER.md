# HANDOVER — AkarFinder / Neighborhood Context Intelligence

Date : 2026-08-24

## Titre cible

**AkarFinder — Neighborhood Context Intelligence**

## Goal

Nationaliser et unifier les repères utiles de quartier déjà partiellement présents dans AkarFinder afin que Carte, page quartier, homepage et `Vivre ici` utilisent une même vérité POI, avec provenance, fraîcheur et précision territoriale explicites.

## État vérifié

### Fondations mergées à conserver

1. **ANN-L5 Geo Foundation**
   - PR #739
   - merge `b44bd5d04299a18e778f7e42251cdcb07b364a77`
   - run statique `31943466077` SUCCESS
   - run live `31943502557` SUCCESS
   - 32/32 POI réels sur Rabat/Casablanca/Marrakech/Tanger
   - 8 catégories/ville, 224/224 routes benchmark

2. **ANN-L6 Vivre ici**
   - PR #743
   - merge `2c1cb0650189397c3c350d6bad30b8f8e1d3cecd`
   - run `31947615421` SUCCESS
   - `LivingHereModel`, Nearby, routing, isochrones 5/10/15, MapLibre, fail-closed exact/context/hidden

3. **P6 Ville / Quartier**
   - PR #839
   - merge `e7f7ac753b1fbb41303cd19f0cb0377bff070512`
   - run `32496690996` SUCCESS
   - parcours `Territoire → Marché → Vie locale → Biens → Décision`

4. **HVR-4 Intelligence quartier actionnable**
   - PR #859
   - merge `993f3bc6d7107d3b9d08ce7efea1f1267c4e87cd`
   - run `32579508071` SUCCESS
   - homepage : Agdal / Maârif / Guéliz, max 2 repères + tags + repère prix

5. **Carte nationale N2**
   - PR #888
   - run `32704717514` SUCCESS
   - Casablanca 1 617 labels, 134 repères valides, 0 faux contour, Search `city + district`

6. **Partner → Neighborhood → Market Intelligence V2**
   - PR #896
   - merge `cbfd80af575c0eafc58ae0dc4a2273565a2e46d6`
   - même Neighborhood ID aval Search / Carte / fiche quartier

## Problème restant exact

Le moteur POI existe côté annonce et le quartier possède quelques repères statiques, mais il manque encore :

- un **registre POI national canonique** ;
- une relation explicite POI ↔ quartier ;
- une sélection 5–8 anchors décisionnels ;
- une couverture/fraîcheur nationale mesurée ;
- un read-model commun Carte / page quartier / homepage / listing ;
- une couche `Repères` avec semantic zoom ;
- la suppression des `proximityHighlights` hardcodés comme source produit principale.

Le code actuel à ne pas confondre :

- `lib/map/neighborhood-data.ts` = petit dataset curaté / strings statiques ;
- `lib/map/canonical-neighborhood-data.ts` = canonicalisation de ce dataset ;
- `lib/geo/living-here.ts` = modèle POI listing-aware déjà robuste ;
- `lib/geo/living-here-service.ts` = orchestration providers ;
- `app/immobilier/[city]/[district]/page.tsx` = page quartier actuelle, lit encore `proximityHighlights` ;
- `components/landing/SignatureMapSection.tsx` = homepage HVR-4, lit encore ces repères statiques.

## Décisions verrouillées

- ne pas refaire ANN-L5/L6 ;
- ne pas créer une seconde taxonomie POI ;
- 5–8 anchors par défaut quand la donnée le permet ;
- max 2 par catégorie par défaut ;
- priorité aux repères structurants + quotidien ;
- pas de score subjectif « bon quartier » ;
- pas de temps depuis centroïde quartier ;
- pas de `dans le quartier` sans relation territoriale prouvée ;
- sans boundary certifiée : `autour du repère quartier` ;
- providers communautaires actuels = benchmark-only tant qu’aucun provider production n’est explicitement configuré/certifié ;
- acquisition POI découplée du render path ;
- même `poi_id` / `canonical_neighborhood_id` sur toutes les surfaces ;
- semantic zoom plutôt qu’afficher tous les POI ;
- aucun Vercel sans autorisation explicite.

## Roadmap

1. **Lot 1 — Réconciliation + contrat** ✅ CLOSED
2. **Lot 2 — National POI Source + Registry Foundation** ← NEXT
3. **Lot 3 — Neighborhood Assignment + Anchor Selection**
4. **Lot 4 — Neighborhood Context Read Model + API**
5. **Lot 5 — Carte Repères + Semantic Zoom**
6. **Lot 6 — Convergence page quartier + Vivre ici**
7. **Lot 7 — National Scale + Quality/Freshness Certification**

Progression du nouveau chantier : **1/7 = 14,3 %**.

## Git canonique Lot 1

- base d’audit initiale : `main@8a049eef165e9d93ba673d9cbd37d0715d8a82a1`
- base réellement mergée après reprise de `main` : `ecc0ac55d30999ca161bb369d11298db6a3710c7`
- branche docs : `docs/neighborhood-context-intelligence-roadmap`
- HEAD docs final : `12dbabf7b4629429bb2526ec6faab668cacdade4`
- PR : **#902**
- merge : `58de80ff29bf128a3881bfc5951be6380baaecab`
- fichiers canoniques :
  - `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_CONTRACT.md`
  - `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_ROADMAP.md`
  - `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_HANDOVER.md`

## Next exact

Lot 2, sans UI :

1. créer `NeighborhoodPoiV1` + validator ;
2. créer l’adapter source/snapshot réutilisant la taxonomie `LivingHereCategory` ;
3. établir ID stable + provenance/licence/fraîcheur ;
4. produire un pilote reproductible sur Agdal, Maârif, Guéliz, Malabata, Founty, Ville Nouvelle Fès ;
5. aucun appel réseau externe dans le render path ;
6. tests idempotence / invalid POI / provenance / droits ;
7. TypeScript + build + rapport couverture ;
8. closeout Lot 2 seulement sur preuves.

## UI plus tard

Lot 5 et Lot 6 sont des lots UI. Obligatoire avant implémentation :
- BEFORE 390/430/768/1280 ;
- Goal écrit ;
- mockup/wireframe ;
- AFTER mêmes viewports ;
- comparaison + score cible >=9,3/10.

## Blocage réel

Aucun pour démarrer Lot 2.

## Prompt de reprise

« Reprends AkarFinder — Neighborhood Context Intelligence depuis `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_HANDOVER.md`. Vérifie d’abord le HEAD `main` courant, conserve ANN-L5/L6, N2 et Partner Market Intelligence, puis exécute Lot 2 National POI Source + Registry Foundation. Aucun changement UI en Lot 2 et aucun Vercel. »