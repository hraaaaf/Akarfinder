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

### C8D — Market-data projection + UI expansion + final certification 🟡 IN PROGRESS

La première fondation C8D est le gate de publication. Son état attendu actuel est :

- 4 localités satisfont taxonomie + géométrie + métriques + contexte, mais elles sont déjà couvertes par C0–C7 ;
- 19 localités restent bloquées ;
- **0 nouvelle activation C8 éligible** avant apport de preuves supplémentaires.

Océan est la première cible de travail logique : taxonomie et contexte sont déjà présents, la base contient une petite population d’annonces résolues, mais la géométrie certifiée et les échantillons prix/m² manquent encore.

## Progression C8

**Aucun pourcentage C8 n’est publié à ce stade.** Le dénominateur exhaustif des quartiers/localités produit de la commune de Rabat n’est pas encore prouvé. Publier un pourcentage exact créerait une fausse précision.

## Chemin critique

1. renforcer l’inventaire jusqu’à exhaustivité source-backed défendable ;
2. certifier géométrie + métriques + contexte par localité ;
3. activer uniquement les localités passant le gate C8D ;
4. certifier API/UI et non-régression ;
5. fermer C8 seulement lorsque le périmètre et les critères d’exhaustivité sont explicitement verrouillés et satisfaits.
