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

## P1C.3 — Activation Review ✅

PR #466 mergée sur `26f0b676bb2f0be70caf75e03dcc98d4ef9f37f7`.

P1C.3 a exécuté la revue read-only du seul candidat Reliability `moderate` : **Marrakech / Guéliz / location / `surface_m2`**.

Résultat production :

- **102 listings** Shadow ;
- **32 segments** ;
- **96 métriques** ;
- **1 review candidate** ;
- **0 canary eligible** ;
- **0 price candidate** ;
- verdict : `P1C3_ACTIVATION_REVIEW_HOLD` ;
- raison : `HOLD_MARKET_REPRESENTATIVENESS_REQUIRED` ;
- `public_activation=false` ;
- `metric_layers_activated=false` ;
- 0 auto-activation ;
- 0 mutation DB.

**Fiabilité ≠ représentativité marché.** P1C.3 a donc correctement refusé de transformer une cohérence statistique locale en vérité publique.

---

## P1C.4 — Acquisition Representativeness Qualification ✅

P1C.4 reste **strictement read-only** et examine le scope exact :

**Marrakech → Guéliz → location → `surface_m2`**.

### Snapshot live de qualification

Échantillon Shadow :

- **10 observations** ;
- **3 sources** : `mubawab.ma` 6, `mouldar.com` 2, `marrakechrealty.com` 2 ;
- concentration principale : **60 %** sur une seule source ;
- **9 fresh_confirmed / 1 seed_only** ;
- provenance de l’échantillon : même bridge `persisted_openserp` / seed provider historique `serper_search` ;
- **2 signaux de langage de proximité** contiennent Guéliz sans constituer à eux seuls une preuve d’appartenance exacte au quartier ; ils restent un biais à revoir, pas une conclusion d’erreur Geo.

Univers d’acquisition diagnostique indépendant via `discovery_candidates` au snapshot :

- **648 candidate rows** ;
- **382 URLs candidates uniques** ;
- **74 domaines** ;
- **2 providers de discovery** ;
- seulement **3/74 domaines = 4,05 %** sont représentés dans le Shadow actuel ;
- les 3 domaines observés représentent **96/648 candidate rows = 14,81 %** et **69/382 URLs = 18,06 %** de ce réservoir diagnostique ;
- de nombreux domaines acquis restent hors Shadow exact, notamment `agenz.ma`, `sarouty.ma`, `1immo.ma`, `promoimmomarrakech.com`, `avito.ma`, `soukimmobilier.com`, etc. ;
- une partie des domaines candidats n’a pas encore de qualification Source Registry exploitable pour ce scope.

Ces chiffres **ne deviennent jamais un dénominateur certifié par simple comptage**. Ils prouvent au contraire qu’un design de dénominateur indépendant est nécessaire.

### Certification versionnée P1C.4

États possibles :

- `CERTIFIED` ;
- `INSUFFICIENT` ;
- `NOT_CERTIFIABLE`.

Aucun seuil numérique ad hoc n’est introduit. Pour être certifiable, le scope doit disposer au minimum d’un design versionné couvrant :

- univers de sources exact ;
- univers de queries/campagnes ;
- profondeur cible par source ;
- raisons d’inclusion/exclusion ;
- contrat freshness ;
- traitement des doublons ;
- trous connus ;
- snapshot policy Source Registry ;
- revue des ambiguïtés de scope Geo ;
- réconciliation live discovery ↔ observations.

### Verdict P1C.4

`P1C4_REPRESENTATIVENESS_NOT_CERTIFIABLE`

Raison : les preuves live montrent un **gap massif entre acquisition diagnostique et échantillon Shadow**, mais le repo ne possède pas encore de manifeste versionné définissant l’univers exact, la profondeur attendue par source et les trous acceptables. L’absence de ce design interdit de transformer 3 sources observées en dénominateur par définition.

Conséquences :

- `market_representativeness_certified=false` ;
- Offre publique reste **OFF** ;
- aucun `SHADOW → CANARY` ;
- aucun write Registry/listing/Geo ;
- aucun changement Search/Ranking/DATA policy ;
- aucune extrapolation Marrakech/Maroc ;
- décision révocable après constitution d’un vrai dénominateur.

---

# Lot actuel

## P1C.4A — Acquisition Source Universe & Denominator Design 🟠 CURRENT

Responsabilité unique : construire le dénominateur indépendant versionné pour **Guéliz × location**, sans activation publique.

Livrables minimaux :

1. `source_universe_manifest` — sources attendues, statut Registry, inclusion/exclusion et justification ;
2. `query_universe_manifest` — campagnes/queries réellement exécutées et leur couverture ;
3. `source_depth_contract` — profondeur/pagination/crawl admissible et preuve par source ;
4. `known_holes_register` — sources/canaux inaccessibles, interdits, non autorisés ou techniquement incomplets ;
5. stratégie de duplicate handling et freshness ;
6. revue explicite des signaux de proximité qui peuvent contaminer un scope quartier ;
7. aucun seuil de représentativité tant que le dénominateur et ses pondérations ne sont pas justifiés.

### Gate de sortie P1C.4A

Deux chemins seulement :

- design complet + preuves suffisantes → rejouer une qualification P1C.4 versionnée ; si `CERTIFIED`, ouvrir **P1C.5 Scoped Canary Activation Write** exclusivement pour `Guéliz × location × surface_m2` ;
- design encore incomplet / acquisition réellement trop lacunaire → enrichissement DATA ciblé, puis nouvelle qualification ; aucune activation implicite.

## P1C.5 — Scoped Canary Activation Write ⏭️ BLOCKED BY P1C.4A + CERTIFICATION

Si et seulement si la représentativité devient `CERTIFIED`, promotion extrêmement bornée :

`SHADOW → CANARY`

pour un seul **quartier × transaction × métrique**, avec forward/rollback exact, audit trail, reliability/sample count visibles et aucune activation nationale.

## P1C.6 — Canary Observation ⏭️

Observer drift DATA, freshness, sample degradation, acquisition coverage, anomalies et cohérence Search/Map. Toute dégradation doit permettre `CANARY → SHADOW`.

## P1C.7 — Scoped ON ⏭️

Seulement après observation réussie, `CANARY → ON` pour le scope certifié. Ne pas attendre que tout le Maroc soit certifié.

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
P1C.3   Activation Review                               ✅
   ↓
P1C.4   Acquisition Representativeness Qualification    ✅ NOT_CERTIFIABLE
   ↓
P1C.4A  Acquisition Source Universe & Denominator       🟠 CURRENT
   ↓
P1C.4   Requalification                                 après design/enrichissement
   ↓
P1C.5   Scoped Canary Activation Write                  seulement si CERTIFIED
   ↓
P1C.6   Canary Observation
   ↓
P1C.7   Scoped ON
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

Une conclusion `insufficient`, `NOT_CERTIFIABLE` ou `HOLD` n’est pas un échec : c’est la protection contre la fausse précision. Aucun segment non certifié ne doit être présenté comme vérité de marché, et aucun arrondissement administratif ne doit être présenté comme polygon de quartier immobilier sans preuve territoriale explicite.
