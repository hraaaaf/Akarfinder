# C8B — Registre canonique des localités Rabat

## Portée

C8B matérialise le modèle défini par C8A sans modifier le runtime public de la carte.

Le registre est implémenté dans `lib/geo/rabat-locality-registry.ts`. Il sépare :

- les `product_locality` AkarFinder ;
- les unités administratives/statistiques parentes ;
- le statut de géométrie ;
- la provenance des noms et de la géographie.

## Baseline C0–C7 préservé

Les cinq entités Rabat déjà présentes restent lossless :

- Agdal — certifiée, carte éligible, `point_proxy` existant ;
- Hay Riad — certifiée, carte éligible, `point_proxy` existant ;
- Hassan — certifiée, carte éligible, `point_proxy` existant ;
- Souissi — certifiée côté taxonomie, carte non éligible, géométrie `unresolved` ;
- Océan — certifiée côté taxonomie, carte non éligible, géométrie `unresolved`.

Les trois `point_proxy` référencent explicitement `lib/geo/morocco-centroids.ts`. Ils ne sont pas présentés comme des polygones certifiés.

## Parents administratifs/statistiques

Le contexte HCP est représenté séparément par les identifiants :

- `admin_rabat_agdal_riyad`
- `admin_rabat_hassan`
- `admin_rabat_souissi`
- `admin_rabat_yacoub_el_mansour`
- `admin_rabat_youssoufia`
- `admin_rabat_touarga`

Cette couche n’active aucune localité produit.

## Candidats source-backed

Trois noms officiels supplémentaires sont enregistrés uniquement comme candidats de taxonomie produit :

- Yacoub El Mansour ;
- Youssoufia ;
- Touarga.

Invariants candidats :

- `taxonomy_status: candidate` ;
- `market_map_eligible: false` ;
- `geometry_status: unresolved` ;
- aucune géométrie ou activation déduite du nom ou du parent administratif.

## Non-activation runtime

C8B n’est importé ni par `lib/geo/resolve-listing-geo.ts`, ni par `/api/geo/rabat-market-intelligence`. Il ne modifie donc pas :

- les métriques C3 ;
- le ranking Search ;
- le resolver géographique runtime ;
- la surface publique de la heat map.

L’activation de nouvelles localités reste bloquée jusqu’à C8C, où une géométrie défendable devra être ingérée et certifiée explicitement.
