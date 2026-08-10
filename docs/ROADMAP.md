# AKARFINDER — ROADMAP CANONIQUE UNIQUE

**Version : 2026-08-10 20:25 +01:00**  
**Autorité : ce fichier est l’unique roadmap d’exécution de toutes les fenêtres/lane AkarFinder.**

`README.md` = identité/doctrine. `docs/SESSION.md` = handover court. Les roadmaps spécialisées (ex. `docs/CARTE_ROADMAP.md`) sont des journaux détaillés et ne peuvent jamais définir une priorité concurrente à ce fichier.

---

# 0. Gouvernance globale — obligatoire dans toutes les fenêtres

Toute fenêtre/agent travaillant sur AkarFinder doit commencer par lire, dans cet ordre :

1. `README.md` ;
2. `docs/ROADMAP.md` ;
3. `docs/SESSION.md` ;
4. le fichier spécialisé de sa lane si nécessaire.

## Règle d’unification

Toute nouvelle idée, dette, lot, finding, audit ou prochaine étape provenant d’une fenêtre parallèle doit être **enregistré ici** avant d’être considéré comme faisant partie du plan produit. Une fenêtre peut conserver un journal détaillé spécialisé, mais `docs/ROADMAP.md` reste la seule source de vérité pour : priorité, dépendances, statut, prochain lot et certification.

## Gate universel DOUBLE CHECK + NOTE ≥9/10

Chaque étape significative, pas seulement UX/UI, suit désormais cette boucle obligatoire :

`IMPLEMENTATION → DOUBLE CHECK INDÉPENDANT → NOTE /10 → CORRECTIONS → RE-TEST → RE-NOTE → CERTIFICATION`

Règles :

- aucun lot n’est `CLOSED` avec une note finale < **9,0/10** ;
- si la première note est <9,0, le lot reste ouvert et les findings deviennent immédiatement des sous-étapes de la roadmap ;
- le double check doit rechercher activement les contradictions, régressions, bypass, hypothèses non prouvées, dette créée et incohérences avec les autres lanes ;
- DATA/Search/Backend : note fondée sur correctness, sécurité/fail-closed, couverture de tests, observabilité, rollback, performance et cohérence architecture ;
- UX/UI : note séparée mobile/desktop lorsque pertinent, avec **mobile ≥9/10** obligatoire ;
- Carte/Geo : exactitude géographique/provenance et absence d’inférence non prouvée font partie du score ;
- toute mutation production exige preuve avant/après et rollback lorsque applicable ;
- exact-head CI verte + tests spécialisés + build/typecheck sont nécessaires mais **ne suffisent pas seuls** à obtenir 9/10 ;
- Reviewer technique et Release Certifier restent distincts du Builder pour les lots critiques ;
- après merge, relecture de `main` et mise à jour de `README.md`, `ROADMAP.md`, `SESSION.md`.

## Échelle de score

- **<8,0** : insuffisant — redesign/correction majeure ;
- **8,0–8,9** : fonctionnel mais non certifiable — corrections obligatoires ;
- **9,0–9,4** : certifiable ;
- **9,5–10** : excellent, sans dette critique connue.

---

# 1. North Star produit

AkarFinder = **moteur de recherche immobilier + index national + couche d’intelligence du marché marocain**.

Pipeline canonique :

`DISCOVERY → INGESTION/OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION/SERP`

Doctrine :

- MASS FIRST → QUALITY LATER → PARTNER REPLACEMENT OVER TIME ;
- volume brut ≠ inventaire publiable ;
- sitemap/robots/capability ≠ permission ;
- Source Registry autoritaire et fail-closed ;
- aucune donnée, image, géométrie, coordonnée, prix ou partenariat inventé ;
- Search reste le cœur produit ; Map est une projection spatiale cohérente de la même vérité ;
- `DISCOVERED ≠ AUDITED ≠ POLICY_ASSIGNED ≠ ELIGIBLE ≠ INGESTIBLE ≠ DISPLAYABLE` ;
- une responsabilité = une branche = une PR = une certification ;
- Shadow → Canary → certification → activation bornée pour les changements sensibles.

North Star DATA : `COVERAGE × FRESHNESS × DEDUP × RELEVANCE`, la qualité servant d’abord à ordonner/enrichir plutôt qu’à effacer automatiquement une annonce structurellement admissible.

---

