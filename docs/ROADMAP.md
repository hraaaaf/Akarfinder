# AKARFINDER — ROADMAP CANONIQUE UNIQUE

**Version : 2026-08-10 20:57 +01:00**  
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

### PR #475 — Search visual roadmap alignment 🟦 ACTIVE / DEPENDENT

- **Lane :** UX / Search documentation & visual audit.
- **Responsabilité :** aligner le programme visuel Search et son audit live sur la roadmap unifiée, sans runtime change.
- **Dépendances :** PR #474 ; branche empilée sur `feat/mass-first-search-quality-policy`.
- **Branche :** `audit/live-rabat-search-20260810`.
- **PR :** #475, DRAFT.
- **État :** `ACTIVE / DEPENDENT ON #474`.
- **Preuves :** Product Design live capture + patch docs-only annoncés dans la PR ; diff final doit rester borné à ROADMAP/SESSION.
- **Double check / score :** piloté dans la fenêtre #475 ; aucune certification autonome ne doit être inférée depuis son statut OPEN.
- **Blocker :** #474 doit être réconciliée/mergée avant intégration à `main` ; retarget/rebase ensuite requis.
- **Prochaine étape :** préserver le delta UX/Search, retarget sur current main après #474, vérifier diff docs-only puis certifier selon son propre score.

### PR #476 — Carte P1C roadmap alignment 🟦 ACTIVE / DEPENDENT

- **Lane :** Carte / documentation cross-window.
- **Responsabilité :** inscrire P1C.1→P1C.5, leurs preuves, scores de réconciliation, blockers et handoff DATA dans la roadmap maître sans toucher aux autres lanes.
- **Dépendances :** PR #474 ; `docs/CARTE_ROADMAP.md` + PR #463/#464/#465/#466/#469/#472 comme preuves historiques ; current `main@f456360...`.
- **Branche :** `feat/p1c4a-acquisition-source-universe` réalignée sur la tête #474 avant patch documentaire.
- **PR :** #476, DRAFT.
- **État :** `ACTIVE / DOCS-ONLY / DEPENDENT ON #474`.
- **Preuves :** diff contre head #474 limité à `docs/ROADMAP.md` + `docs/SESSION.md` ; P1C live/CI/merge evidence réconciliée ci-dessous.
- **Double check / score :** scope documentaire en cours de validation ; aucune fermeture avant vérification du diff final et dépendance #474.
- **Blocker :** ne pas merger vers `main` avant #474 ; après #474, retarget/rebase et revérifier que le delta reste Carte/P1C only.
- **Prochaine étape :** CI/diff review de #476 → après merge #474, retarget → re-test docs/gates applicables → score/certification → merge.

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
| #476 | **ACTIVE / DEPENDENT** | Docs Carte/P1C empilés sur #474 ; pas de merge indépendant. |
| #475 | **ACTIVE / DEPENDENT** | Docs Search visuel empilés sur #474 ; pas de merge indépendant. |
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
- **DATA-4.9B ✅ CLOSED — PR #452**, merge `45631345a6efb653256273354d2fb903b33c1ff9` : **2 326 représentations URL structurellement compatibles détail**, pas 2 326 biens uniques.

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

Cette preuve Carte **ne doit pas être absorbée implicitement par DATA-4.9C/#454** : #454 est une réconciliation Source Policy sur une cohorte distincte et ancienne. Si l’evidence Guéliz exige de nouvelles observations, un nouveau lot DATA borné doit être créé avec sa propre branche/PR, sans write ni acquisition non autorisée par simple continuité.

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

Détail historique : `docs/CARTE_ROADMAP.md`. Cette section est la vérité cross-window ; la roadmap spécialisée ne peut que la détailler.

## Préconditions Geo fermées — P1B.9 → P1B.15 ✅

