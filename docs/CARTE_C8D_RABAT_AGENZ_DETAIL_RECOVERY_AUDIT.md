# C8D — Rabat Agenz detail recovery audit

## Goal

Mesurer, sans écriture production, combien de champs `price` et `surface` manquants peuvent être récupérés directement sur les pages détail Agenz pour une localité C8 candidate bornée.

La première cible est **Diour Jamaa** parce que le snapshot shadow canonique observe 16 annonces uniques sur 3 sources, dont **12 URLs Agenz**, alors que ces lignes n'apportent actuellement ni prix ni surface structurés dans le Thin Index.

## Succès

Le lot est acceptable si :

- le cohort reste Rabat + `real_estate_likely` + `LISTING` + display eligible ;
- la source est verrouillée à `agenz.ma` ;
- la localité cible doit être un slug candidat C8B ;
- la classification utilise le resolver shadow sur le document source (`title` → `snippet` → `searchText`) et n'injecte pas un coverage bridge comme autorité ;
- le scan source couvre le cohort Agenz Rabat sous un cap explicite et échoue s'il atteint ce cap au lieu de prétendre être exhaustif ;
- seules les URLs détail Agenz reconnues sont éligibles ;
- les variantes FR/EN du même ID Agenz sont dédupliquées avant fetch ;
- robots.txt est vérifié avant chaque fetch ;
- prix et surface utilisent les extracteurs génériques existants avec filtres stricts ;
- aucun `INSERT`, `UPDATE`, `DELETE` ou mode write n'existe dans ce script ;
- le résultat est un rapport JSON de récupération potentielle, jamais une métrique publique.

## Audit source canonique préalable

Le replay SQL reproduit exactement le snapshot shadow :

- 984 annonces Rabat dédupliquées ;
- 638 matchs uniques ;
- 6 ambiguës ;
- 340 sans signal exact.

Sur les candidates :

- Diour Jamaa : 16 matchs uniques ;
- Agenz : **12/16 URLs canoniques** ;
- ces URLs Diour Jamaa correspondent à **9 IDs d'annonces Agenz uniques**, car `343737`, `6561` et `822446` existent notamment en variantes FR/EN ;
- les lignes du cohort ciblé n'apportent actuellement pas de matière économique suffisante pour une métrique publique.

Ce déficit ne vient pas d'une perte raw → normalized observée dans l'audit précédent. Le levier est donc la récupération détail en amont.

## Implémentation

`scripts/scrapers/c8-rabat-detail-recovery-audit.ts` :

- source verrouillée : `agenz.ma` ;
- localité par défaut : `diour-jamaa` ;
- `C8_RABAT_DETAIL_LOCALITY` permet uniquement un autre slug déjà candidat dans le registre C8B ;
- `C8_RABAT_DETAIL_LIMIT` est borné à 1..50 ;
- scan source borné à **1000** lignes ; si 1000 lignes sont retournées, l'audit s'arrête en erreur pour éviter une classification silencieusement incomplète ;
- réutilise `isRecognizedDetailUrl`, `extractStrictDetailPrice`, `extractDetail`, `normalizeSurface`, `isAllowedByRobots`, `fetchHtml` et le motor-purity guard ;
- déduplique Agenz par l'ID numérique final de l'URL avant tout fetch ;
- surface acceptée uniquement avec confiance **high**. Dans l'extracteur actuel, cela correspond à une preuve JSON-LD structurée ; le fallback regex corps de page, classé `medium`, est volontairement rejeté car il peut capter une annonce similaire ;
- unité m²/m2 explicite, sans range/ha, entre 8 et 100 000 m² ;
- aucune mutation DB n'est implémentée.

Le rapport stdout contient : `sourceScanCap`, `detailCandidates`, `fetched`, `robotsSkipped`, `failed`, `recoverablePrice`, `recoverableSurface`, `recoverableBoth` et la preuve par `seed_id` pour les champs récupérables.

## Interdictions

Ce lot ne :

- modifie pas `thin_index_search_documents` ;
- ne crée aucune autorité geo ;
- ne crée aucun `geo_resolution_event` ;
- ne publie aucun prix/m² ;
- ne contourne jamais robots.txt ;
- ne prétend pas qu'une valeur récupérable est validée tant qu'elle n'a pas été inspectée/certifiée.

## Next

Après CI exact-head, exécuter le dry-run sur un cohort borné Agenz × Diour Jamaa dans un environnement disposant des credentials et de l'accès réseau. Toute future écriture de prix/surface restera un gate séparé et devra être précédée d'un manifest des valeurs proposées et d'une validation de précision.