# 2. P0 ACTUEL — MASS-FIRST Search / Quality Policy — PR #474 🟠

**Branche :** `feat/mass-first-search-quality-policy`  
**Base :** `main@f4563602119c8c01298bf694285e35856097bbd6`  
**PR :** #474  
**État :** 5 lots implémentés + 1 correctif d’auto-review ; merge interdit tant que certification complète non verte.

## Lot 1 — Source Policy public gate ✅ CODED

- gate public fail-closed basé sur Source Registry ;
- hidden/prohibited/permission-required/unverified/expired exclus ;
- aucune permission déduite de la qualité ou du sitemap.

## Lot 2 — Quality ≠ Eligibility ✅ CODED

- qualité retirée du hard gate structurel ;
- seules les vraies lignes `LISTING + real_estate_likely` peuvent être publiques ;
- correctif `AMBIGUOUS` appliqué après double check interne.

## Lot 3 — Listing Power Score 0–100 ✅ CODED

Score déterministe et explicable :

- complétude : 60 pts ;
- qualité : 20 pts ;
- fraîcheur : 20 pts ;
- le score ne peut jamais créer un droit d’affichage.

## Lot 4 — Public Search ranking par Listing Power ✅ CODED

- Listing Power devient le signal non-textuel dominant ;
- filtres et contrat curseur préservés ;
- Source Policy + LISTING restent des gates avant ranking.

## Lot 5 — Reclassification + certification fail-closed ✅ CODED

La migration doit refuser la certification si elle détecte : fuite de policy, document non-LISTING public, score absent/hors bornes ou exclusion provoquée uniquement par la qualité.

## Double check MASS-FIRST — score provisoire : **8,8/10 — NON CERTIFIÉ**

Points positifs : architecture cohérente avec MASS FIRST, fail-closed explicite, séparation eligibility/ranking, Power Score borné, correction proactive de `AMBIGUOUS`.

Ce qui empêche encore ≥9 :

1. **CI exact-head** du dernier commit `b6a911ecebc38b736e902e7fb6d9d51d0c7cad52` à terminer ;
2. **Canonical Compile / Baseline / Search Truth** doivent être verts ;
3. exécuter les 5 migrations sur PostgreSQL/Supabase réel ou rehearsal fidèle ;
4. exécuter les reports MASS-FIRST et vérifier les compteurs réels ;
5. confirmer qu’aucune fonction `SECURITY DEFINER` exposée n’accorde un bypass involontaire ; durcir ACL/grants si nécessaire ;
6. vérifier le rôle réel consommateur de `search_public_representations_v1` ;
7. vérifier plan/performance du Search après ajout de Source Policy + Power Score ;
8. comparer avant/après : volume public, distribution Power Score, sources, villes, qualité, fraîcheur, top résultats ;
9. tester explicitement Q0/Q1 valides : ils doivent rester trouvables mais moins bien classés ;
10. tester prohibited/unverified/category/ambiguous : **0 fuite publique** ;
11. Reviewer technique indépendant ;
12. Release Certifier ;
13. recalculer la note. Si <9, corriger et rejouer la boucle ;
14. merge #474 uniquement après **≥9/10 + CI verte + PostgreSQL vert** ;
15. post-merge : vérifier `main`, puis closeout documentaire.

**Cible de certification : ≥9,2/10.**

---

# 3. Lane DATA — couverture nationale 🔴 P0 parallèle

## DATA-4.9A ✅ CLOSED

Jusqu’à **11 480 identités sitemap net-new brutes** observées, sans les appeler annonces.

## DATA-4.9B 🟠 EVIDENCE AVAILABLE

Snapshot certifié : **10 128 URL identities net-new → 2 326 représentations URL structurellement compatibles détail + 7 802 rejets**. Les 2 326 ne sont pas des biens uniques.

## DATA-4.9C — Source Policy Decision & Registry Assignment 🔵 NEXT

Ordre :

1. relire preuves officielles actuelles CGU/terms/robots/pages source + Registry ;
2. décider par source `authorized / permission_required / prohibited / remain_unverified` ;
3. séparer permission, ingestion, réutilisation et display ;
4. mutation Registry uniquement si preuve positive ;
5. before/after manifest + rollback ;
6. 0 ingestion et 0 activation Search dans ce lot ;
7. double check + score ≥9/10 avant close.

