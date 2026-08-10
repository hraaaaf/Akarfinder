# AKARFINDER — ROADMAP CANONIQUE UNIQUE

**Version : 2026-08-10 20:58 +01:00**  
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

- **Lane :** DATA / Search policy & ranking.
- **Responsabilité :** rendre Search mass-first sans affaiblir Source Policy : Source Policy public gate → Quality ≠ Eligibility → Listing Power Score 0–100 → ranking public par Listing Power → mass reclassification + certification fail-closed.
- **Dépendances :** `main@f4563602119c8c01298bf694285e35856097bbd6`; Source Registry/policies actuels ; Search Truth ; reclassification production/rehearsal ; coordination de merge avec #473.
- **Branche :** `feat/mass-first-search-quality-policy`.
- **PR :** #474.
- **État :** `ACTIVE / CODED / CERTIFICATION REQUIRED`.
- **Preuves :** 5 migrations MASS-FIRST dans la PR ; roadmap unifiée ; invariants fail-closed décrits dans la PR.
- **Double check / score :** **8,8/10 provisoire — NON CERTIFIÉ**.
- **Blockers :** CI exact-head complète, PostgreSQL/Supabase réel ou rehearsal fidèle, rapports MASS-FIRST, audit ACL/`SECURITY DEFINER`, plan/perf Search, before/after inventory, tests Q0/Q1, 0 fuite prohibited/unverified/CATEGORY/AMBIGUOUS, Reviewer indépendant, Release Certifier.
- **Prochaine étape :** corriger tout finding, re-test, re-score ≥9/10 ; merge interdit avant certification.

### PR #473 — SEARCH-UX-1 Inventory-first cards & responsive grid 🟠 P0 PARALLÈLE

- **Lane :** UX / Search.
- **Responsabilité :** densité et scan Search : wide desktop 4 cartes/ligne, desktop 3, tablette/mobile 2 ; cards image-first compactes ; whole-card click ; CTA secondaires réduits ; provenance/truth/favoris conservés.
- **Dépendances :** Search Truth + contracts UX ; ordre de merge avec #474. Le second à merger doit repartir du nouveau `main`.
- **Branche :** `feat/search-ux-1-cards-grid`.
- **PR :** #473.
- **État :** `ACTIVE / IMPLEMENTED / VISUAL CERTIFICATION IN PROGRESS`.
- **Preuves :** smoke UI/accessibilité GitHub Actions observé sur **12 routes × 4 viewports = 48 captures, 0 finding** ; PR mergeable sur sa base actuelle.
- **Double check / score :** smoke technique positif, mais **score final indépendant non encore enregistré** ; certification requiert desktop 1440×900 ≥9/10 et mobile 390×844 ≥9/10.
- **Blocker :** réalignement obligatoire après toute PR Search/Ranking mergée avant elle, notamment #474 si #474 merge en premier, puis rerun de tous les gates Search/UX.
- **Prochaine étape :** double-check visuel indépendant → note desktop/mobile → corrections si <9 → re-test → re-note → certification.

## RECONCILIATION REQUIRED

### PR #454 — DATA-4.9C Source Policy Decision & Registry Assignment 🟠

- **Lane :** DATA / Source Policy.
- **Responsabilité :** décider la policy des gagnants 4.9B et matérialiser uniquement les décisions démontrées.
- **Dépendances :** preuves officielles actuelles, Registry live, comparaison exacte avec current `main`, préservation de la mutation restrictive Agadir déjà appliquée.
- **Branche :** `data/data-4-9c-source-policy-decision-registry-assignment`.
- **PR :** #454.
- **État :** `RECONCILIATION REQUIRED` — vieille base, mais effet production réel.
- **Preuves :** `agadirimmobilier.ma → permission_required + hidden + internal_signal_only`; Val Foncier / Christie’s / Immo Maroc / ProImmobilier / Capital Properties restent `unverified`; **0 source autorisée**.
- **Double check / score :** décision source certifiée dans la fenêtre d’origine, mais **score de closeout current-main à refaire** ; aucun CLOSED avant ≥9/10.
- **Blocker :** DATA-4.9D pour ce cohort = **BLOCKED_BY_POLICY** ; la PR ne peut pas être mergée telle quelle depuis sa vieille base.
- **Prochaine étape :** comparer diff #454 + Registry live au current main, conserver Agadir, reconstruire seulement le résidu nécessaire, CI exact-head + Registry read-only audit + score ≥9 ; sinon fermer explicitement comme superseded après closeout documentaire.

