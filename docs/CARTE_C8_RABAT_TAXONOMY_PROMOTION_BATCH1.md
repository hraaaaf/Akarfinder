# C8 — Rabat Taxonomy Promotion Batch 1

## Goal

Promouvoir uniquement Akkari et Al Boustane de `candidate` à `certified` dans la couche taxonomique C8B, sur la base du lot de preuve first-party déjà certifié, sans aucune activation publique ni écriture DB.

## Succès

- Akkari et Al Boustane portent `taxonomy_status: certified` ;
- leur géométrie reste `unresolved` ;
- `market_map_eligible=false` et `activation_status=blocked` ;
- `fail_closed_reason=geometry_unresolved` ;
- les 16 autres entrées provisoires restent `candidate` ;
- le registre total reste à 23 localités ;
- la couverture géométrique C8C reste 4/23 ;
- aucune mutation production n'est exécutée.

## Preuve source

Le manifest `data/geo/rabat-taxonomy-evidence-batch1-v1.json` a déjà été certifié exact-head. Il retient deux décisions `ready_for_taxonomy_certification` :

- Akkari : l'AURS l'identifie explicitement comme quartier dans le programme de rénovation urbaine Océan–Akkari ;
- Al Boustane : l'AURS le qualifie explicitement de nouveau quartier.

## Séparation des autorités

Cette promotion est uniquement taxonomique. Elle ne vaut ni géométrie certifiée, ni validation de l'autorité DB, ni éligibilité SEO, ni activation carte.

Le manifest C8D d'autorité reste `proposal_only` avec `validation_status=pending_review`, `map_eligible=false`, `seo_eligible=false` et `productionWriteCount=0`.

## État après promotion

Parmi les 19 localités sans géométrie C8C :

- 3 sont taxonomiquement certifiées mais encore bloquées par la géométrie : Océan, Akkari, Al Boustane ;
- 16 restent bloquées par la taxonomie ;
- 4/23 seulement disposent d'une géométrie analytique C8C certifiée.

## Next

Reprendre la recherche géométrique sur le sous-ensemble taxonomiquement certifié, en priorité Akkari et Al Boustane. Aucun contour n'est créé sans preuve spatiale défendable.