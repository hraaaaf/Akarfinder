# AKARFINDER — ROADMAP D’EXÉCUTION CARTE

**Date : 2026-08-10**  
**Rôle : vue chronologique détaillée de la lane Carte.** `docs/ROADMAP.md` reste la roadmap canonique globale du produit ; ce document détaille uniquement l’enchaînement Carte et doit rester cohérent avec elle.

## État réel au 2026-08-10

Fondations Carte déjà certifiées : P1A.1 → P1A.6, P1B.1 → P1B.12.

Derniers lots Geo :

- **P1B.8 ✅ Geo Authority Evidence Review** — 2 couples Tier A confirmés : Agadir — Hay Mohammadi (5 listings) et Agadir — Dakhla (3 listings).
- **P1B.9 ✅ Tier A Registry Candidate Review** — review read-only, 2 candidats / 8 listings, aucun write.
- **P1B.10 ✅ Tier A Registry Write Design** — design forward/rollback certifié, rehearsal PostgreSQL réel, aucun write production.
- **P1B.11 ✅ Tier A Registry Production Write** — 2 entités + 2 alias créés en production ; `map_eligible=false`, `seo_eligible=false` ; **0 `geo_resolution_events` automatique**.
- **P1B.12 ✅ Tier A Resolution Canary** — PR #450 mergée ; post-merge spécialisé PASS ; migration production appliquée ; **8/8** résolutions append-only (3 Dakhla + 5 Hay Mohammadi), **0 collision latest**, **0 conflit historique**, **0 canonical geo manquant** ; couverture publique quartier **97 / 15 438 = 0,6283 %** ; rollback append-only prouvé et non requis.

La couche publique **Offre quartier reste OFF**. Le Registry peut contenir une entité sans que cela autorise automatiquement son affichage, ses métriques ou la résolution d’annonces.

---

# Chronologie restante

## P1B.13 — Geo Coverage Recovery Expansion 🟠 NEXT

Rejouer le gap P1B.6/P1B.7 après le canary Tier A et traiter les candidats restants uniquement par cohortes dont l’autorité indépendante et le type territorial sont démontrés.

Replay production d’ouverture P1B.13 :

- **63** listings Search-éligibles encore non résolus avec `district` explicite ;
- **29** couples ville/quartier Registry-gap ;
- **0** match Registry exact restant dans cette cohorte ;
- **3** domaines source concernés ;
- principaux gaps par volume : Casablanca — Oasis (5), Casablanca — Californie (4), Casablanca — Gauthier (4), Marrakech — Palmeraie (4), Marrakech — Targa (4).

Priorité :

1. candidats déjà corroborés mais insuffisants en P1B.8 ;
2. nouvelles preuves officielles/urbanisme ;
3. création Registry uniquement dans des micro-lots séparés ;
4. résolution des listings uniquement après Registry certifié.

**Interdit :** transformer la récurrence commerciale en vérité géographique.

**Gate de sortie P1B.13 :** produire des cohortes Registry candidates avec autorité indépendante démontrée, provenance explicite et type territorial non ambigu ; aucun write Registry ou résolution listing dans le lot de qualification lui-même.

## P1B.14 — Geometry Coverage Expansion

Associer progressivement les quartiers canoniques validés à des géométries sourcées et vérifiées.

Ordre cible : Casablanca → Rabat → Marrakech → Tanger → Agadir, ajustable selon disponibilité/qualité des datasets.

Gates : provenance, topologie, absence d’overlap incohérent, parentage ville/quartier, aucune géométrie inventée.

## P1B.15 — Geo Certification Gate

Réconciliation finale de la chaîne :

`Listing → Geo Resolution Event → Neighborhood Registry → Parent City → Geometry`

Search et Map doivent partager la même identité géographique. Ce gate décide si la lane peut passer à l’intelligence Offre quartier.

---

# P1C — Intelligence Offre quartier

## P1C.1 — Offre quartier Shadow

Calculer **sans exposition publique** :

- volume d’annonces ;
- prix médian ;
- prix/m² ;
- vente/location ;
- typologies ;
- fraîcheur ;
- couverture et taille d’échantillon.

## P1C.2 — Reliability Engine

Définir et certifier la fiabilité de chaque métrique : taille minimale d’échantillon, fraîcheur, dispersion, outliers, provenance et niveau de confiance.

Principe : **données insuffisantes > fausse précision**.

## P1C.3 — Activation Offre quartier

Promotion contrôlée :

`OFF → SHADOW → CANARY → ON`

Aucune activation nationale en bloc. Activation par périmètre réellement certifié.

---

# P2 — Carte immobilière interactive

## P2.1 — Choroplèthe immobilier

Couches candidates : prix/m², prix médian, volume d’offres et dynamique de marché, avec légende/échelle cohérentes et reliability visible.

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
P1B.13  Geo Coverage Recovery Expansion           🟠 NEXT
   ↓
P1B.14  Geometry Coverage Expansion
   ↓
P1B.15  Geo Certification Gate
   ↓
P1C.1   Offre quartier Shadow
   ↓
P1C.2   Reliability Engine
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

Nous ne devons **pas attendre une couverture nationale parfaite** pour commencer P1C/P2. Le passage se fait dès qu’un périmètre géographique possède une chaîne Geo certifiée et un échantillon suffisamment fiable pour la métrique concernée. Les premières activations peuvent donc être **ville/quartier par ville/quartier**, pendant que P1B continue d’étendre la couverture ailleurs.

En revanche, aucune zone non certifiée ne doit être colorée ou enrichie comme si elle disposait de données fiables.
