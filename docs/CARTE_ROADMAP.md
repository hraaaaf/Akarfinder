# AKARFINDER — ROADMAP D’EXÉCUTION CARTE

**Date : 2026-08-10**  
**Rôle : vue chronologique détaillée de la lane Carte.** `docs/ROADMAP.md` reste la roadmap canonique globale du produit ; ce document détaille uniquement l’enchaînement Carte et doit rester cohérent avec elle.

## État réel au 2026-08-10

Fondations Carte/Geo certifiées : **P1A.1 → P1A.6, P1B.1 → P1B.15**.

Derniers lots Geo :

- **P1B.8 ✅ Geo Authority Evidence Review** — 2 couples Tier A confirmés : Agadir — Hay Mohammadi (5 listings) et Agadir — Dakhla (3 listings).
- **P1B.9 ✅ Tier A Registry Candidate Review** — review read-only, 2 candidats / 8 listings, aucun write.
- **P1B.10 ✅ Tier A Registry Write Design** — design forward/rollback certifié, rehearsal PostgreSQL réel, aucun write production.
- **P1B.11 ✅ Tier A Registry Production Write** — Dakhla + Hay Mohammadi créés dans le Registry avec alias exacts ; Map/SEO OFF ; 0 résolution automatique.
- **P1B.12 ✅ Tier A Resolution Canary** — 8/8 résolutions append-only Agadir (3 Dakhla + 5 Hay Mohammadi), rollback prouvé, aucune collision latest ni conflit historique.
- **P1B.13 ✅ Geo Coverage Recovery Expansion — Oasis micro-chain** — authority/candidate review → Registry design → production write → canary exact **5/5 Oasis**. Après write : **102 / 15 438 listings publics résolus = 0,66 %**, 0 collision latest, 0 conflit historique, 0 canonical geo manquant.
- **P1B.14 ✅ Typed Geometry Coverage** — les **16** géométries Casablanca existantes sont certifiées comme **arrondissements administratifs OSM `admin_level=10`**, topology-auditées et conservées en Shadow. **0 binding polygon quartier certifié**. Maârif arrondissement ≠ automatiquement quartier Maârif ; Oasis reste sans polygon quartier. Choroplèthe quartier OFF.
- **P1B.15 ✅ Geo Certification Gate** — lineage contrôlée 13/13 (8 Agadir + 5 Oasis), 3 Registry targets protégés, intégrité P1B.3 sans collision/conflit/canonical manquant, géométrie fail-closed. PR #462 mergée sur `9856e7a947e0796acef87502c9c13cc45891084c` ; les 4 push gates exact-merge P1B.13/P1B.13A/P1B.13C/P1B.15 sont verts. **P1C Shadow autorisé ; exposition publique et choroplèthe quartier toujours interdits.**

La couche publique **Offre quartier reste OFF**. Le Registry peut contenir une entité ou même avoir `map_eligible=true` sans que cela constitue une preuve de polygon quartier ou une autorisation d’afficher des métriques.

---

# P1C — Intelligence Offre quartier

## P1C.1 — Offre quartier Shadow ✅

PR #463 mergée sur `9c53a99924d6ae577ce099ae5ef58f7f35834a0c`, exact-head CI **22/22 PASS**, puis 4/4 push gates exact-merge verts. Migration production appliquée en **views/functions uniquement**, sans écriture de listing ni mutation Geo.

Contrat :

- **listing Shadow** : provenance de chaque observation, transaction/type, fraîcheur, qualité et source du prix/m² ;
- **summary quartier** : volume observé, vente/location, typologies, fraîcheur, complétude et taille d’échantillon ;
- **segment quartier × transaction** : prix médian, surface médiane et prix/m² ;
- vente et location ne sont jamais mélangées dans les médianes de prix ;
- `normalized_price_m2` est préféré ; sinon dérivation uniquement avec `normalized_price_mad / normalized_surface_m2` lorsque les deux valeurs exactes positives existent ;
- absence de prix = `NULL`, jamais imputée ;
- `metric_state=shadow`, `reliability_certified=false`, `public_activation=false`, `metric_layers_activated=false` ;
- ACL : `anon` et `authenticated` sans SELECT/EXECUTE ; `service_role` uniquement pour la consommation interne.

### Rapport production P1C.1

- **102 / 102** listings Geo résolus dans Shadow ;
- **18 quartiers** ;
- **32 segments quartier × transaction** ;
- prix disponibles : **9 / 102 = 8,82 %** ;
- surface disponible : **84 / 102 = 82,35 %** ;
- prix/m² disponible : **6 / 102 = 5,88 %** ;
- **71** `fresh_confirmed`, **31** `seed_only` ;
- 0 collision Geo latest ;
- 0 conflit historique ;
- 0 canonical geo manquant ;
- public/reliability/metric layers toujours OFF.

