# AKARFINDER DATA ENGINE

## Goal
Construire un moteur de données immobilier interne capable de maximiser le corpus multi-sources, mesurer la fraîcheur, enrichir les annonces, dédupliquer les biens et promouvoir seulement les représentations suffisamment fiables vers la recherche publique AkarFinder.

## État vérifié — handover 2026-09-06

### Corpus Mubawab
- corpus interne total : **37 420 IDs uniques**
- `current_verified` : **18 445**
- `historical_unverified` : **18 975**
- manifest robots-safe certifié : **3 174 / 3 174 shards**
- aucune suppression destructive du corpus historique

### V2.3 — Provenance historique Mubawab
**TERMINÉ + CERTIFIÉ**

Les **18 975 / 18 975** lignes `historical_unverified` disposent désormais d'une provenance first-party exploitable en interne, sans reclassification artificielle de fraîcheur :
- historiques classiques : **18 207** avec `metadata.classic_catalog_evidence.provenance_version=mubawab-historical-classic-provenance-v2.3`
- historiques office/category : **768** avec `metadata.historical_surface_evidence_v1`
- chevauchement classic / office : **0**
- union des deux familles : **18 975 / 18 975**
- historique sans provenance : **0**
- classiques avec ville/type/transaction/route manquants : **0**
- classiques sous le plancher interne **58** : **0**

Pour les **18 207** historiques classiques, le sidecar V2.3 matérialise annonce par annonce :
- ville
- famille de bien
- transaction vente/location
- route catalogue Mubawab exacte
- run/artifact/digest source
- fenêtre d'observation
- `robots_checked=true`
- `detail_pages_opened=0`
- `database_writes_in_source_campaign=0`
- `production_writes_in_source_campaign=0`

Preuve source certifiée :
- run GitHub : **33899083917**
- artifact : **9947122701** — `lot9-live-campaign-final-classic-extinction-proof`
- digest : `sha256:1b27ba2946bd671644e6ec1bf03a396df6c86a51706f5a17265466d041a0cb6d`
- `refs.jsonl` : **29 741 IDs uniques**
- campagne source : **0 page détail ouverte, 0 écriture DB, 0 écriture production**

Garde-fous certifiés après V2.3 sur les **18 975** historiques :
- `evidence_status=historical_unverified` conservé
- `freshness_status=uncertain` conservé : dérive **0**
- `metadata.internal_quality_v2.public_status=internal_only` : dérive **0**
- `metadata.internal_quality_v2.rank_lane=historical_tail` : dérive **0**
- aucune publication publique ouverte
- aucun merge
- aucun déploiement Vercel

Important : une observation récente sur une route catalogue first-party améliore la **provenance et la confiance interne**, mais ne constitue pas à elle seule une preuve qu'une page détail individuelle est encore active. Les historiques restent donc `historical_unverified` et `uncertain` tant qu'une preuve plus forte n'existe pas.

### P1 — Freshness Engine
**TERMINÉ**

Distribution certifiée :
- score 100 : **12 149**
- score 95 : **6 160**
- score 90 : **136**
- score 40 : **18 975**

Le corpus complet est scoré et explicable. Les historiques restent conservés comme matière interne.

### P2 — Enrichissement Mubawab
**TERMINÉ pour le lot actuel**

Sur les **18 445** lignes `current_verified` :
- route enrichment : **18 445 / 18 445 = 100 %**
- titre : **17 702 / 18 445 = 96,0 %**
- prix connu : **12 584 / 18 445 = 68,22 %**
- surface : **15 012 / 18 445 = 81,4 %**

Statut prix explicite sur **18 445 / 18 445** :
- `known` : **12 584**
- `not_observed_on_card` : **4 058**
- `not_disclosed` : **1 271**
- `no_card_observation` : **468**
- `ambiguous` : **62**
- `rejected_evidence` : **2**

Aucun prix n'est inventé. Les prix EUR/USD conservés le sont dans leur devise native sans conversion arbitraire.

### Canonical Hygiene Mubawab
**CLASSIFICATION + QUARANTAINE PHYSIQUE TERMINÉES**

Classification initiale `listing_sources` : **1 286**
- vraies pages détail : **481**, `canonical_eligible=true`
- `/is/` search : **663**, `canonical_eligible=false`
- legacy search surfaces : **123**, `canonical_eligible=false`
- safe shards : **12**, `canonical_eligible=false`
- project pages : **6**, `canonical_eligible=false`
- autre non-individuel : **1**, `canonical_eligible=false`