Priorité : Val Foncier, Christie’s Morocco, Immo Maroc, ProImmobilier, AgadirImmobilier ; Capital Properties opportuniste/non bloquant.

## DATA-4.9D 🔒

Canary d’ingestion borné uniquement pour les sources réellement autorisées par 4.9C. Double check + ≥9/10 avant extension.

## Handoff Carte P1C.4A — exact-scope evidence 🔵 REQUIRED

Le dénominateur Guéliz × location reste `DESIGNED_NOT_PROVEN`. DATA doit fournir un lot séparé de preuve Registry + profondeur/fraîcheur exact-scope. Aucun pourcentage de représentativité ne doit être inventé avant cette preuve.

---

# 4. Lane UX / Search 🟡

Lots de convergence déjà certifiés : SEARCH-UX-FAST-1, WORDING-PURITY, CONTINUOUS-FLOW, MOBILE-CARD-GRID, UNIFIED-LISTING-CARD, contextual visual assets, attribution, action hierarchy, desktop split et packs contextuels. Rabat real-photo #468 certifié **9,2/10**.

## UX-SEARCH-DENSITY-2 — Desktop 4/3/2 grid 🔵 NEXT après stabilisation #474

Direction issue de l’audit utilisateur :

- desktop large : **4 cartes/ligne** ;
- desktop intermédiaire : **3** ;
- tablette : **2** ;
- mobile : conserver **2** ;
- réduire dominance header/filtres ;
- préserver la grammaire card, provenance et transparence.

Processus obligatoire : captures fraîches desktop/mobile → benchmark → implémentation → Chromium multi-viewports → double check → note mobile + desktop → corrections jusqu’à **≥9/10 chacun**.

## CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1 🔵 READ-ONLY

Mesurer couverture, répétition réelle, fallback rate et échec distant après Rabat real-photo avant de créer de nouveaux assets. Double check + score analytique ≥9/10.

---

# 5. Lane Carte / Geo 🟡

Détail historique : `docs/CARTE_ROADMAP.md`. Ce fichier reste l’autorité de priorité.

Acquis : P1A.1→P1A.6, P1B.1→P1B.15, P1C.1, P1C.2, P1C.3, P1C.4, P1C.4A.

État :

- Offre quartier publique **OFF** ;
- P1C.4 = `NOT_CERTIFIABLE` ;
- P1C.4A = `DESIGNED_NOT_PROVEN` ;
- P1C.5 reste **LOCKED**.

Ordre restant :

1. DATA exact-scope Registry + depth/freshness evidence ;
2. rejouer P1C.4A read-only ;
3. rejouer P1C.4 representativeness read-only ;
4. seulement si `P1C4_REPRESENTATIVENESS_CERTIFIED` : P1C.5 scoped canary ;
5. P1C.6 observation ;
6. P1C.7 scoped ON ;
7. P2 choroplèthe uniquement avec géométrie neighborhood-grade certifiée ;
8. chaque étape : double check + note ≥9/10.

---

# 6. Ordre d’exécution global actuel

```text
P0-A  MASS-FIRST #474 certification + sécurité + PostgreSQL       🟠 NOW
  ↓
P0-B  DATA-4.9C Source Policy Decision                            🔵 NEXT
  ↓
P0-C  DATA-4.9D authorized canary                                 🔒
  ↓
P1-A  UX-SEARCH-DENSITY-2 desktop 4/3/2 + mobile 2               🔵
  ↓
P1-B  Contextual visual coverage audit                            🔵 read-only
  ↓
P1-C  DATA exact-scope evidence pour P1C.4A                       🔵
  ↓
P1-D  P1C.4A/P1C.4 replay → éventuel P1C.5                       🔒 conditionnel
```

Les lanes peuvent avancer en parallèle uniquement si elles ne modifient pas la même responsabilité et si chaque fenêtre enregistre ici son état/dépendance.

---

# 7. Template obligatoire pour tout nouveau lot

Chaque fenêtre ajoute/maintient dans cette roadmap :

```text
LOT-ID — Nom
Responsabilité unique :
Lane :
Dépend de :
Branche :
PR :
État : PLANNED / CODED / REVIEW / CERTIFIED / MERGED / CLOSED
Preuves :
Double check findings :
Score initial /10 :
Corrections :
Score final /10 :
CI exact-head :
Production/rehearsal :
Rollback :
Prochaine étape :
```

**Interdiction de marquer CLOSED si `Score final < 9,0`.**