La micro-chaîne ayant ouvert P1C est fermée : P1B.9 #439 review Tier A read-only → P1B.10 #443 design Registry/rollback → P1B.11 #447 write Registry Dakhla + Hay Mohammadi, Map/SEO OFF → P1B.12 #450 canary **8/8 Agadir** → P1B.13 #455 + micro-chaîne Oasis, canary **5/5 Oasis** → P1B.14 #461 typed geometry (**16 arrondissements OSM admin_level=10, 0 polygon quartier certifié**) → P1B.15 #462, merge `9856e7a947e0796acef87502c9c13cc45891084c`, lineage **13/13** et P1C Shadow autorisé seulement. Aucun de ces lots n’autorise l’exposition publique Offre ni un choroplèthe quartier.

Ces préconditions sont `CLOSED/HISTORICAL` pour la fenêtre actuelle ; les preuves détaillées restent dans `docs/CARTE_ROADMAP.md` et les PR concernées. Elles ne sont pas des prochaines étapes.

## P1C.1 — Offre quartier Shadow ✅ CLOSED

- **Lane :** Carte / Intelligence Offre quartier.
- **Responsabilité :** construire une couche métrique interne-only quartier à partir de Geo certifié, en gardant prix/surface/prix-m² manquants explicitement `NULL` et sans activation publique.
- **Dépendances :** P1B.15 #462 ; territorial join P1B.3 ; Geo latest-event-first.
- **Branche :** `agent/carte-p1c1-neighborhood-offer-shadow`.
- **PR :** #463 ; merge `9c53a99924d6ae577ce099ae5ef58f7f35834a0c`.
- **État :** `CLOSED / SHADOW ONLY`.
- **Preuves :** exact-head **22/22 PASS** + 4/4 push gates exact-merge ; production views/functions uniquement ; **102/102** listings Geo dans Shadow, **18 quartiers**, **32 segments**, prix **9/102**, surface **84/102**, prix/m² **6/102**, **71 fresh_confirmed / 31 seed_only** ; ACL service-role only ; public/reliability/metric layers OFF.
- **Double check / score :** **9,4/10 — note de réconciliation 2026-08-10**. Truth boundary, ACL, absence d’imputation, live counts et CI revérifiés ; aucun score historique absent n’est inventé.
- **Blocker :** aucune publication possible sans Reliability puis Representativeness.
- **Prochaine étape :** exécutée via P1C.2.

## P1C.2 — Reliability Engine ✅ CLOSED

- **Lane :** Carte / Intelligence Offre quartier.
- **Responsabilité :** évaluer séparément `price_mad`, `surface_m2`, `price_per_m2_mad` par quartier × transaction avec une policy versionnée `insufficient → limited → moderate → strong`, sans confondre fiabilité d’échantillon et représentativité marché.
- **Dépendances :** P1C.1.
- **Branche :** `agent/carte-p1c2-neighborhood-offer-reliability` ; correction gate `agent/carte-p1c1-preflight-rpc-free`.
- **PR :** #464 + hotfix #465 ; merges `9f158648892e2412338cd736c7112a1720bb7dae` puis `a7d9e25cd5f59bd63aef6187febcf713e45e05f1`.
- **État :** `CLOSED`.
- **Preuves :** #464 exact-head **23/23 PASS** ; push gate a détecté un timeout du vieux RPC global, corrigé fail-closed par #465 ; hotfix exact-head **20/20 PASS**, puis P1C.1/P1C.2 push gates verts. Production : **32 segments / 96 metric rows = 92 insufficient / 3 limited / 1 moderate / 0 strong** ; seul candidat moderate = Marrakech / Guéliz / rent / `surface_m2`, **n=10 / 9 fresh / 3 sources** ; `market_representativeness_certified=false`, activation OFF.
- **Double check / score :** **9,5/10 — note de réconciliation** après cycle réel `finding → correction → re-test` de #465. Le timeout n’a pas été masqué ; la dépendance lourde a été supprimée et les predecessors rejoués.
- **Blocker :** reliability seule ne peut jamais autoriser SHADOW→CANARY.
- **Prochaine étape :** exécutée via P1C.3.

