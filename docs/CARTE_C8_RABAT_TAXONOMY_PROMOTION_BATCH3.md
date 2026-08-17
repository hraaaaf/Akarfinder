# C8 — Rabat Taxonomy Promotion Batch 3

## Goal

Promouvoir uniquement Douar Doum, El Kora et El Garaa de `candidate` à `certified` dans la couche taxonomique C8B, sur la base du lot de preuve AURS batch 3, sans activer la carte ni écrire en production.

## Succès

- les trois localités portent `taxonomy_status: certified` ;
- leur géométrie reste `unresolved` ;
- `market_map_eligible=false` ;
- `activation_status=blocked` ;
- `fail_closed_reason=geometry_unresolved` ;
- les 12 autres entrées provisoires restent `candidate` ;
- le registre total reste à 23 ;
- la couverture géométrique C8C reste 4/23 ;
- aucune mutation DB ni activation publique.

## Preuve source

Le manifest `data/geo/rabat-taxonomy-evidence-batch3-v1.json` retient uniquement Douar Doum, El Kora et El Garaa parce que l'AURS les désigne explicitement comme quartiers informels ou précaires de Rabat.

Mabella, Takaddoum et Kbibat ne sont pas promus par cette preuve : leur citation comme programmes d'habitat ne suffit pas à établir la même sémantique de quartier.

## Séparation des autorités

Cette promotion reste taxonomique uniquement. Elle ne vaut ni géométrie certifiée, ni validation d'autorité DB, ni éligibilité SEO, ni activation carte.

## Next

Après certification exact-head, réconcilier les contrats C8B/C8C/C8D impactés, puis auditer séparément les preuves spatiales de Douar Doum, El Kora et El Garaa sans fabriquer de contours.
