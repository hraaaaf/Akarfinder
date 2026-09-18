# AKARFINDER — MUBAWAB HISTORICAL EVIDENCE SCORING V2

## Goal
Remplacer le score uniforme des **18 975** lignes `historical_unverified` par une note interne fondée uniquement sur des preuves réellement présentes ou récupérées depuis des artifacts AkarFinder certifiés, sans transformer une observation historique en preuve d'activité actuelle.

## Succès
- `metadata.internal_quality_v2` présent sur **18 975 / 18 975** historiques ;
- `rank_lane=historical_tail` sur **18 975 / 18 975** ;
- `public_status=internal_only` sur **18 975 / 18 975** ;
- `freshness_status=uncertain` sur **18 975 / 18 975** ;
- `evidence_status=historical_unverified` conservé ;
- `catalog_only` résiduel : **0** ;
- aucune ligne `current_verified` ne porte `internal_quality_v2` ;
- aucune publication, aucun merge, aucun déploiement Vercel.

## Provenance historique certifiée
Les **18 975** historiques proviennent de l'union Mubawab historique de **31 731 IDs** portée par l'artifact `9949834432`.

Cette union est composée de deux couches first-party distinctes :

1. **baseline classique : 29 741 IDs** ;
2. **extension bureaux/commerces : +1 990 IDs**.

Le full sweep courant contient **18 445 IDs**, dont **12 756** recoupent cette union historique. Le résiduel exact est donc :

`31 731 - 12 756 = 18 975 historiques`.

Cette provenance remplace l'hypothèse antérieure selon laquelle le stock historique aurait été créé principalement depuis des datasets GitHub publics. Ces datasets peuvent fournir des preuves secondaires indépendantes, mais ne constituent pas la provenance primaire de ce corpus.

---

## V2.1 — surfaces bureaux/commerces

L'artifact `9949834432`, produit par le run GitHub Actions **33906589600**, certifie la campagne du **4 septembre 2026** :
- artifact : `lot9-office-catalog-campaign-proof` ;
- digest : `sha256:964a8cc44255bfd793615c4adea1c3be4238bed87b09aad0514c326da681bacc` ;
- baseline : **29 741** ;
- extension : **1 990** ;
- union : **31 731** ;
- `robots_checked=true` ;
- `detail_pages_opened=0` ;
- aucune écriture DB/production dans le run source.

Extension first-party :
- `bureaux-et-commerces-a-vendre` : **710 IDs** ;
- `bureaux-et-commerces-a-louer` : **1 280 IDs**.

Parmi ces **1 990** IDs :
- **1 222** appartiennent ensuite au full sweep `current_verified` ;
- **768** restent `historical_unverified`.

Répartition des 768 historiques :
- vente : **189** ;
- location : **579**.

Les 768 lignes portent une preuve de surface first-party. Un plancher prudent **58/100, H_C** est appliqué sans réduire une preuve supérieure :
- **767** ont été relevées jusqu'au plancher lorsque nécessaire ;
- **1** était déjà à **69** et conserve sa note ;
- **4** possèdent une `active_detail_source` plus forte et conservent cette classe principale ;
- **764** utilisent donc `recent_category_surface` comme classe principale.

---

## V2.2 — fermeture de la provenance classique 29 741

Le parent exact du baseline a été remonté dans l'ancienne lane `feat/data-ingestion-canonical`.

### Preuve parent
Run GitHub Actions : **33899083917**

Artifact : **9947122701** — `lot9-live-campaign-final-classic-extinction-proof`

Digest :
`sha256:1b27ba2946bd671644e6ec1bf03a396df6c86a51706f5a17265466d041a0cb6d`

État source certifié :
- `run_id = mubawab-full-coverage-2026-09-04T15-31-17-539Z` ;
- preuve finale générée le `2026-09-04T17:16:19.197Z` ;
- **29 741 IDs uniques** ;
- **74 waves** cumulées ;
- **423 partitions** ;
- **1 124** pages demandées ;
- **1 123** pages réussies ;
- **33 812** références observées ;
- **4 071** doublons de référence absorbés ;
- `robots_checked=true` ;
- `detail_pages_opened=0` ;
- `database_writes=0` ;
- `production_writes=0` ;
- `image_downloads=0`.

Le fichier source `refs.jsonl` de cet artifact contient exactement **29 741 lignes / 29 741 IDs uniques**. Chaque observation conserve notamment :
- `source_id` ;
- `url` de représentation ;
- `route_url` Mubawab first-party ;
- `partition_id` ;
- `page` ;
- `detail_family`.

Exemple de sémantique certifiée : une partition comme `casablanca:apartment_sale:p1-3` correspond à une observation issue de la route first-party Casablanca / appartements / vente. La provenance n'est donc plus un nombre agrégé opaque : elle existe annonce par annonce dans l'artifact parent.

### Réconciliation exacte
Le croisement de l'artifact classique avec le full sweep courant donne :
- baseline classique : **29 741** ;
- classiques encore dans le sweep courant : **11 534** ;
- historiques issus du classique : **18 207**.

L'extension bureaux/commerces apporte séparément :
- historiques office/commercial : **768**.

Les deux résiduels sont disjoints :

`18 207 + 768 = 18 975 historiques`

