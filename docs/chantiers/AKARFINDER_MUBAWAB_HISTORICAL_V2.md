# AKARFINDER — MUBAWAB HISTORICAL EVIDENCE SCORING V2

## Goal
Remplacer le score uniforme des 18 975 lignes `historical_unverified` par une note interne individuelle fondée uniquement sur des preuves effectivement présentes ou récupérées depuis les artifacts certifiés AkarFinder, sans inventer de variation lorsqu'aucune preuve supplémentaire ne distingue deux annonces.

## Succès
- `metadata.internal_quality_v2` présent sur **18 975 / 18 975** historiques.
- aucune ligne `current_verified` ne reçoit `internal_quality_v2`.
- `rank_lane=historical_tail` sur **18 975 / 18 975**.
- `public_status=internal_only` sur **18 975 / 18 975**.
- `freshness_status` historique reste `uncertain` sur **18 975 / 18 975**.
- `evidence_status` reste `historical_unverified`.
- aucun changement de policy source, aucune publication, aucun merge, aucun déploiement Vercel.

## Provenance historique certifiée
Les **18 975** lignes historiques portent toutes `metadata.source_artifact = 9949834432`.

L'artifact `9949834432` certifie une campagne catalogue Mubawab du **4 septembre 2026** :
- baseline : **29 741 IDs** ;
- ajout bureaux/commerces : **1 990 IDs** ;
- union catalogue : **31 731 IDs** ;
- `robots_checked=true` ;
- `detail_pages_opened=0` ;
- aucune écriture DB/production dans le run source.

Les 1 990 IDs ajoutés sont répartis sur deux surfaces first-party :
- `bureaux-et-commerces-a-vendre` : **710 IDs** ;
- `bureaux-et-commerces-a-louer` : **1 280 IDs**.

Le full sweep courant contient 18 445 IDs, dont **12 756** recoupent cette union catalogue. Le résiduel exact est donc :

`31 731 - 12 756 = 18 975 historiques`.

Cette provenance remplace l'hypothèse antérieure selon laquelle le stock historique aurait été créé principalement depuis des datasets GitHub publics. Ces datasets restent utilisables comme preuves secondaires indépendantes, mais ne sont pas la provenance primaire de ces 18 975 lignes.

## Preuves utilisées
Le score V2 combine uniquement :
- réobservation dans `source_offer_seeds` et son `freshness_status` ;
- nombre de réobservations et nombre de providers indépendants ;
- dernière date de preuve réellement observée ;
- `thin_index_search_documents.quality_score` et `quality_tier` lorsqu'ils existent ;
- présence d'une `listing_source` Mubawab `canonical_kind=detail`, `canonical_eligible=true`, `is_active=true` ;
- observations structurées liées : titre fingerprint, surface, prix ;
- `discovery_candidates` : statut accepted / unclassified / rejected, rang et date de dernière observation ;
- réobservation first-party dans les surfaces catalogue certifiées de l'artifact `9949834432`.

`updated_at` du corpus n'est pas utilisé comme preuve de fraîcheur : il a été modifié par des opérations de scoring antérieures.

## Passe V2.1 — récupération des surfaces bureaux/commerces
Parmi les **1 990 IDs** observés directement le 4 septembre sur les deux surfaces catalogue :
- **1 222** appartiennent ensuite au full sweep `current_verified` ;
- **768** appartiennent au résiduel `historical_unverified`.

Répartition des 768 historiques :
- **189 vente** ;
- **579 location**.

Ces 768 lignes reçoivent `metadata.historical_surface_evidence_v1` avec :
- artifact `9949834432` ;
- source `mubawab` ;
- surface exacte ;
- `transaction_type=sale|rent` ;
- `property_family=office_commercial` ;
- date d'observation du run ;
- `robots_checked=true` ;
- `detail_pages_opened=0`.

Doctrine de score : une réobservation récente sur une surface first-party Mubawab est plus forte qu'un simple seed/discovery, mais reste sous une fiche détail active/reconfirmée. Un plancher prudent **58/100, H_C** est donc appliqué sans jamais réduire une note supérieure.