Total non individuel initial : **805**.

État live vérifié après verrouillage et après P3/P4 :
- sources Mubawab non détail actives : **0**
- trigger de quarantaine `listing_sources` présent : **oui**
- trigger de protection `thin_index_search_documents` présent : **oui**
- aucune mauvaise surface search réactivée par P3/P4

Test de non-régression DB : tentative transactionnelle de réactiver une source quarantinée avec `is_active=true` => valeur retournée **false** ; transaction annulée ensuite. Le verrou empêche donc la réactivation par une ingestion legacy.

Commits de fermeture :
- `80f3670f426f2a563f65b953ea807d7cac054239` — `db(data): enforce Mubawab canonical quarantine`
- `31120707c9ab0320362d070066c581a854408cbd` — `db(data): lock Mubawab quarantine against reactivation`

Migration live appliquée : `lock_mubawab_source_quarantine_v1`.

### P3 — Promotion vers `property_listings`
**NOYAU STRICT TERMINÉ + RÉSIDU SCORÉ EN INTERNE**

Baseline avant P3 :
- `property_listings` : **7 928**
- `listing_sources` Mubawab : **1 286**

État après P3 :
- `property_listings` : **19 609**
- `listing_sources` Mubawab : **12 967**
- nouvelles promotions déterministes Mubawab : **11 681**
- nouvelles sources Mubawab liées : **11 681**
- orphelins P3 : **0**
- sources P3 inactives / inéligibles / non-détail : **0**
- titres `%XX` encore encodés parmi les promotions P3 : **0**
- IDs `current_verified` désormais représentés par au moins une source Mubawab détail : **11 833 / 18 445**

Gate strict observé : **11 781** candidats :
- **11 681** nouvelles promotions déterministes
- **97** étaient déjà représentés dans `listing_sources`
- **3** titres décodés > 240 caractères exclus par prudence

Donc **11 778 / 11 781** candidats du gate strict sont représentés ; les 3 exclus restent internes.

Règles P3 appliquées :
- fraîcheur `>= 90`
- état `fresh_confirmed` ou `likely_active`
- URL Mubawab détail `/a/<id>`
- ville `unique`
- transaction `unique`
- type de bien `unique`
- titre `unique`
- aucun conflit critique
- prix canonique en MAD uniquement quand la devise native observée est MAD ; aucune conversion arbitraire
- empreinte déterministe : SHA-256 de `mubawab:<source_listing_id>`
- `source_offer_key = source_listing_id`
- source créée en `canonical_kind=detail`, `canonical_eligible=true`

Qualité titre :
- **9 461** titres strictement qualifiés provenaient du slug canonique avec percent-encoding
- décodage UTF-8 déterministe effectué
- **0** séquence `%XX` résiduelle après décodage
- **3** titres > 240 caractères non promus

Incident d'exécution P3-A :
- une première CTE data-modifying a inséré **2 309** `property_listings` mais **0** `listing_sources`, à cause du snapshot PostgreSQL entre CTE sœurs
- incident détecté immédiatement
- réparation atomique : **2 309 / 2 309** sources créées ensuite
- certification finale : **0 orphelin**
- les lots suivants ont utilisé `INSERT ... RETURNING` comme relation source de la CTE suivante afin d'éviter cette classe d'erreur

#### P3-C — score interne des annonces douteuses
Nouvelle doctrine : **douteux ≠ supprimé**. Les candidats incertains restent dans le corpus et reçoivent une note interne plus faible afin de former une future `tail` de ranking, sans les présenter artificiellement comme fiables.

`metadata.internal_quality_v1` est désormais renseigné sur **18 445 / 18 445** lignes `current_verified` :
- `S_strict` : **11 781** — score **80–99**, moyenne **93,9** — `rank_lane=primary_candidate`
- `A_type_conflict_only` : **4 650** — score **40–49**, moyenne **47,1** — `rank_lane=tail`
- `B_type_unresolved` : **1 147** — score **30–39**, moyenne **37,1** — `rank_lane=tail`
- `C_city_uncertain` : **124** — score **20–29**, moyenne **26,3** — `rank_lane=tail`
- `D_title_uncertain` : **743** — score **10–19**, moyenne **15,0** — `rank_lane=tail`