## BLOCKED / REVALIDATION REQUIRED

### PR #310 — Professional auth/session/RLS hardening 🔵

- **Lane :** Security / Professional.
- **Responsabilité :** séparation auth/session/service-role et isolation RLS inter-tenant.
- **Dépendances :** audit actuel `/api/pro/*`, clients Supabase, RLS/RPC, request-scoped user context.
- **Branche :** `agent/b3-5-3-professional-auth-rls`.
- **PR :** #310.
- **État :** `BLOCKED` — vieille architecture ; revalidation obligatoire avant reprise.
- **Preuves :** PR historique documente le finding, mais aucune preuve current-main ne permet un merge direct.
- **Double check / score :** **non applicable tant que l’audit current-main n’est pas rejoué** ; futur lot doit atteindre ≥9/10 avec Security Reviewer indépendant.
- **Blocker :** architecture potentiellement divergente depuis la création de la PR.
- **Prochaine étape :** re-audit current main ; si finding encore réel, reconstruire un lot frais avec PostgreSQL réel + tests explicites d’isolation ; sinon fermer #310 comme superseded.

## SUPERSEDED CANDIDATE / RECONCILIATION

### PR #383 — Permanent AkarFinder agent governance

- **Lane :** Governance.
- **Responsabilité :** gouvernance permanente agents/Reviewer/Certifier.
- **Dépendances :** comparer ses capacités au current main et à cette roadmap unique.
- **Branche :** `agent/p0-gov-1-agent-governance`.
- **PR :** #383.
- **État :** `RECONCILIATION REQUIRED / SUPERSEDED CANDIDATE`.
- **Preuves :** roadmap unique, séparation Builder/Reviewer/Certifier et gate ≥9/10 sont déjà absorbés dans le current roadmap/main.
- **Double check / score :** pas de score current-main ; aucune certification valide pour merger le snapshot historique.
- **Blocker :** base `13b6c3c...` très ancienne par rapport au current main.
- **Prochaine étape :** unique-value check ; garder uniquement une capacité réellement absente, sinon fermer comme superseded avec preuve successor/current-main.

## CLOSED / HISTORICAL — fenêtre DATA-4.4C réconciliée

### DATA-4.4C — Persistent Promo Immo Canary 50 ✅ CLOSED