Le résultat P1C.1 démontre que la couche Shadow fonctionne, mais aussi que la couverture prix est trop faible pour publier des médianes sans moteur de fiabilité.

---

## P1C.2 — Reliability Engine ✅

PR #464 mergée sur `9f158648892e2412338cd736c7112a1720bb7dae`, exact-head CI **23/23 PASS**. Le push gate P1C.1 a ensuite révélé un timeout structurel du vieux RPC global P1B.3 ; le hotfix **PR #465** a supprimé cette dépendance dans les preflights P1C.1/P1C.2, exact-head **20/20 PASS**, puis push gates P1C.1 + P1C.2 verts sur `a7d9e25cd5f59bd63aef6187febcf713e45e05f1`.

Migration production P1C.2 appliquée en **functions/views uniquement**, sans mutation métier.

### Politique de fiabilité

Trois métriques sont évaluées séparément pour chaque **quartier × transaction** :

1. `price_mad` ;
2. `surface_m2` ;
3. `price_per_m2_mad`.

Niveaux : `insufficient → limited → moderate → strong`.

Les seuils sont une **politique interne AkarFinder versionnée**, pas un standard statistique externe :

- **Limited** : n≥5, couverture≥50 %, fraîcheur≥50 %, ≥2 sources, outliers≤30 %, IQR/médiane≤1,50 ;
- **Moderate** : n≥10, couverture≥60 %, fraîcheur≥60 %, ≥2 sources, outliers≤20 %, IQR/médiane≤1,00 ;
- **Strong** : n≥20, couverture≥75 %, fraîcheur≥70 %, ≥3 sources, outliers≤15 %, IQR/médiane≤0,75.

Moins de 5 observations = toujours `insufficient`. Les lignes sans donnée restent explicites avec `sample_count=0`. Le `sample_health` du segment est séparé de la représentativité globale du marché.

### Rapport production P1C.2

- **32 segments** ;
- **96 metric rows** = 32 × 3 métriques ;
- **92 insufficient** ;
- **3 limited** ;
- **1 moderate** ;
- **0 strong** ;
- sample health : **25 insufficient / 6 limited / 1 moderate / 0 strong** ;
- `price_mad` : **32/32 insufficient**, échantillon max = 1 ;
- `price_per_m2_mad` : **32/32 insufficient**, échantillon max = 1 ;
- **0 candidat prix/prix-m²** pour P1C.3 ;
- seul candidat `moderate` : **Marrakech / Guéliz / location / surface_m2**, n=10, couverture 100 %, fraîcheur 90 %, 3 sources, médiane observée 84 m², IQR/médiane 0,3958, 0 % outlier ;
- `market_representativeness_certified=false` ;
- `public_activation=false` ;
- `metric_layers_activated=false` ;
- `p1c3_auto_activation=false` ;
- ACL effectifs : `anon=false`, `authenticated=false`, `service_role=true`.

P1C.2 est donc **CLOSED** : le moteur fait correctement son travail, y compris lorsqu’il conclut que les données sont insuffisantes.

---

# Lot actuel

## P1C.3 — Activation Review ✅ CLOSED

PR #466 mergée sur `main@26f0b676bb2f0be70caf75e03dcc98d4ef9f37f7`.

P1C.3 a revu en lecture seule le seul candidat `moderate`, **Marrakech / Guéliz / location / `surface_m2`**, et a confirmé que Reliability ne constitue pas une preuve de représentativité marché.

Résultat live :

- **102** listings Shadow ;
- **32** segments ;
- **96** métriques ;
- **1** review candidate ;
- **0** canary eligible ;
- **0** price candidate ;
- verdict : `P1C3_ACTIVATION_REVIEW_HOLD` ;
- raison : `HOLD_MARKET_REPRESENTATIVENESS_REQUIRED` ;
- aucune mutation DB ;
- aucune activation publique ;
- aucune auto-activation.

Promotion conceptuelle conservée : `OFF → SHADOW → CANARY → ON`, mais `SHADOW → CANARY` reste conditionné à une certification de représentativité indépendante sur le scope exact **quartier × transaction × métrique**.

---

## P1C.4 — Acquisition Representativeness Qualification ✅ CLOSED

P1C.4 est une **qualification read-only**, sans Registry write, listing write, Geo write, activation publique, changement Search/Ranking ni changement de policy DATA.

Scope exact audité : **Marrakech / Guéliz / `rent` / `surface_m2`** (`rent` est la valeur canonique DB de la transaction location).