Résultat :
- **768 / 768** portent la nouvelle preuve de surface ;
- **767** ont été relevées jusqu'au plancher lorsque nécessaire ;
- la 768e avait déjà **69/100** et conserve sa note supérieure ;
- **4** de ces 768 ont également une `active_detail_source` ; cette classe plus forte reste leur preuve principale ;
- **661** lignes quittent effectivement `catalog_only` ;
- **107** avaient déjà une autre preuve secondaire et sont seulement enrichies.

## Inventaire des preuves secondaires après V2.1
Sur **18 975** historiques :
- **2 499** disposent désormais d'au moins une preuve secondaire ou d'une preuve catalogue first-party qualifiée ;
- **16 476** restent `catalog_only`, sans seconde preuve actuellement exploitable.

Les `listing_sources` historiques qualifiées restent des pages détail `canonical_eligible=true` et `is_active=true` ; leur classe principale n'est pas dégradée par la preuve catalogue additionnelle.

## Distribution certifiée V2.1
- `fresh_reconfirmed` : **82** — score **65–89** ;
- `active_detail_source` : **50** — score **48–69** ;
- `recent_category_surface` : **764** — score **58** ;
- `accepted_discovery` : **10** — score **49–54** ;
- `seed_only` : **1 573** — score **23–32** ;
- `unclassified_discovery` : **15** — score **18–25** ;
- `catalog_only` : **16 476** — score **5** ;
- `rejected_discovery` : **5** — score **3**.

Total : **18 975 / 18 975**.

Note : 768 lignes portent la preuve de surface, mais seulement 764 utilisent `recent_category_surface` comme classe principale, car 4 possèdent une preuve détail plus forte.

## Doctrine de scoring
Le score mesure la force de la preuve historique et la qualité de la représentation disponible. Il ne transforme pas une annonce historique en annonce actuelle et ne donne aucun droit de publication.

Base par preuve principale :
- `fresh_reconfirmed` : 50 ;
- source détail active : 40 ;
- surface first-party récente et qualifiée : plancher 58 après contributions implicites de récence + catégorie/transaction ;
- discovery acceptée : 30 ;
- seed aging : 25 ;
- `seed_only` : 20 ;
- discovery non classée : 15 ;
- discovery rejetée : 5 ;
- `catalog_only` : 5.

Contributions additionnelles bornées :
- qualité thin-index : jusqu'à +20 ;
- répétition d'observation : jusqu'à +10 ;
- récence réelle de la dernière preuve : +10 / +7 / +3 selon fenêtre ;
- source détail active : +8 ;
- titre structuré : +3 ;
- surface structurée : +3 ;
- prix structuré : +4 ;
- discovery acceptée : +4 ;
- discovery rejetée sans preuve supérieure : pénalité -5.

Score final borné entre 0 et 99.

## Contrôle externe spot-check
Un contrôle exact-ID via moteur de recherche public a été effectué sur huit IDs alors `catalog_only` :
- 5648088
- 5793170
- 6029005
- 6068741
- 6133672
- 6149331
- 6156168
- 6160306

Les résultats n'ont fourni aucune page détail exacte correspondant à ces IDs ; seulement des pages génériques Mubawab. Ce spot-check ne prouve pas que les IDs n'existent plus et ne justifie aucune démotion supplémentaire.

## Garde-fous
- `catalog_only` n'est pas synonyme de faux ou supprimé : cela signifie seulement absence de seconde preuve disponible.
- aucune variation artificielle n'est créée entre deux lignes portant exactement les mêmes preuves.
- `internal_quality_v2` ne remplace ni `freshness_status`, ni `evidence_status`, ni `source_policy_registry`.
- une preuve de surface catalogue ne transforme pas automatiquement un historique en `current_verified`.
- les historiques restent `historical_tail` tant qu'une étape séparée de reclassification n'apporte pas une preuve suffisante.
- la policy Mubawab reste indépendante de ce score et doit toujours être respectée.

## État certifié
- corpus Mubawab total : **37 420** ;
- `current_verified` : **18 445 / 18 445** ;
- historiques avec V2 : **18 975 / 18 975** ;
- historiques avec preuve first-party bureaux/commerces V2.1 : **768 / 768** ;
- historiques `catalog_only` restant à investiguer : **16 476** ;
- lignes historiques ayant changé de `evidence_status` : **0** ;
- lignes historiques ayant changé de `freshness_status` : **0** ;
- historiques publiés par cette opération : **0**.
