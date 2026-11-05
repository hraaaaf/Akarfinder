# AkarFinder R1 — résultat du recoupement local ↔ Neon — 2026-11-05

## Verdict : PASS pour la comparaison exacte par identité explicite

Les 32 460 identifiants source-scoped du ZIP autorisé ont été lus, validés (ZIP, sommes internes et SQLite) puis comparés à l’ensemble des clés explicites de la branche Neon recovery archivée, sous lecture seule.

| Indicateur | Avito | Mubawab | Total |
| --- | ---: | ---: | ---: |
| Identifiants locaux examinés | 27 106 | 5 354 | 32 460 |
| Clés Neon numériques explicites uniques | 13 422 | 31 875 | 45 297 |
| Intersection exacte | 328 | 357 | 685 |
| Local uniquement | 26 778 | 4 997 | 31 775 |
| Neon uniquement | 13 094 | 31 518 | 44 612 |
| Union exacte | 40 200 | 36 872 | 77 072 |
| Identifiants Neon non résolus | 578 | 12 237 | 12 815 |

Les invariants sont vérifiés par source et au total :
- intersection + local_only = local_unique ;
- intersection + neon_only = neon_unique ;
- union = intersection + local_only + neon_only.

## Méthode et limites

La comparaison primaire utilise exclusivement une paire exacte (source normalisée, source_offer_key ASCII numérique), sans normalisation de zéros, rapprochement textuel ni déduplication physique.

Les 12 815 lignes Neon sans identité numérique explicite comprennent 578 Avito sans clé, 12 166 Mubawab sans clé (dont 13 sous l’alias mubawab) et 71 clés Mubawab non numériques. Les URLs ont été examinées séparément, mais aucun format supplémentaire n’a atteint le seuil de validation requis dans cet export : elles restent en quarantaine. Leur absence de match ne signifie pas une annonce différente.

Cette branche Neon est historique ; les dernières observations Avito/Mubawab disponibles remontent au 8 septembre 2026. Ces résultats ne prouvent ni disponibilité actuelle, ni fraîcheur, ni droits commerciaux, ni biens physiques uniques. fresh_unique_eligible reste UNKNOWN.

## Contrôles exécutés

- Exécution réelle du comparateur sur le ZIP et l’export Neon complet autorisés.
- Tests unitaires : 2 PASS, 1 SKIPPED en CI (fixture locale absente) ; l’exécution réelle a validé l’archive.
- Aucune restauration, écriture Neon/production, crawl, merge ou déploiement.
- Les rapports publiés ne contiennent aucun identifiant brut, URL, secret, chemin local ni export sensible.
