# ODM-CANARY-DUAL-READ-01 — Baseline historique

> **Document historique.** Le dual-read a été conçu comme une phase Shadow sans effet public. Le programme a depuis progressé vers un Canary public contrôlé et un cap technique de 10 %. Les invariants de sécurité ci-dessous restent applicables. État opérationnel : `docs/SESSION.md` et `docs/ROADMAP.md`.

## Verdict du LOT d’origine

`SHADOW_WIRED_NOT_ACTIVATED`

## Objectif

Exécuter le read model ODM après production du résultat legacy, comparer les sorties et émettre des métriques structurées sans modifier la réponse publique.

## Invariants

- erreurs ODM sans effet sur status/body/ranking legacy ;
- aucune écriture métier ;
- flags séparés ;
- échantillonnage déterministe ;
- aucune requête brute ou identité utilisateur dans la télémétrie ;
- rollback par désactivation des flags ;
- aucune migration requise pour revenir au legacy.

## Métriques historiques

- nombres de résultats legacy/ODM ;
- overlap URL et top 10 ;
- divergences prix/surface fiables ;
- hash tronqué de clé stable ;
- timestamp ;
- latence et erreurs lorsque disponibles.

## Non-objectifs du LOT d’origine

Ce LOT ne servait aucun résultat ODM, n’activait aucun Canary public et ne modifiait ni ranking, ni Source Registry, ni display eligibility.
