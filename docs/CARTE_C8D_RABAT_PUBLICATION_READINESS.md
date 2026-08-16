# C8D — Readiness foundation pour l’extension Rabat

## Position dans le programme

Le contrat C8A définit C8D comme **market-data projection + UI expansion + final certification**. Le présent lot est la fondation fail-closed de C8D : il établit quelles localités peuvent seulement prétendre passer à l’activation. Il ne clôt pas C8D et ne clôt pas C8 global.

## Gate

Une localité ne peut devenir candidate à une **nouvelle** activation C8 que si les quatre dimensions suivantes sont vraies simultanément :

1. taxonomie produit certifiée ;
2. géométrie C8C certifiée ;
3. métriques marché disponibles ;
4. contexte quartier first-party disponible.

Le module canonique est `lib/geo/rabat-locality-publication-readiness.ts`.

## Résultat actuel

Le registre C8B contient **23** localités produit/candidates.

- 4 localités satisfont actuellement les quatre dimensions : Agdal, Hay Riad, Hassan, Souissi ;
- ces 4 localités sont déjà couvertes par les quatre market zones du pilote C0–C7 ;
- 19 localités sont bloquées par au moins une dimension manquante ;
- **0 nouvelle localité est éligible à une activation publique C8 à ce stade**.

La conséquence est volontaire : l’UI ne doit pas s’étendre simplement parce qu’un nom existe dans le registre.

## Blocage métriques

Le reader C3 actuel `lib/map/rabat-market-intelligence-live.ts` limite explicitement les observations Rabat aux slugs `agdal`, `hay-riad`, `souissi`, `hassan` et aux quatre market zones associées.

Audit production read-only ciblé sur Océan :

- `district_rabat_ocean` existe comme `geo_entity` validée ;
- après latest-resolution + filtres éligibilité + déduplication : **5 annonces vente** et **3 location** ;
- **2 sources** observées ;
- **0 échantillon prix/m²** sur les 8 annonces ;
- la projection d’un prix médian Océan reste donc indisponible/fail-closed.

Ce constat ne modifie aucune donnée production.

## Blocage géométrique

C8C certifie 4/23 géométries analytiques. Les 19 autres restent fail-closed. L’AURS documente explicitement Océan et Akkari comme quartiers distincts de l’arrondissement Hassan et publie une présentation dédiée, mais aucune géométrie Océan n’est ingérée/certifiée dans le repo à ce stade.

Un plan d’arrondissement, un centroïde, une occurrence textuelle ou un contour non reproductible ne sont pas promus en limite de quartier.

## Non-activation

Cette fondation ajoute un **gate de readiness non public**. Elle ne modifie ni `/api/geo/rabat-market-intelligence`, ni Search, ni ranking, ni DB, ni UI. Tant que `listRabatC8DNewActivationCandidates()` est vide, toute extension publique C8 reste bloquée.

## Suite C8D

Le chemin critique est :

1. certifier une géométrie défendable pour une localité hors pilote ;
2. étendre le pipeline métrique C3 à cette même localité sans inventer les métriques absentes ;
3. certifier le contexte first-party ;
4. seulement ensuite projeter la localité dans l’API/UI et certifier le rendu ;
5. répéter par tranches jusqu’à couverture réellement défendable du périmètre Rabat.