Le score est explicable par les statuts ville / transaction / type / titre, puis par la présence du prix et de la surface. Il est stocké avec `public_status=internal_only` et ne remplace ni `reliability_score` public ni le registre de policy source.

Résidu non représenté après P3 strict : **6 612** lignes `current_verified` :
- **5 869** disposent encore d'une vraie URL Mubawab détail sûre et restent techniquement exploitables comme matière interne
- **743** ont un titre / une représentation canonique insuffisante et ne disposent pas d'une URL détail sûre pour une éventuelle sortie

Le registre live `source_policy_registry` garde `mubawab.ma` en `authorization_status=prohibited` avec politique `canonical_link_only`. Aucun score interne ne contourne ce garde-fou : **aucune publication publique supplémentaire n'a été ouverte**.

### P4 — Déduplication inter-portails
**EN COURS — CLUSTERING MULTI-PORTAIL RÉEL OUVERT**

Baseline P4 :
- biens canoniques déjà reliés à plusieurs portails : **0**
- `property_clusters` : **7 789**
- `property_cluster_members` : **7 789**
- clusters multi-membres : **0**
- clusters multi-portails : **0**
- tous les clusters existants étaient donc des projections 1:1
- lignes avec `duplicate_group_id` préexistantes : **82**
- groupes `duplicate_group_id` préexistants : **54**
- groupes multi-lignes préexistants : **14**

Audit shadow Mubawab vs autres portails, à ville/type/transaction cohérents et avec garde-fous prix/surface lorsqu'ils sont disponibles :
- paires préfiltrées : **161 271**
- similarité titre `>= 0,70` : **133**
- `>= 0,80` : **37**
- `>= 0,90` : **8**
- paires `>= 0,80` disposant simultanément du prix et de la surface des deux côtés : **0**

Conclusion : un seuil titre seul est insuffisant. Exemple de faux positif observé : une fiche générique `Terrain titré à vendre` d'un portail correspondait à deux annonces Mubawab distinctes. Aucune fusion automatique globale n'est donc autorisée sur ce seul signal.

#### P4-A — marquage legacy non destructif
Trois premières paires cross-postées très fortement confirmées ont reçu un `duplicate_group_id`, sans suppression ni déplacement :
- `p4v1_lisf_mhamid_8214447` — listings **8126 + 29434** — score titre **1,000000** — même maison Mhamid, même surface 97 m²
- `p4v1_lisf_majorelle_8349003` — listings **2071 + 33044** — score titre **0,916667** — même appartement Majorelle, même surface 87 m²
- `p4v1_lisf_souihla_8164127` — listings **3840 + 28959** — score titre **0,901639** — même villa Souihla au libellé très spécifique

Ce marquage a servi de preuve intermédiaire mais **`duplicate_group_id` n'est pas la sortie canonique P4**.

#### P4-B — modèle canonique `property_clusters`
Le modèle déjà présent en base est la vraie sortie :
- `property_clusters`
- `property_cluster_members`
- un membre pointe directement vers un `listing_sources.id`
- `origin_type=manual_review` est supporté nativement

Vérification d'impact avant écriture :
- aucune vue de recherche ne consomme les memberships de clusters
- la seule vue DB trouvée utilisant `property_clusters` est `acquisition_scale_metrics_v1`, uniquement pour compter les clusters
- aucune suppression de `property_listings` n'est nécessaire
- aucune réaffectation de FK utilisateur n'est nécessaire

Six clusters 1:1 existants ont été convertis en **clusters multi-portails réels** par ajout du membre Mubawab vérifié, sans déplacer le membre externe :
1. Mhamid — `limmobiliersansfrontieres` + Mubawab — listings **8126 + 29434**
2. Majorelle — `limmobiliersansfrontieres` + Mubawab — listings **2071 + 33044**
3. Souihla / villa meublée puits — `limmobiliersansfrontieres` + Mubawab — listings **3840 + 28959**
4. Souihla km16 / 1 hectare — `limmobiliersansfrontieres` + Mubawab — listings **3831 + 28513**
5. Prestigia / appartement meublé — `limmobiliersansfrontieres` + Mubawab — listings **1061 + 34063**
6. Massira / appartement meublé 170 m² — `limmobiliersansfrontieres` + Mubawab — listings **2072 + 29860**

