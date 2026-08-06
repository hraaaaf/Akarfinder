# ODM-CANARY-READMODEL-01 — Verdict historique

> **Document historique. Ne pas utiliser comme état opérationnel actuel.**  
> Le LOT initial préparait un Canary maximum 1 % et ne l’activait pas. Depuis, le contrôleur a évolué, le cap technique est passé à 10 %, et `/search` ainsi que `/api/search` partagent la même requête canonique et la même clé stable. L’activation réellement servie doit toujours être prouvée par télémétrie, pas déduite du code. Voir `docs/SESSION.md` et `docs/ROADMAP.md`.

## Verdict du LOT d’origine

`PREPARED_NOT_ACTIVATED`

Le dépôt contenait alors un contrôleur fail-closed, déterministe, maximum 1 %, des seuils d’arrêt, des checks CI isolés, un runbook de rollback et une checklist d’approbation.

Ce LOT d’origine ne modifiait aucune route publique, API, fonction de ranking, display policy ou variable de déploiement.
