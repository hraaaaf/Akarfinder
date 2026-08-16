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

### C8D — Market-data projection + UI expansion + final certification 🟡 IN PROGRESS

Le lot suivant est le **Rabat Resolver Shadow** (#750), encore non public :

- resolver déterministe sur le registre C8B ;
- audit production strictement read-only ;
- 984 annonces Rabat dédupliquées / 6 sources ;
- 638 matchs uniques, 6 ambiguës fail-closed, 340 sans signal exact ;
- 68 matchs uniques sur des localités candidates ;
- gold set historique : 39/40 corrects, 1 ambigu, 0 mauvais classement ;
- alias annonce `Kébibat` ajouté à la localité candidate canonique `Kbibat` ;
- aucune création de `geo_entity`, `geo_alias` ou `geo_resolution_event`.

Océan reste une cible logique pour l'extension marché parce que sa taxonomie et son contexte sont déjà présents, mais sa géométrie certifiée et ses échantillons prix/m² manquent encore.

## Progression C8

**Aucun pourcentage C8 n’est publié à ce stade.** Le dénominateur exhaustif des quartiers/localités produit de la commune de Rabat n’est pas encore prouvé. Publier un pourcentage exact créerait une fausse précision.

## Chemin critique

1. renforcer l’inventaire jusqu’à exhaustivité source-backed défendable ;
2. certifier la résolution geo shadow puis proposer une autorité DB bornée sans mutation implicite ;
3. certifier géométrie + métriques + contexte par localité ;
4. activer uniquement les localités passant le gate C8D ;
5. certifier API/UI et non-régression ;
6. fermer C8 seulement lorsque le périmètre et les critères d’exhaustivité sont explicitement verrouillés et satisfaits.