État certifié après P4-B :
- `property_clusters` : **7 789**
- `property_cluster_members` : **7 795**
- clusters multi-membres : **6**
- clusters multi-portails : **6**
- clusters `manual_review` : **6**
- source offers présentes dans plusieurs clusters : **0**
- aucune `property_listing` supprimée
- aucune `listing_source` supprimée ou déplacée
- aucune FK utilisateur touchée
- aucun déploiement public déclenché

Une paire Route d'Amizmiz a été explicitement **retenue hors cluster** malgré une forte similarité de titre : notre snapshot canonique portait un prix incohérent avec la page publique recoupée et une surface manquante. Le conflit doit être résolu avant regroupement.

P4 reste en cours :
- élargir les clusters uniquement sur preuves croisées fortes
- mesurer la précision sur échantillon annoté
- connecter ensuite le ranking/recherche aux clusters afin de réduire les doublons visibles sans supprimer la mémoire source

### État GitHub / livraison
- branche : `feat/mubawab-full-enumeration`
- PR : **#997 OPEN + READY FOR REVIEW**
- merge : **NON**
- déploiement Vercel : **NON**
- V2.3 historique : **18 975 / 18 975 avec provenance interne certifiée**
- P3 : **noyau strict exécuté + 18 445 current_verified scorés en interne**
- P4 : **6 clusters multi-portails réels, non destructifs**

Dernier état CI certifié avant les mises à jour documentaires P3/P4/V2.3, sur `5794024bd7bcdbd4a9e92a45c25b42642970262d` :
- CI Workflow Efficiency Policy : **SUCCESS**
- Phase 1 P0 Closure Gate : **SUCCESS**
- Phase 1 P1 Final Sweep Gate : **SUCCESS**
- Phase 1 P2 Residual Closure Gate : **SUCCESS**
- Canonical Baseline Validation : **SUCCESS**
- Canonical Baseline Compile Validation : **SUCCESS**
- UX Gate 0 Contracts : **SUCCESS**

Toute nouvelle CI déclenchée par les mises à jour de ce fichier doit être observée avant d'être déclarée verte.

---

## P1 — Freshness Engine

### Goal
Attribuer à 100 % du corpus un score interne de fraîcheur et un état explicable.

### Signaux
- dernière observation
- fréquence de réapparition
- présence dans les sweeps récents
- source de confirmation
- stabilité URL / source ID
- ancienneté historique
- signaux de disparition / expiration

### Sortie
- `fresh_confirmed`
- `likely_active`
- `uncertain`
- `stale`
- `archive`
- score interne `0..100`

### Succès
- 100 % des 37 420 Mubawab scorés
- aucune annonce supprimée uniquement faute de preuve récente
- score explicable par signaux stockés

### Preuve
- distribution des scores
- tests unitaires des règles
- échantillons manuels par classe

---

## P2 — Enrichissement

### Goal
Transformer les IDs bruts en fiches exploitables sans inventer les champs absents.

### Champs cibles
- titre
- ville
- quartier
- prix
- surface
- type de bien
- transaction
- chambres / pièces
- URL canonique
- photos / métadonnées autorisées
- source
- première / dernière observation

### Succès
- couverture mesurée champ par champ
- ≥ 90 % des candidats promouvables avec le minimum requis

### Preuve
- rapport de couverture
- taux de null par champ
- échantillons de validation

---

## P3 — Promotion vers `property_listings`

### Statut
**NOYAU STRICT TERMINÉ ; résidu ambigu conservé et scoré en interne.** Une ambiguïté ne provoque plus une suppression logique du corpus.

### Goal
Promouvoir progressivement les candidats suffisamment fiables vers le modèle canonique tout en conservant les autres comme `tail` interne scorée.

### Gates
- score fraîcheur minimum
- données minimales présentes
- URL ou représentation source sûre
- `canonical_eligible=true` pour toute source individuelle utilisée
- aucune incohérence critique pour le noyau strict
- déduplication source effectuée

### Succès
- promotion idempotente
- aucun doublon source
- aucune baisse de qualité du moteur public
- 100 % des `current_verified` disposent d'un score qualité interne explicable
- les candidats douteux restent sous la bande de score des candidats stricts

### Preuve
- delta avant/après `property_listings`
- relation 1:1 vérifiée entre chaque promotion déterministe et sa `listing_source`
- contrôle de régression sur quarantaine canonique
- distribution `internal_quality_v1` par classe

