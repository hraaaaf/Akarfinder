# AKARFINDER — ROADMAP CANONIQUE UNIQUE

**Version : 2026-08-10 20:35 +01:00**  
**Autorité : ce fichier est l’unique roadmap d’exécution de toutes les fenêtres/lane AkarFinder.**

`README.md` = identité/doctrine. `docs/SESSION.md` = handover court. Les roadmaps spécialisées (ex. `docs/CARTE_ROADMAP.md`) sont des journaux détaillés et ne peuvent jamais définir une priorité concurrente à ce fichier.

---

# 0. Gouvernance globale — obligatoire dans toutes les fenêtres

Toute fenêtre/agent travaillant sur AkarFinder doit commencer par lire, dans cet ordre :

1. `README.md` ;
2. `docs/ROADMAP.md` ;
3. `docs/SESSION.md` ;
4. le fichier spécialisé de sa lane si nécessaire.

Toute nouvelle idée, dette, lot, finding, audit ou prochaine étape provenant d’une fenêtre parallèle doit être enregistrée ici avant d’être considérée comme faisant partie du plan produit.

## Gate universel DOUBLE CHECK + NOTE ≥9/10

`IMPLEMENTATION → DOUBLE CHECK INDÉPENDANT → NOTE /10 → CORRECTIONS → RE-TEST → RE-NOTE → CERTIFICATION`

Règles :

- aucun lot n’est `CLOSED` avec une note finale < **9,0/10** ;
- si la première note est <9,0, le lot reste ouvert et les findings deviennent des sous-étapes de cette roadmap ;
- DATA/Search/Backend : correctness, sécurité/fail-closed, tests, observabilité, rollback, performance et cohérence architecture font partie du score ;
- UX/UI : note séparée mobile/desktop lorsque pertinent ; **mobile ≥9/10** obligatoire ;
- Carte/Geo : exactitude géographique, provenance et absence d’inférence non prouvée font partie du score ;
- mutation production : preuve before/after + rollback lorsque applicable ;
- CI exact-head verte est nécessaire mais ne suffit pas seule à obtenir 9/10 ;
- Reviewer indépendant et Release Certifier restent distincts du Builder pour les lots critiques ;
- après merge : relire `main`, rejouer les gates critiques et mettre à jour README/ROADMAP/SESSION.

---

# 1. North Star produit

AkarFinder = **moteur de recherche immobilier + index national + couche d’intelligence du marché marocain**.

Doctrine :

- **MASS FIRST → QUALITY LATER → PARTNER REPLACEMENT OVER TIME** ;
- la qualité ordonne/enrichit ; elle ne doit pas, seule, effacer une annonce structurellement et juridiquement admissible ;
- volume brut ≠ inventaire publiable ;
- sitemap/robots/capability ≠ permission ;
- Source Registry autoritaire et fail-closed ;
- aucune donnée, image, géométrie, coordonnée, prix ou partenariat inventé ;
- Search reste le cœur produit ; Map est une projection spatiale de la même vérité ;
- `DISCOVERED ≠ AUDITED ≠ POLICY_ASSIGNED ≠ ELIGIBLE ≠ INGESTIBLE ≠ DISPLAYABLE` ;
- une responsabilité = une branche = une PR = une certification ;
- Shadow → Canary → certification → activation bornée pour les changements sensibles.

---

# 2. REGISTRE MAÎTRE DES PR / FENÊTRES

Le statut GitHub `OPEN` n’implique plus qu’une PR est active. Toute PR ouverte est classée ici avant reprise.

## ACTIVE — critical path

### PR #474 — MASS-FIRST + canonical unified roadmap 🟠 P0 NOW

Branche : `feat/mass-first-search-quality-policy`.

Responsabilité : rendre Search mass-first sans affaiblir Source Policy.

5 lots :

1. Source Policy public gate ;
2. Quality ≠ Eligibility ;
3. Listing Power Score 0–100 ;
4. ranking public par Listing Power ;
5. mass reclassification + certification fail-closed.

Score provisoire : **8,8/10 — NON CERTIFIÉ**.

Pour passer ≥9 : CI exact-head complète, PostgreSQL/Supabase réel ou rehearsal fidèle, rapports MASS-FIRST, audit ACL/`SECURITY DEFINER`, plan/perf Search, before/after inventory, tests Q0/Q1, 0 fuite prohibited/unverified/CATEGORY/AMBIGUOUS, Reviewer indépendant, Release Certifier.