Chevauchement classic-historical / office-historical : **0**.

### Ventilation exacte des 18 207 historiques classiques
Transactions :
- vente : **10 408** ;
- location : **7 799**.

Types :
- appartements : **9 079** ;
- villas : **4 559** ;
- locaux/commerces : **1 790** ;
- terrains : **1 667** ;
- riads : **665** ;
- maisons : **447**.

Scopes :
- `apartment_rent` : **5 014** ;
- `apartment_sale` : **4 065** ;
- `villa_sale` : **2 735** ;
- `villa_rent` : **1 824** ;
- `land_sale` : **1 667** ;
- `commercial_rent` : **945** ;
- `commercial_sale` : **845** ;
- `riad_sale` : **665** ;
- `house_sale` : **431** ;
- `house_rent` : **16**.

Villes :
- Marrakech : **5 709** ;
- Casablanca : **4 055** ;
- Tanger : **2 302** ;
- Rabat : **2 233** ;
- Bouskoura : **1 499** ;
- Dar Bouazza : **1 382** ;
- Agadir : **345** ;
- Kénitra : **218** ;
- Salé : **141** ;
- Fès : **122** ;
- Mohammedia : **114** ;
- Temara : **87**.

En ajoutant les 768 historiques bureaux/commerces, le corpus historique complet se répartit par transaction en :
- vente : **10 597** ;
- location : **8 378**.

### Scoring V2.2
Les **16 476** lignes qui restaient `catalog_only` possèdent en réalité cette preuve parent first-party classique.

Elles reçoivent :
- `score=58` ;
- `quality_class=H_C` ;
- `evidence_class=recent_classic_route_surface` ;
- `rank_lane=historical_tail` inchangé ;
- `public_status=internal_only` inchangé ;
- `freshness_status=uncertain` inchangé ;
- `evidence_status=historical_unverified` inchangé.

Le lineage artifact/run est persisté dans `metadata.classic_catalog_evidence` sur ces lignes.

La correspondance détaillée `source_id -> route_url / partition / page / detail_family` est certifiée dans `refs.jsonl`. Le bulk V2.2 ne prétend pas avoir recopié tous ces champs détaillés dans chaque ligne DB : cette matérialisation fine reste un enrichissement séparé. Le score V2.2 repose uniquement sur la provenance parent effectivement prouvée.

Résultat : **`catalog_only = 0`**.

---

## Distribution certifiée V2.2
- `fresh_reconfirmed` / H_A : **8** — score **81–89** ;
- `fresh_reconfirmed` / H_B : **74** — score **65–79** ;
- `active_detail_source` / H_B : **16** — score **62–69** ;
- `active_detail_source` / H_C : **34** — score **48–59** ;
- `recent_classic_route_surface` / H_C : **16 476** — score **58** ;
- `recent_category_surface` / H_C : **764** — score **58** ;
- `accepted_discovery` / H_C : **10** — score **49–54** ;
- `seed_only` / H_D : **1 573** — score **23–32** ;
- `unclassified_discovery` / H_D : **4** — score **22–25** ;
- `unclassified_discovery` / H_E : **11** — score **18** ;
- `rejected_discovery` / H_F : **5** — score **3**.

Total : **18 975 / 18 975**.

`catalog_only` : **0**.

---

## Doctrine de scoring
Le score mesure la force de la preuve historique et la qualité de représentation disponible. Il ne transforme pas une annonce historique en annonce actuelle et ne donne aucun droit de publication.

Une observation first-party de route Mubawab le 4 septembre est une preuve de présence historique récente et structurée, pas une preuve qu'une fiche est encore active au moment présent.

Ordre qualitatif conservé :
- réconfirmation fraîche / fiche détail active structurée : preuve supérieure ;
- surface first-party récente et qualifiée : **H_C / plancher 58** ;
- discovery / seed : niveaux inférieurs ;
- preuve rejetée : niveau le plus faible.

Aucune note supérieure n'est abaissée par l'ajout d'une preuve de surface.

## Garde-fous
- `internal_quality_v2` ne remplace ni `freshness_status`, ni `evidence_status`, ni `source_policy_registry` ;
- une preuve de surface ne transforme pas automatiquement un historique en `current_verified` ;
- les historiques restent `historical_tail` ;
- la policy Mubawab reste indépendante du score ;
- aucune publication publique supplémentaire n'est ouverte ;
- aucune annonce n'est déclarée active uniquement parce qu'elle a été observée le 4 septembre ;
- aucune variation artificielle n'est créée sans différence de preuve.

## État certifié final V2.2
- corpus Mubawab total : **37 420** ;
- `current_verified` : **18 445** ;
- `historical_unverified` : **18 975** ;
- historiques avec `internal_quality_v2` : **18 975 / 18 975** ;
- historiques `freshness_status=uncertain` : **18 975 / 18 975** ;
- historiques `public_status=internal_only` : **18 975 / 18 975** ;
- historiques `rank_lane=historical_tail` : **18 975 / 18 975** ;
- historiques `catalog_only` : **0** ;
- lignes `current_verified` portant par erreur V2 : **0** ;
- changements de `evidence_status` provoqués par V2.2 : **0** ;
- changements de `freshness_status` provoqués par V2.2 : **0** ;
- publications provoquées par V2.2 : **0**.