- **Lane :** DATA / Freshness / Search projection safety.
- **Responsabilité :** persister exactement le canary 50 préparé par DATA-4.4B sans dégrader Thin Index/Search, avec rollback et drift ≤1%.
- **Dépendances :** DATA-4.4B PR #380 ; manifest immuable 50/50 ; Registry Promo Immo ; Search/display/quality gates.
- **Branches :** `agent/data-4-4c-freshness-projection-safety` (#384) puis `agent/data-4-4c-closeout` (#385).
- **PR :** #384 safety fix + #385 closeout documentaire ; toutes deux mergées.
- **État :** `CLOSED / HISTORICAL`, non réactivable automatiquement.
- **Preuves :** première écriture a révélé un rebuild Thin Index lossy ; rollback immédiat ; projections restaurées depuis snapshots A5.2/A5.3/A5.4 ; #384 merge `ba65943ab71e57eabbe96b0641e8cbdc544ed891` ; migration production appliquée ; replay live 4.4B avant second write ; persistent write **50/50** ; fresh-confirmed **50/50** ; `public_sitemap_presence` **50/50** ; Public Search **50/50** ; technical display **50/50** ; quality A/B **50/50** ; projection préservée **50/50** ; drift **0%** ; Registry inchangé ; Promo Immo final **3 005 total / 59 fresh / 2 946 seed_only / 50 sitemap-presence** ; #385 **21/21 workflows exact-head verts**, merge `c036bb061ce4d083e264254387b8eac77f53b565`.
- **Double check / score :** double-check de réconciliation 2026-08-10 = **9,6/10**. Justification : incident détecté fail-closed, rollback effectif, root cause corrigée, second write atomique, re-certification indépendante à drift 0, closeout exact-head vert. Cette note est une **note de réconciliation**, pas une réécriture du score historique d’origine.
- **Blocker :** aucun blocker résiduel du lot ; expansion automatique +100/+500 explicitement interdite par son closeout.
- **Prochaine étape :** aucune dans cette lane historique ; les décisions DATA ultérieures 4.7/4.9 et MASS-FIRST prévalent désormais.

## Classification exhaustive des PR encore OPEN — snapshot 2026-08-10 20:57 +01:00

Le tableau ci-dessous empêche toute vieille PR `OPEN` d’être interprétée comme active par inertie.

| PR | Classification canonique | Motif / règle de reprise |
|---|---|---|
| #474 | **ACTIVE** | MASS-FIRST P0 actuel ; certification ≥9 requise. |
| #473 | **ACTIVE** | SEARCH-UX-1 P0 parallèle ; réalignement après premier merge Search. |
| #454 | **RECONCILIATION REQUIRED** | Mutation Registry production déjà appliquée ; old base. |
| #383 | **RECONCILIATION REQUIRED** | Gouvernance largement absorbée ; unique-value check avant fermeture/mini-port éventuel. |
| #310 | **BLOCKED** | Security current-main audit requis avant reprise. |
| #228 | **SUPERSEDED** | Ancienne preview Desktop V2 ; Search actuel + #473 ont remplacé cette direction. |
| #229 | **SUPERSEDED** | Ancienne preview Mobile V2 ; remplacée par les lots Search mergés + #473. |
| #230 | **SUPERSEDED** | Ancienne intégration SERP preview ; current `/search` a évolué au-delà. |
| #231 | **SUPERSEDED** | Anciennes cards V2 preview ; cards actuelles + #473 sont la lane canonique. |
| #232 | **SUPERSEDED** | Preview cumulative LOTS 1–5 historique. |
| #234 | **SUPERSEDED** | Preview cumulative V2 historique. |
| #250 | **SUPERSEDED** | Ancienne SERP V2 paginée ; remplacée par la chaîne Search certifiée et #473. |
| #81 | **SUPERSEDED** | Ancienne Search Entry refinement ; Search UX actuel a été reconstruit/certifié depuis. |
| #282 | **SUPERSEDED** | Ancienne réécriture roadmap ; cette roadmap unique est son successeur. |
| #52 | **SUPERSEDED** | Ancienne consolidation documentaire ; hiérarchie documentaire actuelle la remplace. |
| #337 | **HISTORICAL** | Closeout P1A.2 ancien ; aucune reprise nécessaire sans besoin explicite. |
| #319 | **HISTORICAL** | Adaptive partition DATA ancien ; re-audit current main avant toute valeur résiduelle. |
| #289 | **HISTORICAL** | A5.4 recovery ancien ; ne pas réactiver un write historique. |
| #255 | **HISTORICAL** | Honest Listing Depth baseline ancienne ; les lanes DATA actuelles ont progressé au-delà. |
| #113 | **HISTORICAL** | ODM-09 activation gate ancien ; current Search contracts prévalent. |
| #133 | **HISTORICAL** | ODM-10C4 acquisition ancienne ; current Registry/MASS-FIRST prévalent. |
| #54 | **HISTORICAL** | Bulk seed confirmation ancien ; ne pas reprendre sans current-main audit. |
| #126 | **HISTORICAL** | Transactional recrawl activation ancien ; migrations/état prod doivent être réaudités avant toute reprise. |
| #125 | **HISTORICAL** | Authorized source adapter ancien ; aucune permission actuelle ne doit être inférée de cette PR. |
| #124 | **HISTORICAL** | Recrawl scheduler ancien ; revalidation policy/architecture obligatoire. |
| #121 | **HISTORICAL** | Freshness Lifecycle ancien ; current freshness pipeline prévaut. |
| #118 | **HISTORICAL** | Observation Ledger ancien ; current main doit être audité avant toute reprise. |
| #115 | **HISTORICAL** | Property Intelligence backfill ancien ; aucune activation publique implicite. |
| #110 | **HISTORICAL** | Property Intelligence foundation ancienne ; current architecture d’abord. |

Règle universelle pour `HISTORICAL`/`SUPERSEDED` :

`CURRENT MAIN AUDIT → UNIQUE VALUE CHECK → REBUILD ON CURRENT MAIN SI NÉCESSAIRE → DOUBLE CHECK → SCORE ≥9 → NEW/REALIGNED PR`

Aucun merge direct d’une branche historique sur `main`.

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
→ fermer explicitement les PR SUPERSEDED après vérification successor/current-main
→ laisser HISTORICAL non actives tant qu’aucun unique-value check ne justifie une reconstruction
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

---

# 9. Réconciliation fenêtre MON-PROJET → Carte / Quartier

## MON-PROJET-P1B — projet actif dans Search ✅ MERGED / HISTORICAL

- **Lane :** UX / Mon Projet → Search continuity.
- **Responsabilité :** conserver le contexte du projet actif jusque dans `/search` et rattacher favoris/comparaisons au même `project_id`, sans stockage parallèle.
- **Dépendances :** MON-PROJET-P1A #314 ; `/api/me/continuity` ; User Continuity V1 ; Search existant ; synchronisation avec DATA-COVERAGE-1 avant merge.
- **Branche :** `ux/mon-projet-p1b`.
- **PR :** #318 ; remplace/supersède la tentative #315.
- **État :** `MERGED / HISTORICAL` — merge `29306523a4d1ad11d089299b1c7ed6a090063ebd` sur head exact `7f1e9b10162adad4c9a9694df9117ba053fd9e05`.
- **Preuves :** bandeau `Projet actif` dans Search ; validation du projet via `/api/me/continuity` ; favoris/comparaisons filtrés par `project_id` ; accès `/mon-projet/espace` ; aucune migration, aucun `localStorage`, aucun stockage parallèle ; `Canonical Baseline Validation` workflow_dispatch run #784 **SUCCESS** sur le head final avant merge.
- **Double check / score :** certification fonctionnelle finale PASS ; **aucune note UX indépendante finale /10 n’a été archivée dans #318**. Pour respecter la règle universelle, ce lot n’est pas requalifié artificiellement en `CLOSED ≥9`; il reste `MERGED / HISTORICAL` et devra être re-audité avec score ≥9 uniquement si une nouvelle modification Mon Projet/Search le rouvre.
- **Blocker :** aucun blocker runtime identifié au merge ; l’incident GitHub Actions ayant perturbé la certification était externe et résolu par un run manuel sur le head exact.
- **Prochaine étape :** aucune reprise automatique. Toute évolution Mon Projet doit être un nouveau lot current-main avec double check, score ≥9 et certification.

## Audit Carte / Quartier initié dans cette fenêtre — AUCUN NOUVEAU LOT OUVERT

- **Lane :** Carte / Geo.
- **Responsabilité :** audit exploratoire seulement ; aucune responsabilité d’implémentation n’a été ouverte.
- **Dépendances :** lane Carte canonique existante P1C.4/P1C.4A et preuve DATA exact-scope.
- **Branche :** aucune.
- **PR :** aucune.
- **État :** `STOPPED BEFORE IMPLEMENTATION / ABSORBED BY CANONICAL CARTE LANE`.
- **Preuves :** lecture de `/search`, `SearchMapPanel`, `SearchMapNeighborhoodDock`, explorer ville→quartier, choroplèthe Casablanca, benchmark prix et invariants géographiques ; **0 code, 0 migration, 0 commit, 0 PR** issus de cet audit.
- **Double check / score :** **non scoré** car audit interrompu avant verdict et avant définition d’un lot ; aucune note artificielle n’est créée.
- **Blocker :** P1C.4A reste `DESIGNED_NOT_PROVEN`, P1C.4 `NOT_CERTIFIABLE`, P1C.5 `LOCKED`; Offre quartier publique OFF jusqu’à preuve DATA exact-scope et replays certifiés.
- **Prochaine étape :** ne pas créer de roadmap parallèle. Suivre strictement : DATA exact-scope evidence → replay P1C.4A → replay P1C.4 → éventuel P1C.5, avec double check et score ≥9 à chaque étape.
