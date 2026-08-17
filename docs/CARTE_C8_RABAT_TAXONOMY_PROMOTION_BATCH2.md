# C8 — Rabat Taxonomy Promotion Batch 2

## Goal

Promouvoir uniquement Yacoub El Mansour de `candidate` à `certified` dans la couche taxonomique C8B, sur la base du lot de preuve first-party batch 2 déjà certifié, sans activation publique ni écriture DB.

## Succès

- Yacoub El Mansour porte `taxonomy_status: certified` ;
- sa géométrie reste `unresolved` ;
- `market_map_eligible=false` et `activation_status=blocked` ;
- `fail_closed_reason=geometry_unresolved` ;
- Akkari et Al Boustane restent certifiées taxonomiquement ;
- 15 autres entrées provisoires restent `candidate` ;
- le registre total reste à 23 localités ;
- la couverture géométrique C8C reste 4/23 ;
- aucune mutation production n'est exécutée.

## Preuve source

Le manifest `data/geo/rabat-taxonomy-evidence-batch2-v1.json` retient Yacoub El Mansour comme `ready_for_taxonomy_certification`. L'AURS le qualifie explicitement de **quartier de Yacoub El Mansour** dans la fiche du secteur de projet Gare d'Agdal à Rabat.

## Séparation des autorités

Cette promotion est uniquement taxonomique. Elle ne vaut ni géométrie certifiée, ni validation DB, ni éligibilité SEO, ni activation carte.

Le manifest C8D d'autorité reste `proposal_only`, `validation_status=pending_review`, `map_eligible=false`, `seo_eligible=false` et `productionWriteCount=0`.

## État après promotion

Parmi les 19 localités sans géométrie C8C :

- 4 sont taxonomiquement certifiées mais geometry-blocked : Océan, Akkari, Al Boustane, Yacoub El Mansour ;
- 15 restent taxonomy-blocked ;
- 4/23 seulement disposent d'une géométrie analytique C8C certifiée.

## Next

Rechercher une preuve géométrique défendable pour Yacoub El Mansour et poursuivre la qualification source-backed des 15 candidates restantes.