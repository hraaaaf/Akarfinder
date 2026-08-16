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
- **19 localités bloquées** ;
- **0 nouvelle activation C8 éligible** ;
- aucune mutation DB/Search/ranking/API/UI.

### C8D — Resolver shadow + autorité proposée + maturité marché + récupération Agenz ✅ EVIDENCE MERGED / LIVE GATE PENDING

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

#### Agenz Detail Recovery Audit — PR #758 ✅ MERGED

- exact head `6492e843989fa6d8e22b6af1da2844df7677c051` ;
- merge `dfd227e5050b76abb14967a0d0ef98374c113009` ;
- **8/8 workflows observés SUCCESS**, dont le gate dédié C8D Rabat Agenz Detail Recovery Audit ;
- cible bornée initiale : Agenz × Diour Jamaa ;
- 12 URLs Agenz Diour Jamaa canoniques, dédupliquées en 9 IDs d’annonces uniques avant fetch ;
- source verrouillée à `agenz.ma`, localité restreinte à un slug candidat C8B, robots.txt vérifié, limites fail-closed ;
- récupération prix via extracteur strict existant ; surface acceptée uniquement avec preuve JSON-LD high-confidence ;
- script strictement read-only, sans mode write ;
- **0 écriture DB** et **0 métrique marché publiée** ;
- le dry-run live post-merge sur cohort borné reste à exécuter dans un environnement disposant des credentials et de l’accès réseau ;
- toute future écriture de prix/surface reste un gate humain séparé après validation valeur par valeur.

## Invariants C8 actuellement vérifiés

- registre actuel : **23 localités produit/candidates**, toujours qualifié de plancher et non d’inventaire exhaustif ;
- géométrie défendable : **4/23 certifiées**, **19/23 non résolues** ;
- nouvelles activations publiques C8 : **0** ;
- mutations DB C8 : **0** ;
- nouvelle métrique prix/m² publique issue de C8 : **0** ;
- les propositions d’autorité, audits shadow et audits de récupération restent non publics et fail-closed.

## Progression C8

**Aucun pourcentage C8 n’est publié à ce stade.** Le dénominateur exhaustif des quartiers/localités produit de la commune de Rabat n’est pas encore prouvé. Publier un pourcentage exact créerait une fausse précision.

## Chemin critique

1. renforcer l’inventaire jusqu’à une exhaustivité source-backed défendable ;
2. poursuivre la certification géométrique des **19/23** localités non résolues ;
3. exécuter le dry-run live borné Agenz × localité candidate puis valider les valeurs récupérables sans écriture ;
4. augmenter la profondeur structurée prix/surface et multi-source sans publier de statistique sparse ;
5. ne créer une autorité DB ou écrire des champs récupérés qu’après le gate humain séparé prévu ;
6. activer uniquement les localités satisfaisant simultanément taxonomie + géométrie + métriques + contexte ;
7. certifier API/UI et non-régression sur les localités effectivement éligibles ;
8. fermer C8 seulement lorsque le périmètre et les critères d’exhaustivité sont explicitement verrouillés et satisfaits.
