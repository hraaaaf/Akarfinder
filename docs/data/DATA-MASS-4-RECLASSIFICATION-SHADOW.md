# DATA MASS-4 — Mass Reclassification Shadow

## Objectif

Réévaluer le stock historique sans mutation en séparant strictement :

1. permission / policy admissibility ;
2. éligibilité structurelle ;
3. qualité / complétude.

## Règle centrale

`Quality ≠ Eligibility`.

Une qualité élevée ne crée jamais une permission. Une qualité faible ne supprime pas, à elle seule, l'éligibilité d'une représentation structurellement et juridiquement admissible. La qualité reste un signal de ranking/enrichissement.

## Boundary

- Source Registry autoritaire et fail-closed ;
- 0 DB write ;
- 0 Registry write ;
- 0 Search activation ;
- 0 source/detail fetch ;
- 0 permission inférée ;
- aucune migration ni mutation production dans MASS-4.

Le census live mesure le stock et l'état Registry actuel. Toute activation ou reclassification persistée appartient à un lot séparé après certification explicite.