## P1C.3 — Activation Review ✅ CLOSED / HOLD

- **Lane :** Carte / Activation governance.
- **Responsabilité :** revoir read-only les métriques moderate/strong et empêcher toute auto-activation sans représentativité marché exacte.
- **Dépendances :** P1C.2.
- **Branche :** `agent/carte-p1c3-activation-review`.
- **PR :** #466 ; merge `26f0b676bb2f0be70caf75e03dcc98d4ef9f37f7`.
- **État :** `CLOSED / HOLD`, pas `CANARY`.
- **Preuves :** **102 Shadow / 32 segments / 96 métriques / 1 review candidate / 0 canary eligible / 0 price candidate** ; verdict `P1C3_ACTIVATION_REVIEW_HOLD`, raison `HOLD_MARKET_REPRESENTATIVENESS_REQUIRED` ; aucune migration/write/activation.
- **Double check / score :** **9,5/10 — note de réconciliation** : boundary read-only, absence d’auto-activation et handoff exact-scope confirmés contre PR et état Carte canonique.
- **Blocker :** représentativité marché indépendante absente.
- **Prochaine étape :** exécutée via P1C.4.

## P1C.4 — Acquisition Representativeness Qualification ✅ CLOSED / NOT_CERTIFIABLE

- **Lane :** Carte + DATA evidence boundary.
- **Responsabilité :** déterminer en lecture seule si le candidat Guéliz / rent / `surface_m2` possède un dénominateur d’acquisition indépendant, versionné et exact-scope.
- **Dépendances :** P1C.3 ; discovery evidence ; Source Policy Registry ; canaux acquisition existants.
- **Branche :** `agent/carte-p1c4-acquisition-representativeness`.
- **PR :** #469 ; merge `4546617bc676303e078b08275e76c5f6c7263d2f`.
- **État :** `CLOSED / NOT_CERTIFIABLE`.
- **Preuves :** candidat = **10 observations / 9 fresh / 3 sources** (Mubawab 6 / Mouldar 2 / Marrakech Realty 2) ; univers diagnostic Marrakech-rent **1 200 rows / 129 queries / 48 domaines / 1 provider** ; rang moteur 10 explicitement ≠ profondeur inventaire source ; **0** query acquisition exact Guéliz×rent ; **0** partner feed actif ; **0** run Common Crawl/public-index enregistré dans la table dédiée ; les 3 sources observées ne peuvent pas définir leur propre dénominateur. Exact-head **25/25 workflows SUCCESS** ; Reviewer + Release Certifier live replays PASS ; post-merge dédié également PASS.
- **Double check / score :** **9,6/10 — note de réconciliation** : aucune fausse couverture numérique n’est produite, circular denominator interdit, canaux et limites explicités.
- **Blocker :** `EXACT_NEIGHBORHOOD_DENOMINATOR_ABSENT`, univers exact-scope non versionné, profondeur/fraîcheur par source non prouvées, canaux non réconciliés.
- **Prochaine étape :** exécutée via P1C.4A.

### PR #470 — duplicate P1C.4 — SUPERSEDED / HISTORICAL

PR #470, branche `agent/carte-p1c4-representativeness-qualification`, a été créée concurremment avec #469. Elle a été fermée **sans merge** après que #469 ait mergé le même lot fonctionnel sur `main`. Elle n’est ni ACTIVE ni RECONCILIATION REQUIRED ; **ne pas la rouvrir ni forcer son diff**.

## P1C.4A — Acquisition Source Universe & Denominator Design ✅ CLOSED / DESIGNED_NOT_PROVEN

