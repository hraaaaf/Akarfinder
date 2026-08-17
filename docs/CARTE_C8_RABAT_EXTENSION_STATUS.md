# C8 — Extension Rabat tous quartiers — statut canonique dédié

## Baseline historique

C0–C7 reste fermé à **8/8 = 100 %**. Ce pourcentage appartient uniquement au programme historique Carte intelligence marché et n’est pas réutilisé comme progression C8.

## État vérifié C8

### C8A — Authority + taxonomy contract ✅ MERGED

- PR #744 ;
- merge `8e5f74e0feb32f99cc85e5f5d8d9ea0a8b04def9` ;
- séparation `product_locality` / `admin_parent` / `postal_names` / `geometry` ;
- aucune activation publique.

### C8B — Canonical Rabat locality registry ✅ MERGED

- PR #745 ;
- merge `eebf997beb7b38f3c0780c78bdb312e058e67ad4` ;
- **23 localités produit/candidates** source-backed dans le registre ;
- **10/10** noms du dictionnaire interne Rabat représentés ;
- inventaire explicitement qualifié de **plancher vérifié**, pas d’exhaustivité finale ;
- nouvelles localités fail-closed et non publiques.

### C8C — Defensible geometry certification ✅ MERGED

- PR #746 ;
- merge `ebe247fcbb769b81ffec8d97a46b0655cf2e016e` ;
- **4/23** géométries analytiques certifiées : Agdal, Hay Riad, Hassan, Souissi ;
- **19/23** restent non résolues ;
- géométries étiquetées `analytical_market_zone`, `officialBoundary: false` ;
- aucune nouvelle activation publique.

### C8D foundation — Publication readiness ✅ MERGED

- PR #747 ;
- exact head `25419e2b88e1c4b520c7630e222fc9224215fb3c` ;
- merge `eeb10803eab2cb3131e7a7bf443d130d136c77df` ;
- exact-head : **15/15 workflows observés SUCCESS** ;
- gate taxonomie + géométrie + métriques + contexte ;
- 4 localités satisfont les quatre dimensions mais sont déjà couvertes par C0–C7 ;
- **0 nouvelle activation C8 éligible** ;
- aucune mutation DB/Search/ranking/API/UI.

### C8D — Resolver shadow + autorité proposée + maturité marché ✅ VERIFIED

#### Rabat Resolver Shadow — PR #750 ✅ MERGED

- merge `9b365bc8d671f58e20c9c33b0509f419f5f58771` ;
- resolver déterministe sur le registre C8B, non branché au runtime public ;
- audit production strictement read-only ;
- 984 annonces Rabat dédupliquées / 6 sources ;
- 638 matchs uniques, 6 ambiguës fail-closed, 340 sans signal exact ;
- 68 matchs uniques sur des localités candidates ;
- gold set historique : 39/40 corrects, 1 ambigu, 0 mauvais classement ;
- alias annonce `Kébibat` ajouté à la localité candidate canonique `Kbibat` ;
- aucune création de `geo_entity`, `geo_alias` ou `geo_resolution_event`.

#### Rabat Authority Proposal — PR #753 ✅ MERGED

- merge `fbbf4c1904c640364f16303f27f6a35f047c7798` ;
- 18 autorités candidates proposées en `proposal_only`, hors 5 entités Rabat déjà validées ;
- toutes restent `pending_review`, `seo_eligible=false`, `map_eligible=false` ;
- dry-run de contraintes production : 18/18 entités nouvelles, 26/26 aliases nouveaux, 0 conflit ID/slug/alias, **0 écriture** ;
- aucune migration ni mutation DB ; toute création d’autorité production reste un gate humain séparé.

#### Rabat Market Maturity — PR #754 ✅ MERGED

- merge `95fe4274ac217a4dde926f76c8f287a1dcb02109` ;
- **11/11 checks observés SUCCESS** ;
- 68 matchs candidats uniques répartis sur 11 localités non vides ;
- 7 localités disposent d’au moins 2 sources ;
- profondeur maximale observée : **2 échantillons** `normalized_price_m2` vente pour une candidate ;
- **0 candidate** déclarée prête pour une métrique prix/m² publique ;
- aucun seuil statistique inventé, aucune médiane sparse publiée, aucune mutation DB.

### C8D — Agenz × Diour Jamaa recovery diagnostics ✅ CLOSED FAIL-CLOSED

