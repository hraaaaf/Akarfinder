# AKARFINDER — MUBAWAB HISTORICAL EVIDENCE SCORING V2

## Goal
Remplacer le score uniforme des 18 975 lignes `historical_unverified` par une note interne individuelle fondée uniquement sur des preuves effectivement présentes dans le moteur AkarFinder, sans inventer de variation lorsqu'aucune preuve supplémentaire ne distingue deux annonces.

## Succès
- `metadata.internal_quality_v2` présent sur **18 975 / 18 975** historiques.
- aucune ligne `current_verified` ne reçoit `internal_quality_v2`.
- `rank_lane=historical_tail` sur **18 975 / 18 975**.
- `public_status=internal_only` sur **18 975 / 18 975**.
- `freshness_status` historique reste `uncertain` sur **18 975 / 18 975**.
- `evidence_status` reste `historical_unverified`.
- aucun changement de policy source, aucune publication, aucun merge, aucun déploiement Vercel.

## Preuves utilisées
Le score V2 combine uniquement :
- réobservation dans `source_offer_seeds` et son `freshness_status` ;
- nombre de réobservations et nombre de providers indépendants ;
- dernière date de preuve réellement observée ;
- `thin_index_search_documents.quality_score` et `quality_tier` lorsqu'ils existent ;
- présence d'une `listing_source` Mubawab `canonical_kind=detail`, `canonical_eligible=true`, `is_active=true` ;
- observations structurées liées : titre fingerprint, surface, prix ;
- `discovery_candidates` : statut accepted / unclassified / rejected, rang et date de dernière observation.

`updated_at` du corpus n'est pas utilisé comme preuve de fraîcheur : il a été modifié par des opérations de scoring antérieures. Le V2 n'a pas modifié `updated_at`.

## Inventaire des preuves secondaires
Sur **18 975** historiques :
- **1 778** IDs ont une trace dans `source_offer_seeds` / thin-index ;
- **130** IDs ont une trace dans `discovery_candidates` ;
- **53** IDs ont déjà une `listing_source` Mubawab ;
- **1 838** IDs disposent d'au moins une preuve secondaire dans ces familles ;
- **17 137** restent `catalog_only`, sans seconde preuve actuellement stockée.

Les 53 `listing_sources` historiques trouvées sont toutes :
- `canonical_kind=detail` ;
- `canonical_eligible=true` ;
- `is_active=true`.

Parmi elles, **52 / 53** ont au moins une observation structurée ; **50** ont une observation de prix, **52** une surface et **52** un fingerprint titre.

## Distribution certifiée V2
- `fresh_reconfirmed` : **82** — score **65–89**, moyenne **76,0** ;
- `active_detail_source` : **50** — score **48–69**, moyenne **54,9** ;
- `accepted_discovery` : **10** — score **49–54**, moyenne **51,0** ;
- `seed_only` : **1 676** — score **23–32**, moyenne **25,8** ;
- `unclassified_discovery` : **15** — score **18–25**, moyenne **19,5** ;
- `catalog_only` : **17 137** — score **5** ;
- `rejected_discovery` : **5** — score **3**.

Total : **18 975 / 18 975**.

## Doctrine de scoring
Le score mesure la force de la preuve historique et la qualité de la représentation disponible. Il ne transforme pas une annonce historique en annonce actuelle et ne donne aucun droit de publication.

Base par preuve principale :
- `fresh_reconfirmed` : 50 ;
- source détail active : 40 ;
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
Un contrôle exact-ID via moteur de recherche public a été effectué sur huit IDs `catalog_only` :
- 5648088
- 5793170
- 6029005
- 6068741
- 6133672
- 6149331
- 6156168
- 6160306

Les résultats renvoyés n'ont fourni aucune page détail exacte correspondant à ces IDs ; seulement des pages génériques Mubawab. Ce spot-check ne prouve pas que les 17 137 IDs n'existent plus, mais il ne fournit aucune raison légitime de relever leur note aujourd'hui.

## Garde-fous
- `catalog_only` n'est pas synonyme de faux ou supprimé : cela signifie seulement absence de seconde preuve disponible.
- aucune variation artificielle n'est créée entre deux lignes portant exactement les mêmes preuves.
- `internal_quality_v2` ne remplace ni `freshness_status`, ni `evidence_status`, ni `source_policy_registry`.
- les historiques restent `historical_tail` tant qu'une étape séparée de reclassification n'apporte pas une preuve suffisante.
- la policy Mubawab reste indépendante de ce score et doit toujours être respectée.

## État certifié
- corpus Mubawab total : **37 420** ;
- `current_verified` avec V1 : **18 445 / 18 445** ;
- historiques avec V2 : **18 975 / 18 975** ;
- lignes `current_verified` portant par erreur V2 : **0** ;
- historiques hors `historical_tail` : **0** ;
- historiques publiés par cette opération : **0**.