---

## P4 — Déduplication inter-portails

### Statut
**EN COURS — politique conservatrice.** Six clusters multi-portails réels existent ; aucun regroupement global fondé sur la seule similarité de titre.

### Goal
Reconnaître plusieurs annonces comme représentations d'un même bien.

### Signaux
- localisation
- prix
- surface
- texte
- images si autorisées
- agence / vendeur
- proximité temporelle

### Sortie
`1 property_cluster -> N listing_sources`

### Succès
- réduction mesurable des doublons visibles
- faux positifs contenus par seuil de confiance

### Preuve
- échantillon annoté
- précision / rappel estimés
- groupes suspects audités
- clusters multi-portails certifiés sans perte de données
- consommation sûre des clusters par la recherche/ranking

---

## P5 — Ranking AkarFinder

### Goal
Classer les résultats selon utilité réelle, pas seulement récence.

### Facteurs
- pertinence requête
- fraîcheur
- complétude
- fiabilité source
- précision géographique
- cohérence prix / surface
- duplication
- qualité globale
- `internal_quality_v1.score` comme signal de tail interne, sans jamais contourner la policy source

### Succès
- les meilleurs résultats remontent sans masquer artificiellement les historiques utiles
- à pertinence comparable, les classes douteuses restent derrière les classes strictes

### Preuve
- jeux de requêtes fixes
- comparaison avant/après
- audit manuel top 10

---

## P6 — Archive & Market Memory

### Goal
Exploiter les annonces anciennes comme mémoire immobilière.

### Usages
- historique de prix
- durée probable de commercialisation
- évolution prix/m²
- disparition / réapparition
- comparables historiques
- tendances par quartier / ville

### Succès
- les annonces mortes ne polluent pas la recherche principale mais restent exploitables analytiquement

---

## P7 — Coverage Expansion

### Goal
Maximiser la couverture Mubawab puis reproduire le pipeline sur Avito, Agenz, Sarouty et autres sources autorisées.

### Priorité Mubawab
- expliquer le gap entre le corpus observé et les volumes publics annoncés
- auditer les familles de routes hors manifest actuel
- compléter uniquement via surfaces autorisées et preuves externes légitimes
- ne jamais confondre présence historique et activité actuelle

### Succès
- couverture quantifiée par source
- aucun chiffre promu sans preuve du dénominateur

---

## Ordre d'exécution

1. **Freshness Engine** — terminé
2. **Enrichissement Mubawab** — terminé pour le lot actuel
3. **Canonical Hygiene / quarantine** — terminé et verrouillé
4. **Promotion vers `property_listings`** — noyau strict terminé + tail interne scorée
5. **Déduplication inter-portails** — en cours, 6 clusters multi-portails haute confiance
6. **Ranking AkarFinder** — prochain lot : consommer le score interne et les clusters sans contourner la policy source
7. **Archive & Market Memory** — corpus historique désormais 18 975 / 18 975 avec provenance interne exploitable
8. **Coverage Expansion multi-sources**

---

## Garde-fous

- pas de suppression destructive du corpus historique par défaut
- une annonce douteuse n'est pas supprimée : elle reste matière interne scorée
- pas de publication publique d'un candidat non qualifié
- un score interne ne contourne jamais `source_policy_registry`
- toute source `canonical_eligible=false` doit rester `is_active=false` et non servable
- pas de promotion publique d'un résidu P3 ambigu uniquement parce qu'il possède un score
- pas de fusion P4 fondée sur la seule similarité de titre
- pas de suppression/reparenting destructif pour créer un cluster multi-source
- pas de merge sans autorisation explicite
- pas de déploiement Vercel sans autorisation explicite
- tout lot significatif doit verrouiller : **Goal / Succès / Preuve**
- CI en cours n'arrête pas les travaux sûrs indépendants
- aucune CI `in_progress` ne doit être présentée comme SUCCESS

---

## Cible produit

Construire progressivement :
- **100k+ annonces brutes multi-sources**
- un corpus historique plus large encore
- **50k–80k annonces réellement exploitables** comme cible intermédiaire
- un moteur public propre, scoré, dédupliqué et explicable

Le compteur brut n'est jamais le KPI final. Le KPI utile est : **couverture maximale × fraîcheur × qualité × déduplication**.