- **Lane :** Carte / DATA denominator design.
- **Responsabilité :** fixer un design de dénominateur indépendant/versionné/exact-scope/révocable pour Guéliz × rent sans utiliser le cohort observé comme définition du marché et sans mutation DATA.
- **Dépendances :** P1C.4 ; Source Policy Registry ; discovery exact-scope utilisé uniquement comme challenger de complétude.
- **Branche :** `feat/p1c4a-acquisition-source-universe`.
- **PR :** #472 ; merge `f4563602119c8c01298bf694285e35856097bbd6`.
- **État :** `CLOSED / DESIGNED_NOT_PROVEN`.
- **Preuves :** baseline indépendante versionnée **12 sources** ; market presence séparée des droits acquisition/reuse/display ; unknown geography = trou, jamais exclusion automatique ; source-level identifiability/channel/inventory-depth/freshness/known-holes requis avant preuve ; exact-scope discovery = challenger seulement. Exact-head **26/26 workflows SUCCESS** ; Reviewer et Release Certifier PASS ; post-merge run `31414213930` : Reviewer **SUCCESS** + Release Certifier **SUCCESS**, second live replay indépendant. Post-merge métier inchangé : Guéliz/rent/surface_m2 **10 samples / 9 fresh / 3 sources / moderate / SHADOW**, `market_representativeness=false`, `public_activation=false`, `metric_layers_activated=false`.
- **Double check / score :** **9,6/10 — note de réconciliation** : denominator circularity, read-only boundary, rights-vs-presence, challenger semantics, live replay et absence d’activation ont été revérifiés.
- **Blocker :** design complet mais non prouvé : sources exact-scope manquantes/à qualifier, profondeur d’inventaire par source absente, fraîcheur et channel reconciliation incomplètes, admissibilité variable. **Aucun pourcentage de couverture marché n’est autorisé à ce stade.**
- **Prochaine étape :** lot DATA séparé exact-scope pour Source Registry review/expansion et preuves depth/freshness/channel si nécessaire ; puis replay read-only P1C.4A → P1C.4.

## P1C.5 — Scoped Canary Activation Write 🔒 BLOCKED

- **Lane :** Carte / Activation write.
- **Responsabilité :** futur write borné d’une métrique quartier uniquement après certification réelle de représentativité.
- **Dépendances :** P1C.4A `PROVEN` + replay P1C.4 = `CERTIFIED` ; Geo truth et Reliability toujours valides.
- **Branche :** aucune — lot non ouvert.
- **PR :** aucune — lot non ouvert.
- **État :** `BLOCKED / NOT STARTED`.
- **Preuves :** P1C.4 = NOT_CERTIFIABLE ; P1C.4A = DESIGNED_NOT_PROVEN ; production reste SHADOW/OFF.
- **Double check / score :** non scoré : aucune implémentation ne doit commencer avant levée des blockers.
- **Blocker :** dénominateur marché non prouvé et evidence DATA exact-scope incomplète.
- **Prochaine étape :** DATA evidence → replay P1C.4A → replay P1C.4. Seulement après `CERTIFIED`, créer une branche/PR P1C.5 avec rollback avant mutation.

## Ordre Carte canonique

`DATA exact-scope evidence → replay P1C.4A → replay P1C.4 → si CERTIFIED seulement : P1C.5 canary → P1C.6 observation → P1C.7 scoped ON`.

Offre quartier publique **OFF**. Choroplèthe quartier également OFF tant qu’une géométrie neighborhood-grade sourcée, topology-validée et explicitement certifiée n’existe pas. Une géométrie d’arrondissement portant un nom similaire n’est jamais substituée à un quartier.

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

DOCS CROSS-WINDOW EMPILÉS SUR #474
├─ #475 Search visual alignment                   🟦 dependent
└─ #476 Carte/P1C alignment                       🟦 dependent

APRÈS PREMIER MERGE SEARCH
→ réaligner l’autre PR sur current main
→ rerun gates complets
→ merge seulement si score ≥9/10

DATA
→ reconcile/close #454 DATA-4.9C
→ DATA-4.10A Authorization / Partner Feed Readiness
→ produire séparément l’evidence exact-scope Guéliz si nécessaire
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
