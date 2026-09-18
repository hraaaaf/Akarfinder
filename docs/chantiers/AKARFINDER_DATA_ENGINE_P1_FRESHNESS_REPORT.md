# AKARFINDER DATA ENGINE — P1 FRESHNESS ENGINE REPORT

Status: **PASS**
Policy: `mubawab-freshness-v1.0.0`

## Goal
Attribuer à 100 % du corpus Mubawab un score interne de fraîcheur explicable, sans déclarer mortes les annonces historiques faute de preuve négative.

## Résultat vérifié

- corpus total : **37 420**
- scoré : **37 420 / 37 420 (100 %)**
- `fresh_confirmed` : **18 445**
- `uncertain` : **18 975**
- `stale` : **0**
- `archive` : **0**

## Distribution V1

- **100** — 12 149 : actuel certifié + réapparition historique + URL observée
- **95** — 5 553 : actuel certifié, nouveau vs historique + URL observée
- **95** — 607 : actuel certifié + réapparition historique, URL non matérialisée
- **90** — 136 : actuel certifié, nouveau vs historique, URL non matérialisée
- **40** — 18 975 : historique uniquement, non revu dans le manifest actuel, sans preuve négative de disparition

## Partitions de preuve

- historique : **31 731** IDs
- actuel : **18 445** IDs
- intersection : **12 756**
- actuel uniquement : **5 689**
- historique uniquement : **18 975**
- union : **37 420**

## Preuves

- GitHub Actions run : `33984450481` — SUCCESS
- artifact : `9974733702` (`mubawab-freshness-engine-v1`)
- artifact SHA256 : `82df4c2f9d39de418ccea717d417d31c11e8fc24eae994acba7d74fee04d4822`
- tests unitaires policy : PASS
- vérification finale 100 % scored : PASS

## Règle sémantique importante

`historical_unverified` ne signifie pas mort, expiré ou indisponible. En V1, ces lignes restent `uncertain` avec score 40 tant qu'aucun signal plus récent, positif ou négatif, ne permet une reclassification.

## Suite

P2 peut utiliser le score de fraîcheur comme signal d'enrichissement et de priorité, sans l'utiliser seul comme gate de publication.