**Merge interdit avant ≥9/10.**

### PR #473 — SEARCH-UX-1 Inventory-first cards & responsive grid 🟠 P0 PARALLÈLE

Branche : `feat/search-ux-1-cards-grid`.

Responsabilité : densité et scan Search.

Cible :

- wide desktop : **4 cartes/ligne** ;
- desktop : **3** ;
- tablette/mobile : **2** ;
- cards image-first compactes ;
- whole-card click ;
- CTA secondaires réduits ;
- provenance/truth/favoris conservés.

Certification obligatoire : desktop 1440×900 ≥9/10 + mobile 390×844 ≥9/10 + Chromium multi-viewports + Search Truth + build/typecheck.

**Dépendance de merge :** #473 peut être certifiée visuellement en parallèle, mais doit être réalignée sur le `main` obtenu après toute PR Search/Ranking mergée avant elle, notamment #474 si #474 merge en premier. Rejouer ensuite l’intégralité des gates Search/UX.

## RECONCILIATION REQUIRED

### PR #454 — DATA-4.9C Source Policy Decision & Registry Assignment 🟠

Cette PR n’est pas une simple vieille branche : **une mutation restrictive production a déjà été appliquée**.

État certifié :

- `agadirimmobilier.ma` → `permission_required + hidden + internal_signal_only` ;
- Val Foncier / Christie’s / Immo Maroc / ProImmobilier / Capital Properties → `unverified` ;
- **0 source autorisée** ;
- DATA-4.9D ingestion de ce cohort = **BLOCKED_BY_POLICY**.

Avant merge/close : comparer #454 au `main` actuel + Registry live, conserver la mutation Agadir, identifier le résidu encore nécessaire, reconstruire/rebaser seulement ce résidu, rejouer CI + audit Registry, double-check ≥9/10. Si tout le code est supersédé mais la DB est déjà correcte, fermer explicitement comme superseded après closeout documentaire.

## BACKLOG À REVALIDER AVANT REPRISE

### PR #310 — Professional auth/session/RLS hardening 🔵 SECURITY BACKLOG

Vieille architecture. Ne pas merger telle quelle. Re-auditer le `main` actuel : clients Supabase, `/api/pro/*`, request-scoped user client, service-role boundary, RLS/RPC et isolation inter-tenant. Si le finding existe encore, reconstruire un lot frais sur current main avec PostgreSQL réel + Security Reviewer + score ≥9/10. Sinon fermer #310 comme superseded.

## SUPERSEDED CANDIDATES / HISTORIQUE

### PR #383 — Permanent AkarFinder agent governance

Une grande partie de sa doctrine est déjà absorbée par la gouvernance actuelle : roadmap unique, Builder/Reviewer/Certifier, score ≥9, preuves exact-head. Ne pas merger un snapshot ancien en bloc. Comparer au current main ; ne conserver qu’une capacité réellement absente. Sinon fermer comme superseded.

### Anciennes PR ouvertes

Les anciennes PR UX Preview, anciens ODM/DATA P0, recrawl/intelligence, vieux docs et expérimentations ne sont **pas** réactivées par défaut simplement parce qu’elles restent `OPEN` sur GitHub. Leur code est historique jusqu’à preuve contraire.

Règle de reprise :

`CURRENT MAIN AUDIT → UNIQUE VALUE CHECK → REBUILD ON CURRENT MAIN → DOUBLE CHECK ≥9 → NEW/REALIGNED PR`

Pas de merge direct d’une branche historique sur `main`.

---

# 3. Lane DATA — MASS COVERAGE + PARTNER CONVERSION

## Baseline utile

- Thin Index observé : ~56,8k documents ;
- réservoir historique `blocked_quality` : ~11,8k à réauditer selon doctrine MASS-FIRST ;
- DATA-4.9B : **2 326 représentations URL structurellement compatibles détail**, pas 2 326 biens uniques.

## DATA-MASS-FIRST

Porté actuellement par #474 : qualité ≠ droit d’exister ; une annonce admissible pauvre reste visible plus bas grâce au Listing Power.

## DATA-4.9C

Voir registre #454 : décision déjà exécutée partiellement en production, réconciliation requise.

## DATA-4.9D