### Univers observé

Le candidat reste statistiquement cohérent :

- **10** observations de surface ;
- **9** `fresh_confirmed` + **1** `seed_only` ;
- **3** domaines observés ;
- concentration : **Mubawab 6 / Mouldar 2 / Marrakech Realty 2** ;
- toutes les seeds observées proviennent de `serper_search` / bridge public-index OpenSERP ;
- plusieurs observations reposent sur des snippets de découverte, ce qui ne constitue pas une preuve d’exhaustivité source.

L’univers d’acquisition indépendant disponible au niveau Marrakech-location montre :

- **1 200** discovery candidate rows ;
- **129** requêtes distinctes ;
- **48** domaines distincts ;
- **1** provider de cette campagne : `serper_mass_harvest` ;
- profondeur maximale observée : rang **10** ;
- **111** requêtes atteignent le rang 10, ce qui prouve une profondeur de résultat moteur mais pas une profondeur d’inventaire du portail ;
- **8** requêtes excluent explicitement Avito + Mubawab + Sarouty + Agenz ;
- **0** requête d’acquisition explicitement scopée Guéliz × location ;
- **0** partner feed actif ;
- **0** run Common Crawl/public-index enregistré dans `odm_10c4_public_index_runs`.

### Dénominateur

Le dénominateur requis doit être **indépendant**, versionné et exact-scope. Les 3 sources observées ne peuvent pas devenir le dénominateur par définition, et les 1 200 résultats Marrakech-ville ne peuvent pas être transformés en univers Guéliz.

À l’état production audité, il n’existe donc pas de preuve permettant d’établir :

- les sources réellement attendues sur Guéliz × location ;
- la complétude par source ;
- la profondeur d’inventaire par source ;
- une couverture calculable contre un univers indépendant ;
- la réconciliation OpenSERP / sitemap / Common Crawl / partner feed sur ce scope ;
- l’absence de trous matériels liés aux permissions, à la fraîcheur ou aux canaux non acquis.

Les contraintes `source_policy_registry` renforcent le caractère fail-closed : l’existence technique d’une source ou sa découvrabilité publique ne vaut pas autorisation ni acquisition représentative.

### Certification P1C.4

Policy versionnée : `p1c4-acquisition-representativeness-policy-v1`.

Statuts possibles :

- `CERTIFIED` — dénominateur indépendant exact-scope + univers versionné + canaux réconciliés + profondeur/fraîcheur par source prouvées + aucun trou critique ;
- `INSUFFICIENT` — dénominateur indépendant valide, mais preuves de profondeur/fraîcheur/complétude encore incomplètes ;
- `NOT_CERTIFIABLE` — dénominateur absent, circulaire, non exact-scope ou canaux non réconciliables.

Verdict actuel : **`P1C4_REPRESENTATIVENESS_NOT_CERTIFIABLE`**.

Raisons principales :

- `EXACT_NEIGHBORHOOD_DENOMINATOR_ABSENT` ;
- `OBSERVED_SOURCE_SET_CANNOT_DEFINE_DENOMINATOR` ;
- `CITY_LEVEL_DISCOVERY_CANNOT_PROVE_GUELIZ_COMPLETENESS` ;
- `RESULT_RANK_DEPTH_IS_SEARCH_ENGINE_DEPTH_NOT_SOURCE_INVENTORY_DEPTH` ;
- `ACQUISITION_CHANNELS_NOT_RECONCILED_AT_EXACT_SCOPE` ;
- `KNOWN_POLICY_CONSTRAINTS_PREVENT_TREATING_DISCOVERABLE_MARKET_AS_ACQUIRED_MARKET`.

**P1C.5 n’est pas ouvert.** Offre publique, metric layer et canary restent OFF.

---

## P1C.4A — Acquisition Source Universe & Denominator Design 🔵 CURRENT

Objectif : construire le premier dénominateur d’acquisition **indépendant, versionné, exact-scope et révocable** pour Guéliz × location, sans modifier la policy DATA ni contourner les autorisations.

Le design doit au minimum fournir :

- une liste versionnée des sources attendues avec justification d’inclusion/exclusion indépendante des 3 sources déjà observées ;
- le canal autorisé/observable par source : public index, sitemap, Common Crawl, partner feed ou autre canal explicitement admissible ;
- la profondeur/completion evidence par source, distincte du simple rang d’un moteur de recherche ;
- la fraîcheur et la date d’observation par source ;
- la capacité ou non d’identifier Guéliz × location dans chaque source ;
- les trous connus : permission, accès, pagination, couverture, géographie, duplication, fraîcheur ;
- une méthode de couverture dont le numérateur ne peut être évalué qu’après fixation du dénominateur ;
- une version/date et une règle de révocation.

