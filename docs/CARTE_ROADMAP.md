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

## P1C.3 — Activation Review 🟠 CURRENT

P1C.3 est une **revue read-only**. Il ne contient aucun SQL de mutation et n’active aucune métrique.

Promotion conceptuelle :

`OFF → SHADOW → CANARY → ON`

Mais le passage `SHADOW → CANARY` exige simultanément :

- métrique `moderate` ou `strong` ;
- scope exact **quartier × transaction × métrique** ;
- représentativité d’acquisition certifiée séparément sur ce même scope ;
- activation publique encore OFF avant promotion ;
- metric layer encore OFF avant promotion ;
- revue explicite ;
- aucune activation nationale en bloc.

**Fiabilité ≠ représentativité marché.** Une métrique peut être statistiquement cohérente sur les annonces observées tout en restant non représentative du marché réellement disponible.

### Décision attendue avec l’état production actuel

- candidat Reliability : Guéliz / location / `surface_m2` ;
- `market_representativeness_certified=false` ;
- candidat prix : 0 ;
- canary public autorisable aujourd’hui : **0** ;
- décision correcte : **HOLD**.

P1C.3 doit produire ce HOLD explicitement ; il ne doit jamais transformer l’absence de certification d’acquisition en activation implicite.

### Gate de sortie P1C.3

- uniquement `moderate/strong` examinés comme review candidates ;
- toutes les métriques restent Shadow ;
- 0 mutation DB ;
- 0 consommation runtime publique ;
- 0 RPC global lourd ;
- 0 auto-activation ;
- 0 canary tant que la représentativité n’est pas certifiée ;
- décision et raisons auditées par scope exact ;
- passage explicite vers P1C.4 si verdict `HOLD`.

## P1C.4 — Acquisition Representativeness Qualification ⏭️ NEXT AFTER P1C.3 HOLD

Objectif : certifier **localement**, et non nationalement, si l’échantillon d’annonces observé est assez représentatif pour autoriser un canary public sur un scope précis.

Le lot devra notamment définir et prouver :

- le périmètre d’acquisition réellement couvert pour le quartier/transaction ;
- les sources attendues vs réellement observées ;
- la fraîcheur et la profondeur par source ;
- les biais de collecte connus ;
- le dénominateur utilisé pour parler de couverture ;
- une certification versionnée et révocable ;
- aucune extrapolation nationale à partir d’un scope local.

**On ne doit pas attendre une couverture nationale parfaite.** Un scope local peut devenir canary dès que sa chaîne Geo + Reliability + Representativeness est certifiée.

Après P1C.4 :

- si aucun scope n’est certifié → Offre publique reste OFF et enrichissement DATA ciblé ;
- si un scope est certifié → lot séparé de **Canary Write/Activation**, puis observation et rollback avant ON.

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
P1C.3   Activation Review                               🟠 CURRENT
   ↓
P1C.4   Acquisition Representativeness Qualification    ⏭️ NEXT
   ↓
P1C.x   Scoped Canary Write / Observation / ON          si certifié
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

Une conclusion `insufficient` ou `HOLD` n’est pas un échec : c’est la protection contre la fausse précision. Aucun segment non certifié ne doit être présenté comme vérité de marché, et aucun arrondissement administratif ne doit être présenté comme polygon de quartier immobilier sans preuve territoriale explicite.