- audit initial PR #758 : prix récupérable **8/9**, surface **0/9**, prix + surface **0/9**, 0 write ;
- workflow borné PR #765 : run live `31960247064` SUCCESS ;
- récupération surface durcie : run `31968348418` → **2/9 surfaces strictes**, **1/9 prix + surface**, 0 write ;
- diagnostics génériques : run `31971442842` ;
- diagnostics target-ID structurés : run `31973332410`, aucune nouvelle surface défendable ;
- diagnostics DOM ownership : run `31983044444`, aucun signal semantic/current-listing supplémentaire défendable ;
- closeout PR #774, merge `76299d6878c696eab92517363aa69eb40ab4f609` ;
- **7/9 restent fail-closed** ;
- aucune métrique prix/m² publique, aucune écriture DB, aucune activation publique.

### C8 — Taxonomy evidence + promotions ✅ 6 PROMOTIONS C8 MERGED

#### Batch 1 — Akkari + Al Boustane

- evidence PR #776 ;
- promotion PR #777, merge `631fd85ddb7a10a70b860fb5ec526a8d04eb9f72` ;
- Akkari et Al Boustane passent `taxonomy_status=certified` ;
- géométrie unresolved, map eligibility false, activation blocked.

#### Batch 2 — Yacoub El Mansour

- promotion PR #782, merge `a294627049785a82fbe4dee79bbe11e31a581ee5` ;
- Yacoub El Mansour passe `taxonomy_status=certified` ;
- blocker géométrique certifié via PR #787, merge `41976e7ea17ad3b3a7799c059f56f6d63d5196a9` ;
- la géométrie d’arrondissement administratif n’est pas substituée au quartier produit ;
- géométrie unresolved, aucune activation.

#### Batch 3 — Douar Doum + El Kora + El Garaa

- evidence PR #788, merge `a692bebd694e2eac89bbc0276fd2848942fb9761` ;
- promotion PR #789, exact head `4e494eb69992d7d30296f552cc4e44e4a6b1e790`, **25/25 workflows observés SUCCESS**, merge `ed4f814150a29688fa21b8a5defc551adfb009b3` ;
- Douar Doum, El Kora et El Garaa passent `taxonomy_status=certified` ;
- geometry evidence PR #790, exact head `ac16f806b906c405a9fff30fbe3defe13a59bd1f`, gate dédié SUCCESS, merge `d4d386f9d01419e2c28682b995d77546f70c90f5` ;
- la source AURS prouve leur statut de quartier mais ne fournit pas de polygone directement réutilisable ;
- les trois restent `geometry_unresolved` ;
- aucun centroid/Voronoi/buffer/admin-boundary substitution.

## Invariants C8 actuellement vérifiés

- registre actuel : **23 localités produit/candidates**, toujours qualifié de plancher et non d’inventaire exhaustif ;
- taxonomie certifiée : **11/23** au total = 5 historiques + **6 promotions C8** ;
- parmi les **19/23** géométries non résolues : **7 localités taxonomiquement prêtes** et **12 localités encore candidates** ;
- géométrie défendable : **4/23 certifiées**, **19/23 non résolues** ;
- nouvelles activations publiques C8 : **0** ;
- mutations DB C8 : **0** ;
- nouvelle métrique prix/m² publique issue de C8 : **0** ;
- propositions d’autorité, audits shadow, recovery et preuves géométriques restent non publics et fail-closed.

## Progression C8

**Aucun pourcentage C8 n’est publié à ce stade.** Le dénominateur exhaustif des quartiers/localités produit de la commune de Rabat n’est pas encore prouvé. Les ratios 11/23 et 4/23 décrivent uniquement le registre source-backed actuel et ne valent pas pourcentage d’exhaustivité de Rabat.

## Chemin critique

1. renforcer l’inventaire jusqu’à une exhaustivité source-backed défendable ;
2. poursuivre la certification géométrique des **7 localités taxonomiquement prêtes mais geometry-unresolved**, puis des 12 candidates quand leur taxonomie est certifiée ;
3. chercher de nouvelles sources spatiales explicites pour les quartiers sans contour, sans dériver artificiellement des frontières ;
4. augmenter la profondeur structurée prix/surface et multi-source sans publier de statistique sparse ;
5. ne créer une autorité DB ou écrire des champs récupérés qu’après le gate humain séparé prévu ;
6. activer uniquement les localités satisfaisant simultanément taxonomie + géométrie + métriques + contexte ;
7. certifier API/UI et non-régression sur les localités effectivement éligibles ;
8. fermer C8 seulement lorsque le périmètre et les critères d’exhaustivité sont explicitement verrouillés et satisfaits.