Si l’obtention de cette preuve exige de nouvelles acquisitions ou écritures, elles devront être exécutées dans un **lot DATA séparé** avec leurs propres gates. P1C.4A ne doit pas écraser cette lane.

Gate de sortie : une fois le dénominateur réellement défini et prouvé, repasser une qualification de représentativité read-only. **Aucun P1C.5 avant certification.**

---

# P2 — Carte immobilière interactive

## P2.1 — Choroplèthe immobilier

Couches candidates : prix/m², prix médian, volume d’offres et dynamique de marché, avec légende/échelle cohérentes et reliability visible.

**Précondition supplémentaire :** polygon quartier neighborhood-grade sourcé, topology-validé et explicitement revu. Les polygones d’arrondissement ne peuvent pas être substitués aux quartiers immobiliers par égalité de nom.

## P2.2 — Filtres Carte ↔ Search

Synchronisation bidirectionnelle ville/quartier/transaction/type/prix/surface/chambres sans divergence d’identité ni de ranking.

## P2.3 — Interaction quartier

Fiche quartier compacte : métriques certifiées, fiabilité, nombre d’annonces et CTA vers les résultats Search correspondants.

---

# P3 — Contexte spatial

## P3.1 — POI réels

Écoles, santé, transports, commerces, parcs, plages et équipements uniquement depuis des datasets autorisés et sourcés.

## P3.2 — Landmarks / Buildings

Monuments et bâtiments emblématiques visibles selon le niveau de zoom uniquement lorsqu’une géométrie réelle et une provenance exploitable existent.

## P3.3 — Proximité

Temps/distances uniquement à partir de coordonnées et d’un moteur de calcul vérifiable ; aucune approximation présentée comme vérité.

---

# P4 — Intelligence géographique AkarFinder

## P4.1 — Multi-layer Map

Immobilier + cadre de vie + marché, avec couches activables sans surcharge visuelle.

## P4.2 — Comparaison de quartiers

Comparaison structurée de plusieurs quartiers sur les mêmes métriques et niveaux de fiabilité.

## P4.3 — Mon Projet / Compagnon spatial

Mettre en évidence les quartiers compatibles avec un projet utilisateur à partir de critères explicites, sans inventer de données manquantes.

---

# P5 — Certification UX/UI Carte

- mobile référence ;
- desktop/tablette ;
- FR/AR/RTL ;
- gestures/zoom/clustering ;
- loading/empty/error states ;
- performance ;
- accessibilité ;
- densité labels ;
- cohérence Search ↔ Map ;
- audit visuel réel et boucle correction → audit jusqu’à **≥9/10**.

---

# Vue chronologique

```text
P1B.11  Registry Production Write                       ✅
   ↓
P1B.12  Tier A Resolution Canary                        ✅
   ↓
P1B.13  Geo Coverage Recovery Expansion                 ✅
   ↓
P1B.14  Typed Geometry Coverage                         ✅
   ↓
P1B.15  Geo Certification Gate                          ✅
   ↓
P1C.1   Offre quartier Shadow                           ✅
   ↓
P1C.2   Reliability Engine                              ✅
   ↓
P1C.3   Activation Review                               ✅ CLOSED
   ↓
P1C.4   Acquisition Representativeness Qualification    ✅ CLOSED — NOT_CERTIFIABLE
   ↓
P1C.4A  Acquisition Source Universe & Denominator Design 🔵 CURRENT
   ↓
P1C.5   Scoped Canary Activation Write                  ⛔ BLOCKED jusqu’à certification
   ↓
P1C.6   Canary Observation                              après canary
   ↓
P1C.7   Scoped ON                                       après observation réussie
   ↓
P2      Carte immobilière interactive
   ↓
P3      POI + landmarks + proximité
   ↓
P4      Intelligence / comparaison / Compagnon
   ↓
P5      UX/UI + mobile + RTL + performance
   ↓
CARTE AKARFINDER CERTIFIÉE
```

## Règle de passage à « la suite »

Nous ne devons **pas attendre une couverture nationale parfaite** pour progresser. En revanche, chaque métrique publique future doit passer ses propres gates de **Geo truth → Reliability → Representativeness → Activation**.

Une conclusion `insufficient`, `HOLD` ou `NOT_CERTIFIABLE` n’est pas un échec : c’est la protection contre la fausse précision. Aucun segment non certifié ne doit être présenté comme vérité de marché, et aucun arrondissement administratif ne doit être présenté comme polygon de quartier immobilier sans preuve territoriale explicite.
