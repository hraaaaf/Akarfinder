# Carte intelligence marché — C2 closeout

Date : 2026-08-16

Référentiel : `docs/CARTE_INTELLIGENCE_MARCHE_TARGET.md`.
Contrat métriques : `docs/CARTE_INTELLIGENCE_METRICS_CONTRACT.md`.

## Verdict

**C2 — Dataset métriques quartier v2 : CLOSED.**

La fermeture porte sur la disponibilité et la sûreté des trois métriques cible, pas sur une prétendue représentativité complète du marché. Les zones ou segments dont l'échantillon prix est insuffisant restent explicitement `NULL` / `insufficient` et devront être rendus neutres par C3/C4.

## Contrat livré

- `price_median_mad_m2` : médiane observée DH/m², séparée par transaction ; jamais moyenne naïve ; jamais imputée.
- `listing_count` : volume observé des annonces éligibles dans le snapshot courant.
- `listing_density_km2` : `listing_count / area_km2` certifiée.
- scope transaction, sample count, fraîcheur, provenance, confidence/reliability et version de snapshot conservés.
- absence de donnée prix : `NULL`, jamais `0`.
- fiabilité statistique distincte de la représentativité marché.

## Preuves C2A / C2B

### C2A — moteur métriques réel

PR #690 mergée sur `6e5bf85984392938ed0bd8c70474cd8a25c64956`.

Snapshot Rabat pilote :
- 32 listings sur Agdal / Hay Riad / Souissi / Hassan ;
- 4/4 zones avec volume et densité calculables ;
- 2 observations prix/m² initialement exploitables.

### C2B — qualification exacte de la couverture prix

PR #691 mergée sur `501f6dbbce3904a0358df00f1938d2f66f0ce7ab`.
Run `31918145727` : SUCCESS.
Artefact `9255534356`.
Digest `sha256:94bc8ef4c1a6305c66027ad6c6f46532176e971c82f888867e6d0d5e53a205f5`.

Résultat :
- 32 current resolved listings ;
- 2/32 avec prix/m² = 6,25 % ;
- 26/32 ont déjà une surface mais pas de prix ;
- 1 a un prix mais pas de surface ;
- 3 n'ont ni prix ni surface ;
- verdict exploratoire : `C2B_PRICE_COVERAGE_INSUFFICIENT`.

Deux requêtes via l'ancienne vue Shadow ont auparavant échoué avec PostgreSQL `57014 statement timeout`. La stratégie a été changée après le deuxième échec : lecture bornée des tables de base avec résolution Geo latest-event-first. Le workflow C2B interdit désormais la réintroduction de la vue lourde.

## Enrichissements sûrs testés

### C2C — Mubawab live ciblé

PR #693 mergée sur `61ff4ce71ab86808eb9dffa173328d553eefa6b9`.
Run `31918552226` : SUCCESS.
Artefact `9255651429`.
Digest `sha256:81d754c759f94c83eb35dedb28309a452162b984b5644d81b8d39201e6f9de5b`.

- 19 candidats ;
- 19 fetchés ;
- 3 identités prouvées ;
- 3 prix fiables récupérables : Hay Riad 1, Souissi 2 ;
- Agdal 0, Hassan 0 ;
- aucun write automatique sur PR.

Un chemin de write manuel fail-closed existe (`workflow_dispatch` + `execute_write=true`, re-fetch/revalidation, maximum 10 writes, uniquement si `normalized_price_mad IS NULL`). Il n'a pas été exécuté dans ce closeout.

### C2D — Mouldar offline

PR #695 mergée sur `9c20c1b86055222880010a3cf6b6c6a06d266f8f`.
Run `31918737456` : SUCCESS.
Artefact `9255698542`.
Digest `sha256:da74e8751d7ccdcbe0075369ac7f4150c34c9b3a8d789aa23c21ed5ddbec34f3`.

- 7 candidats avec surface ;
- 0 match prix fiable ;
- 0 requête tierce ;
- preuve que la voie v4 offline Mouldar n'apporte rien sur la cohorte actuelle.

### C2E — Mubawab offline

PR #696 fermée comme preuve négative non mergée après drift de `main`.
Run `31918780371` : SUCCESS.
Artefact `9255711908`.
Digest `sha256:267fe12b9bddd189cd9da73bab71d80777938c98d56abfd7b466773a9eee71d3`.

- 19 candidats ;
- 0 match fiable ;
- 0 requête tierce.

## Pourquoi C2 peut fermer malgré la faible couverture prix

Le gate canonique C2 exige : métriques réelles, ventes/locations séparées, NULL conservé, dédup appliqué et densité interdite sans aire certifiée. Il ne fixe pas un nombre minimal artificiel de prix par zone.

La politique Reliability historique traite explicitement les petits échantillons comme `insufficient`. C3 devra donc exposer les zones insuffisantes en état neutre et calculer couleurs/légendes uniquement depuis les valeurs défendables.

## Limites conservées

- aucune prétention de représentativité marché totale ;
- aucun chiffre du mockup hardcodé ;
- les 3 prix C2C ne sont pas comptés comme écrits en production ;
- Price mode peut être partiellement neutre tant que les échantillons restent insuffisants ;
- Volume et Densité restent des métriques observées du snapshot courant, pas une mesure d'exhaustivité nationale.

## Prochaine étape

**C3 — API publique fail-closed + échelles de couleur** : produire un GeoJSON read-only avec modes `price / density / listings`, zones insuffisantes neutres, classification déterministe et légende calculée depuis la même échelle que les fills.
