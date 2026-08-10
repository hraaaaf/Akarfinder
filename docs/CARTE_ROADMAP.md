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

# Lot actuel

## P1C.1 — Offre quartier Shadow 🟠 CURRENT

Construire une première couche de métriques **strictement interne / service-role only** à partir de :

`P1B.3 latest resolved Geo → thin_index normalized offer fields → Shadow metrics`

Le contrat P1C.1 sépare explicitement :

- **summary quartier** : volume, vente/location, typologies, fraîcheur, couverture des champs et taille d’échantillon ;
- **segment quartier × transaction** : prix médian, surface médiane et prix/m² ;
- **listing Shadow** : provenance de chaque observation et source du prix/m².

Règles :

- vente et location ne sont **jamais mélangées** dans une médiane de prix ;
- `normalized_price_m2` est utilisé lorsqu’il existe ; sinon un prix/m² peut être dérivé uniquement de `normalized_price_mad / normalized_surface_m2` lorsque les deux valeurs exactes positives existent ;
- une absence de prix reste `NULL`, jamais imputée ;
- chaque métrique expose son nombre d’observations et sa couverture ;
- `metric_state=shadow` ;
- `reliability_certified=false` ;
- `public_activation=false` ;
- `metric_layers_activated=false` ;
- aucune consommation par l’UI/API publique.

### Preflight production avant déploiement

Le snapshot initial P1C.1 montre déjà pourquoi P1C.2 est indispensable : les dimensions intention/type sont bien plus complètes que les prix. Par exemple, Oasis et Maârif ont des listings Geo résolus mais **aucun prix disponible** dans le snapshot examiné. P1C.1 doit mesurer ce manque au lieu de le masquer.

### Gate de sortie P1C.1

- vues Shadow déployées en `service_role` uniquement ;
- le nombre de lignes Shadow reste identique au dénominateur Geo résolu P1B.3 ;
- 0 collision Geo, 0 conflit historique, 0 canonical geo manquant ;
- séparation sale/rent certifiée ;
- sample sizes et complétude visibles ;
- aucune route/composant public ne consomme les vues ;
- rapport post-déploiement certifié ;
- **P1C.2 Reliability Engine** devient le lot suivant.

---

# P1C — Intelligence Offre quartier

## P1C.1 — Offre quartier Shadow 🟠 CURRENT

Calculer **sans exposition publique** : volume d’annonces, prix médian, prix/m², vente/location, typologies, fraîcheur, couverture et taille d’échantillon.

Aucune métrique Shadow ne devient automatiquement publique.

## P1C.2 — Reliability Engine ⏭️ NEXT

Définir et certifier la fiabilité de chaque métrique : taille minimale d’échantillon, fraîcheur, dispersion, outliers, provenance et niveau de confiance.

Principe : **données insuffisantes > fausse précision**.

## P1C.3 — Activation Offre quartier

Promotion contrôlée :

`OFF → SHADOW → CANARY → ON`

Aucune activation nationale en bloc. Activation uniquement par périmètre réellement certifié et métrique suffisamment fiable.

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
P1B.11  Registry Production Write                 ✅
   ↓
P1B.12  Tier A Resolution Canary                  ✅
   ↓
P1B.13  Geo Coverage Recovery Expansion           ✅
   ↓
P1B.14  Typed Geometry Coverage                   ✅
   ↓
P1B.15  Geo Certification Gate                    ✅
   ↓
P1C.1   Offre quartier Shadow                     🟠 CURRENT
   ↓
P1C.2   Reliability Engine                        ⏭️ NEXT
   ↓
P1C.3   Activation Offre : OFF→SHADOW→CANARY→ON
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

Nous ne devons **pas attendre une couverture nationale parfaite** pour commencer P1C. Le passage se fait dès qu’un périmètre possède une chaîne Geo certifiée et, pour une future exposition publique, un échantillon suffisamment fiable pour la métrique concernée.

P1C Shadow peut donc progresser pendant que la couverture Geo continue de s’étendre. En revanche, aucune zone non certifiée ne doit être colorée ou enrichie comme si elle disposait de données fiables, et aucun arrondissement administratif ne doit être présenté comme polygon de quartier immobilier sans preuve territoriale explicite.
