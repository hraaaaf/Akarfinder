# ANNOUNCEMENT-PAGE-ULTRA-PREMIUM — ANN-L6 Closeout

**Lot : ANN-L6 — Vivre ici**  
**Statut : ✅ CLOSED**  
**Date : 2026-08-16**

## Résultat

ANN-L6 livre l’expérience `Vivre ici` de la fiche annonce avec une frontière de vérité stricte : POI provider-verified, routage mesuré uniquement depuis une géographie exacte, isochrones 5/10/15 admissibles uniquement avec preuve fraîche, carte/listes fail-closed et états contextuels explicites lorsque la précision géographique ou les providers ne permettent pas de produire une affirmation exacte.

## Preuve runtime

- PR runtime : **#743 ✅ MERGED** ;
- exact head certifié : `29fa58efdf4c25810f32d0be80b5c6bd05521992` ;
- merge runtime : `2c1cb0650189397c3c350d6bad30b8f8e1d3cecd` ;
- gate statique/visuel exact-head : run `31947615421` — **SUCCESS** ;
- tests L1→L6 et frontières historiques : **PASS** ; TypeScript : **PASS** ; production build : **PASS** ; Chromium : **PASS** ;
- artefact visuel : `9263772467` ;
- digest visuel : `sha256:890ee0ecd520352cc1a5731f4dace9f76b5d532393d39336ac25123bca8ef756` ;
- rapport `ANNOUNCEMENT_PAGE_L6_LIVING_HERE_VISUAL_V1` : **8/8 captures, 0 finding**, 0 erreur HTTP/console et 0 overflow.

Un run statique ultérieur sur le même SHA (`31947702605`) a confirmé **126/126 tests PASS** et TypeScript PASS avant un échec de build exclusivement lié au téléchargement de Plus Jakarta Sans depuis `fonts.gstatic.com`. Ce signal externe n’annule pas le run exact-head `31947615421`, qui a déjà certifié build + Chromium + artefact sur le même code.

## Certification live Maroc

- workflow : `Announcement Page L6 Live Integration` ;
- run exact-head : `31947639368` — **SUCCESS** après une unique relance du job sans mutation du SHA ;
- schéma : `ANNOUNCEMENT_PAGE_L6_LIVE_INTEGRATION_V2` ;
- villes testées : Rabat, Casablanca, Marrakech, Tanger ;
- villes end-to-end live : **3/4** ;
- `truthFindingCount` : **0** ;
- `externalDegradedCount` : **1** ;
- dégradation externe observée : Marrakech — Overpass communautaire indisponible ou moins de deux POI nommés sur les endpoints benchmark configurés ;
- artefact live : `9263872656` ;
- digest live : `sha256:9c3f1211ded17aadb19c74ee963d315d2cb28e394e5b01e60456f4d6c8aabe1c`.

Le canary distingue volontairement une anomalie de vérité/routage, qui reste bloquante, d’une indisponibilité d’un service communautaire de benchmark, qui est enregistrée comme `external_degraded`. Le seuil n’a pas été abaissé à 2/4. ANN-L5 conserve en parallèle la preuve de fondation Maroc 4/4 villes, 32/32 POI et 224/224 paires routables.

Nominatim/Overpass/Valhalla publics utilisés par les certifications restent **benchmark-only**. Aucun SLA, fallback public production ou qualification production n’est déduit de ces runs.

## Invariants verrouillés

- géographie exacte → POI et routage précis possibles uniquement avec preuves admissibles ;
- neighborhood centroid → contexte quartier possible, mais aucune minute `depuis ce bien` ni isochrone précis ;
- city centroid / géographie indisponible → module quartier précis masqué ;
- aucune minute précise sans `ROUTE_MEASURED` ;
- route publiée seulement si sa destination correspond au POI concerné ;
- mesures de route invalides ou périmées rejetées ;
- isochrones limités aux fenêtres 5/10/15 et à une origine exacte ;
- preuve provider attribuable et fraîche, TTL ≤24 h ;
- POI malformés rejetés et doublons nom/catégorie proches dédupliqués ;
- aucun provider concret ni endpoint public implicite dans React ;
- provider/routing indisponible → état honnête, jamais résultat synthétique.

## Validation UX

La fixture QA couvre :

- exact 390 / 430 / 768 / 1280 : section, carte, routes et isochrone ;
- contexte quartier 390 / 1280 : carte/contexte sans minutes précises ni isochrone ;
- exact sans route 390 : aucune minute fabriquée ;
- géographie masquée 390 : module `Vivre ici` absent.

La revue humaine est archivée dans `docs/ANNOUNCEMENT_PAGE_L6_HUMAN_SAMPLE.md`.

## Non-régression

Sur le head final, les gates transversaux pertinents ont terminé **SUCCESS**, notamment Canonical Baseline Validation/Compile, P0, P1 Final Sweep, P2, Design Accessibility, ANN-L1→L5, UX/Search final, UI All Pages et geometry canaries.

## Comptabilité

- ANN-L0 : 4 % CLOSED ;
- ANN-L1 : 7 % CLOSED ;
- ANN-L2 : 7 % CLOSED ;
- ANN-L3 : 6 % CLOSED ;
- ANN-L4 : 9 % CLOSED ;
- ANN-L5 : 9 % CLOSED ;
- ANN-L6 : 12 % CLOSED.

**Progression cumulée : 54 / 100 %.**

**Prochain chemin critique : ANN-L7 — Street Reality.**