**LOCKED pour le cohort 4.9C** : aucune source autorisée.

## DATA-4.10A — Authorization Conversion & Partner Feed Readiness 🔵 NEXT DATA

Read-only en priorité : dossiers de permission/partenariat, contact officiel, upside inventaire, proposition canonical-link/public-facts ou feed/API, provenance, suppression, dédup, fraîcheur. Aucun scraping additionnel, aucun Registry write implicite, aucune activation.

En parallèle, MASS COVERAGE continue uniquement sur les sources déjà admissibles par policy.

## Handoff Carte exact-scope

DATA doit aussi produire la preuve indépendante Registry + profondeur/fraîcheur exacte nécessaire à Marrakech / Guéliz / rent / `surface_m2` avant tout replay P1C.4A/P1C.4.

---

# 4. Lane UX / Search

## PR #473 — ACTIVE

C’est désormais le lot officiel de densité Search : 4/3/2/2, cards compactes et inventory-first.

## CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1 🔵 APRÈS #473

Read-only. Mesurer couverture réelle, répétition, fallback rate, échec distant, authorized thumbnail vs city_type vs city vs type vs neutral, y compris Rabat real-photo. Aucun nouvel asset avant cette mesure.

## Règle d’intégration #473 ↔ #474

#474 modifie Search policy/ranking SQL ; #473 modifie principalement UX/cards/grid. Ils peuvent avancer en parallèle, mais **le second à merger doit se réaligner sur le premier merge**, puis rejouer Search Truth, typecheck, build et certification UX/Ranking pertinente. Aucun merge sur base stale accepté.

---

# 5. Lane Carte / Geo

Détail historique : `docs/CARTE_ROADMAP.md`.

Acquis : P1A.1→P1A.6, P1B.1→P1B.15, P1C.1, P1C.2, P1C.3, P1C.4, P1C.4A.

État :

- Offre quartier publique **OFF** ;
- P1C.4 = `NOT_CERTIFIABLE` ;
- P1C.4A = `DESIGNED_NOT_PROVEN` ;
- P1C.5 **LOCKED**.

Ordre : DATA exact-scope evidence → replay P1C.4A → replay P1C.4 → seulement si certified, P1C.5 canary → P1C.6 observation → P1C.7 scoped ON. Choroplèthe seulement avec géométrie neighborhood-grade sourcée et certifiée.

Chaque étape : double check + note ≥9/10.

---

# 6. Lane Security / Professional

## AUTH-RLS-REVALIDATION 🔵 BACKLOG IMPORTANT

Source : PR historique #310.

Après stabilisation de #474/#473, exécuter un audit current-main court pour déterminer si la séparation user-scoped/service-role et l’isolation inter-tenant restent une dette réelle. Si oui : nouveau lot dédié frais. Si non : fermer #310.

---

# 7. Ordre d’exécution global

```text
PARALLÈLE P0
├─ #474 MASS-FIRST Search policy/ranking          🟠 certification
└─ #473 SEARCH-UX-1 4/3/2/2 cards/grid           🟠 certification visuelle

APRÈS PREMIER MERGE SEARCH
→ réaligner l’autre PR sur current main
→ rerun gates complets
→ merge seulement si score ≥9/10

DATA
→ reconcile/close #454 DATA-4.9C
→ DATA-4.10A Authorization / Partner Feed Readiness
→ MASS COVERAGE uniquement sur sources admissibles

UX
→ Contextual Illustrations Coverage Audit

CARTE
→ DATA exact-scope evidence
→ P1C.4A/P1C.4 replay
→ éventuel P1C.5

SECURITY
→ re-audit #310 sur current main

CLEANUP
→ audit des anciennes PR OPEN
→ fermer explicitement les superseded ; ne jamais les merger par inertie
```

---

# 8. Template obligatoire pour tout nouveau lot

```text
LOT-ID — Nom
Responsabilité unique :
Lane :
Dépend de :
Branche :
PR :
État : PLANNED / CODED / REVIEW / CERTIFIED / MERGED / CLOSED / SUPERSEDED
Preuves :
Double check findings :
Score initial /10 :
Corrections :
Score final /10 :
CI exact-head :
Production/rehearsal :
Rollback :
Conflits/dépendances avec autres PR :
Prochaine étape :
```

**Interdiction de marquer CLOSED si `Score final < 9,0`.**
