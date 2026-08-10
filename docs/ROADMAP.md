# AKARFINDER — ROADMAP CANONIQUE UNIQUE

**Version : 2026-08-10 21:38 +01:00**  
**Autorité : ce fichier est l’unique roadmap d’exécution de toutes les fenêtres / lanes AkarFinder.**

`README.md` = identité/doctrine. `docs/SESSION.md` = handover court. Les fichiers spécialisés (`docs/CARTE_ROADMAP.md`, rapports d’audit, specs) sont des journaux/preuves et ne peuvent jamais définir une priorité concurrente.

---

# 0. Règles universelles

Toute fenêtre commence par :

1. `README.md` ;
2. `docs/ROADMAP.md` ;
3. `docs/SESSION.md` ;
4. la doc spécialisée de sa lane si nécessaire.

Toute idée, dette, audit, P, lot, PR, blocker ou prochaine étape doit être enregistrée ici, **même si le lot n’a pas encore commencé**.

## Gate obligatoire

`IMPLEMENTATION → DOUBLE CHECK INDÉPENDANT → NOTE /10 → CORRECTIONS → RE-TEST → RE-NOTE → CERTIFICATION`

- aucun lot `CLOSED` sous **9,0/10** ;
- si score <9 : findings → sous-étapes ici → correction → nouveau score ;
- CI exact-head verte est nécessaire mais insuffisante seule ;
- UX/UI : mobile et desktop scorés séparément lorsque pertinent, mobile ≥9 obligatoire ;
- DATA/Search/Backend : correctness, fail-closed/security, tests, performance, observabilité, rollback et architecture entrent dans la note ;
- Carte/Geo : provenance, exactitude géographique et absence d’inférence non prouvée entrent dans la note ;
- mutation production : before/after + rollback + replay ;
- lots critiques : Builder, Reviewer et Release Certifier distincts ;
- après merge : relire `main`, rejouer les gates critiques et synchroniser README/ROADMAP/SESSION.

## Statuts canoniques

`PLANNED → READY → IMPLEMENTING → REVIEW → CERTIFIED → MERGED → CLOSED`

États spéciaux : `BLOCKED`, `RECONCILIATION_REQUIRED`, `SUPERSEDED`, `HISTORICAL`.

Le statut GitHub `OPEN` ne rend jamais une PR active par lui-même.

---

# 1. North Star

AkarFinder = **moteur de recherche immobilier + index national + couche d’intelligence du marché marocain**.

Doctrine :

- **MASS FIRST → QUALITY LATER → PARTNER REPLACEMENT OVER TIME** ;
- une annonce juridiquement/structurellement admissible peut être pauvre et rester visible ;
- la qualité décide surtout **où elle ranke**, pas si elle existe ;
- `Listing Power` mesure la puissance informationnelle, jamais le droit d’affichage ;
- Source Registry autoritaire et fail-closed ;
- sitemap/robots/capability ≠ permission ;
- aucune donnée, photo, géométrie, coordonnée, prix ou partenariat inventé ;
- Search est le cœur ; Map est une projection spatiale de la même vérité ;
- `DISCOVERED ≠ AUDITED ≠ POLICY_ASSIGNED ≠ ELIGIBLE ≠ INGESTIBLE ≠ DISPLAYABLE` ;
- Shadow → Canary → observation → certification → activation bornée pour les changements sensibles.

---

# 2. Vue exécutive — ordre global

```text
P0 — SEARCH / MASS FIRST
├─ #474 MASS-FIRST policy/ranking                         ACTIVE — certification
└─ #473 SEARCH-UX-1 cards/grid 4/3/2/2                  ACTIVE — certification visuelle

Après premier merge Search
→ réaligner le second sur current main
→ rerun Search Truth + CI + double-check
→ score ≥9
→ merge

P0/P1 — DATA
├─ #454 DATA-4.9C                                       RECONCILIATION_REQUIRED
├─ DATA-4.10A Authorization / Partner Feed Readiness    PLANNED
├─ MASS-COVERAGE-ADMISSIBLE-1                           PLANNED
└─ DATA-EXACT-SCOPE-GUELIZ-1                            PLANNED — débloque Carte

P1 — SEARCH VISUAL
├─ SEARCH-VISUAL-REFERENCE-AUDIT-1                      REVIEW
├─ VISUAL-REPRESENTATION-ENGINE-1                       PLANNED
├─ VISUAL-CARD-COMPOSITION-1                            PLANNED
└─ RABAT-NEIGHBORHOOD-ACTIVATION-1                      PLANNED

P1 — CARTE / INTELLIGENCE QUARTIER
├─ P1C.4A replay après DATA exact-scope                 PLANNED
├─ P1C.4 replay                                          PLANNED
├─ P1C.5 bounded canary                                 LOCKED
├─ P1C.6 observation                                    PLANNED_AFTER_P1C5
└─ P1C.7 scoped public ON                               PLANNED_AFTER_P1C6

P1/P2 — SECURITY
└─ AUTH-RLS-REVALIDATION                                PLANNED / current-main audit

CLEANUP
├─ #383 unique-value check                              RECONCILIATION_REQUIRED
└─ anciennes PR superseded/historical                   close/rebuild seulement si valeur unique
```

---

# 3. Registre maître des fenêtres / PR actives ou dépendantes

## #474 — MASS-FIRST + roadmap unifiée 🟠 P0 ACTIVE

- **Lane :** DATA / Search policy & ranking.
- **Branche :** `feat/mass-first-search-quality-policy`.
- **PR :** #474.
- **Responsabilité :** Source Policy public gate → Quality ≠ Eligibility → Listing Power 0–100 → ranking → mass reclassification/certification.
- **État :** `ACTIVE / CODED / CERTIFICATION_REQUIRED`.
- **Score actuel :** **8,8/10 provisoire — NON CERTIFIÉ**.
- **Reste :** CI exact-head complète ; PostgreSQL/Supabase réel ou rehearsal fidèle ; rapports MASS-FIRST ; ACL/`SECURITY DEFINER` ; perf/plan Search ; before/after inventory ; Q0/Q1 ; 0 prohibited/unverified/CATEGORY/AMBIGUOUS public ; Reviewer ; Release Certifier.
- **Merge :** interdit avant score final ≥9.

## #473 — SEARCH-UX-1 Inventory-first cards & responsive grid 🟠 P0 ACTIVE

- **Lane :** UX / Search.
- **Branche :** `feat/search-ux-1-cards-grid`.
- **PR :** #473.
- **Responsabilité :** 4 cards wide desktop / 3 desktop / 2 tablette / 2 mobile ; cards compactes image-first ; whole-card click ; provenance/truth/favoris préservés.
- **État :** `ACTIVE / IMPLEMENTED / VISUAL_CERTIFICATION_IN_PROGRESS`.
- **Preuve actuelle :** smoke UI/accessibilité 12 routes × 4 viewports = 48 captures, 0 finding.
- **Score :** final indépendant non encore enregistré ; desktop 1440×900 ≥9 et mobile 390×844 ≥9 obligatoires.
- **Dépendance :** le second à merger entre #473/#474 doit repartir du nouveau `main` et rejouer tous les gates.

## #475 — Search Visual alignment 🟡 DEPENDENT

- **Lane :** UX / Search Visual.
- **Branche :** `audit/live-rabat-search-20260810`.
- **PR :** #475 draft, empilée sur #474.
- **Responsabilité :** documentation/audit du programme visuel Search.
- **État :** `BLOCKED / DEPENDENT_ON_#474`.
- **Important :** **les lots futurs qu’elle décrit sont désormais copiés dans cette roadmap maître ci-dessous** ; #475 n’est plus nécessaire comme source de vérité.
- **Après #474 :** retarget/rebase ; conserver uniquement une valeur documentaire non déjà absorbée ; sinon fermer superseded.

## #476 — Carte/P1C alignment 🟡 DEPENDENT

- **Lane :** Carte / Geo / Intelligence quartier.
- **Branche :** `feat/p1c4a-acquisition-source-universe`.
- **PR :** #476 draft, empilée sur #474.
- **Responsabilité :** réconciliation documentaire P1C.1→P1C.5.
- **État :** `BLOCKED / DEPENDENT_ON_#474`.
- **Important :** **la chaîne Carte passée et future est désormais enregistrée directement ici** ; #476 n’est plus nécessaire comme source de vérité.
- **Après #474 :** retarget/rebase ; ne conserver qu’un delta documentaire réellement absent ; sinon fermer superseded.

## #454 — DATA-4.9C Source Policy 🟠 RECONCILIATION_REQUIRED

- **Lane :** DATA / Source Policy.
- **Branche :** `data/data-4-9c-source-policy-decision-registry-assignment`.
- **PR :** #454.
- **Effet production déjà réel :** `agadirimmobilier.ma = permission_required + hidden + internal_signal_only`.
- Val Foncier / Christie’s / Immo Maroc / ProImmobilier / Capital Properties restent `unverified` ; **0 source autorisée**.
- **DATA-4.9D pour ce cohort :** `BLOCKED_BY_POLICY`.
- **Action :** comparer diff #454 + Registry live au current main ; préserver Agadir ; reconstruire uniquement le résidu nécessaire ; double-check + score ≥9 ; sinon closeout puis fermeture superseded.

## #310 — Professional auth/session/RLS 🔵 REVALIDATION

- **Lane :** Security / Professional.
- **État :** vieille branche, aucun merge direct.
- **Action :** audit current-main `/api/pro/*`, clients Supabase, RLS/RPC, user-scoped vs service-role et isolation inter-tenant.
- Si finding encore réel : nouveau lot frais + PostgreSQL réel + Security Reviewer + score ≥9.
- Sinon : fermer #310 superseded.

## #383 — Permanent agent governance 🔵 RECONCILIATION

La roadmap unique, Reviewer/Certifier et gate ≥9 absorbent déjà l’essentiel. Faire un `UNIQUE_VALUE_CHECK`; porter seulement une capacité réellement absente, sinon fermer superseded.

---

# 4. Lane DATA — MASS COVERAGE + PARTNER CONVERSION

## Baseline

- Thin Index observé : ~56,8k documents ;
- réservoir historique `blocked_quality` : ~11,8k ;
- DATA-4.9B #452 : **2 326 représentations URL structurellement compatibles détail**, pas 2 326 biens uniques ;
- DATA-4.4C : canary 50 fermé avec drift 0 %, réconciliation 9,6/10 ; aucune expansion automatique n’en découle.

## DATA-MASS-FIRST — porté par #474 🟠

**Objectif :** qualité ≠ éligibilité. Une annonce admissible pauvre reste visible plus bas grâce au Listing Power.

### Sous-lots #474

1. Source Policy public gate.
2. Quality ≠ Eligibility.
3. Listing Power Score 0–100 déterministe/explicable.
4. Ranking Search intégrant Listing Power.
5. Mass reclassification + certification fail-closed.

Tous doivent être certifiés ensemble avant merge #474.

## DATA-4.9C — #454 🟠 RECONCILIATION

Voir registre maître. Aucun droit d’ingestion ne doit être déduit de sitemap/robots/structure.

## DATA-4.9D — cohort 4.9C 🔒 LOCKED

Aucune source du cohort n’est actuellement autorisée. Ne pas créer de canary tant que la policy ne change pas sur preuve explicite.

## DATA-4.10A — Authorization Conversion & Partner Feed Readiness 🔵 PLANNED

**Responsabilité :** transformer les meilleures sources non autorisées en opportunités autorisées/partenaires.

Read-only d’abord :

- contact officiel / propriétaire de la donnée ;
- permission explicite ou proposition de partenariat ;
- feed/API/export/canonical-link/public-facts ;
- inventaire potentiel ;
- fraîcheur ;
- provenance ;
- suppression/takedown ;
- dédup ;
- modalités d’affichage ;
- aucune activation ou Registry write implicite.

**Sortie :** dossier par source + décision `READY_FOR_PERMISSION / PARTNER_FEED_CANDIDATE / HOLD / REJECT`.

## MASS-COVERAGE-ADMISSIBLE-1 🔵 PLANNED

**Responsabilité :** maximiser la couverture uniquement sur les sources déjà policy-admissibles.

- réauditer les lignes historiquement `blocked_quality` ;
- missing price/surface/photo ≠ exclusion ;
- exclure uniquement hard gates : source non admissible, non immobilier, faux signal, URL/canonical invalide, document non LISTING ;
- Listing Power faible = rang plus bas ;
- mesurer before/after : documents éligibles, primary/secondary, sources, villes, fraîcheur, duplication, latence Search ;
- canary/rollback si mutation massive.

**Dépend de :** #474 certifiée/mergée.

## DATA-EXACT-SCOPE-GUELIZ-1 🔵 PLANNED

**Responsabilité :** produire la preuve indépendante nécessaire à Carte pour `Marrakech / Guéliz / rent / surface_m2`.

Doit établir, sans inventer de dénominateur :

- source universe versionné ;
- policy/channel par source ;
- identifiabilité exacte ;
- profondeur inventaire ;
- fraîcheur ;
- known holes ;
- exact-scope acquisition evidence ;
- séparation stricte market presence / permission / display rights.

**Important :** ce lot est distinct de #454. Nouvelle branche/PR lorsqu’il démarre.

---

# 5. Lane UX / Search

## SEARCH-UX-1 — #473 🟠 ACTIVE

Voir registre maître.

## SEARCH-VISUAL-REFERENCE-AUDIT-1 🟠 REVIEW

**Responsabilité :** comparer Search Rabat live à la référence approuvée desktop/mobile avant nouvelle implémentation visuelle.

- preuves : Product Design run `31417065973` SUCCESS ; artifact `9073861382` ; captures 1440×900 / 390×844 ;
- scorer : architecture, header/search, filtres, densité, cards, hiérarchie, visual stack, mobile 2-colonnes, actions, navigation, accessibilité visible ;
- convertir findings en P0/P1/P2 ;
- aucun score final inventé avant revue.

## AKAR VISUAL STACK — doctrine cible

`PROPERTY_PHOTO → BUILDING/STREET_PHOTO → DISTRICT_PHOTO → CITY_PHOTO → TYPE_ILLUSTRATION → NEUTRAL`

Règles :

- photo réelle autorisée du bien = priorité absolue ;
- building/street seulement avec preuve géographique suffisante ;
- district seulement avec quartier structuré/certifié ;
- city seulement avec ville structurée/certifiée ;
- illustrations type restent des fallbacks explicites, jamais pseudo-photo du bien ;
- aucune image fictive/générée ne représente un quartier ou bien réel ;
- disclosure explicite pour photo d’ambiance ;
- aucune activation quartier depuis titre/snippet libre seul ;
- sélection déterministe/stable ;
- mobile 2 cards/ligne reste invariant.

## VISUAL-REPRESENTATION-ENGINE-1 🔵 PLANNED

**Responsabilité :** resolver central du Visual Stack retournant `visual_type`, asset/source, disclosure et niveau de vérité.

**Dépend de :** audit visuel final + #473/#474 stabilisées.

Tests obligatoires :

- property photo prioritaire ;
- quartier structuré → district photo ;
- ville seule → city photo ;
- type seul → illustration type ;
- contexte absent → neutral ;
- titre contenant `Agdal` avec `neighborhood=null` ne doit jamais activer Agdal.

## VISUAL-CARD-COMPOSITION-1 🔵 PLANNED AFTER ENGINE

**Responsabilité :** composer visuel réel/contextuel + identité AkarFinder + type de bien sans deux images concurrentes.

**Dépend de :** Visual Engine certifié + #473 certifiée.

Certification : 1440×900 + 360/390 ; 4/3/2/2 ; disclosures lisibles ; 0 confusion photo du bien / photo d’ambiance.

## RABAT-NEIGHBORHOOD-ACTIVATION-1 🔵 PLANNED AFTER ENGINE

**Responsabilité :** augmenter l’usage réel des 40 photos Rabat uniquement avec signaux quartier structurés/certifiés.

Signaux admissibles : source structurée, adresse normalisée, coordonnées/point-in-polygon sourcé avec confidence explicite. Fail-closed sous seuil. Aucun titre libre seul comme vérité finale.

## CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1 🟡 ABSORBED AS EVIDENCE

Ses métriques restent obligatoires dans l’audit/Visual Stack : couverture, répétition, fallback rate, remote failure, authorized thumbnail vs district/city/type/neutral. Aucun nouvel asset avant mesure.

---

# 6. Lane Carte / Geo / Intelligence quartier

`docs/CARTE_ROADMAP.md` conserve le détail historique ; cette section définit la priorité cross-window.

## Préconditions fermées

P1A.1→P1A.6 et P1B.1→P1B.15 sont historiques/fermées. P1B.15 a autorisé P1C Shadow uniquement, jamais l’Offre publique ni un choroplèthe quartier non sourcé.

## P1C.1 — Offre quartier Shadow ✅ CLOSED

- PR #463 ; internal/service-role only ;
- aucune imputation ; public OFF ;
- réconciliation **9,4/10**.

## P1C.2 — Reliability Engine ✅ CLOSED

- PR #464 + hotfix #465 ;
- reliability par métrique distincte de représentativité marché ;
- réconciliation **9,5/10**.

## P1C.3 — Activation Review ✅ CLOSED / HOLD

- PR #466 ;
- 1 review candidate, 0 canary eligible ;
- représentativité obligatoire ;
- réconciliation **9,5/10**.

## P1C.4 — Acquisition Representativeness ✅ CLOSED / NOT_CERTIFIABLE

- PR #469 ; #470 duplicate = superseded ;
- aucun dénominateur exact-scope indépendant démontré ;
- réconciliation **9,6/10**.

## P1C.4A — Acquisition Source Universe & Denominator Design ✅ CLOSED / DESIGNED_NOT_PROVEN

- PR #472 ;
- baseline indépendante 12 sources ;
- design du dénominateur établi mais preuve DATA absente ;
- aucune activation.

## P1C.4A-REPLAY 🔵 PLANNED

**Dépend de :** `DATA-EXACT-SCOPE-GUELIZ-1`.

Rejouer le design contre les nouvelles preuves. Sortie uniquement `PROVEN / NOT_PROVEN`; aucune activation dans ce lot. Score ≥9.

## P1C.4-REPLAY 🔵 PLANNED

**Dépend de :** P1C.4A-REPLAY = PROVEN.

Requalifier la représentativité exact-scope. Sortie `CERTIFIED / INSUFFICIENT / NOT_CERTIFIABLE`. Aucun canary si autre chose que CERTIFIED. Score ≥9.

## P1C.5 — Bounded Offer Canary 🔒 LOCKED

**Responsabilité :** première activation strictement bornée d’une métrique Offre quartier certifiée.

**Conditions d’ouverture :** P1C.4-REPLAY `CERTIFIED` + rollback + scope exact + no national bulk activation.

Mutation séparée, canary explicite, before/after, rollback testé, score ≥9.

## P1C.6 — Canary Observation 🔵 PLANNED_AFTER_P1C5

Observer qualité, fraîcheur, stabilité, drift, provenance, cohérence UI/Map et absence de leakage hors scope. Aucun élargissement automatique.

## P1C.7 — Scoped Public ON 🔵 PLANNED_AFTER_P1C6

Activation publique uniquement du scope certifié si observation P1C.6 PASS ≥9. Toute expansion géographique/métrique = nouveau lot.

## Choroplèthe quartier

Toujours bloqué sans géométrie neighborhood-grade sourcée, reviewée et certifiée. Les 16 polygones OSM `admin_level=10` Casablanca ne sont pas des polygones quartier certifiés.

---

# 7. Lane Security / Professional

## AUTH-RLS-REVALIDATION 🔵 PLANNED

**Responsabilité :** déterminer sur current main si la dette historique #310 existe encore.

Audit :

- `/api/pro/*` ;
- clients Supabase ;
- service-role exposure ;
- request-scoped user context ;
- RLS/RPC ;
- isolation inter-tenant ;
- tests PostgreSQL réels.

Sortie : `NO_FINDING_CLOSE_#310` ou nouveau lot `AUTH-RLS-HARDENING-CURRENT-1` avec Security Reviewer et score ≥9.

---

# 8. Lane Mon Projet

## MON-PROJET-P1B — PR #318 ✅ MERGED / HISTORICAL

Projet actif conservé dans Search ; favoris/comparaisons rattachés au `project_id`; aucune migration/stockage parallèle. Pas de score UX indépendant historique archivé : ne pas inventer un ≥9 rétroactif. Toute nouvelle évolution = nouveau lot current-main avec gate universel.

Aucun lot Mon Projet actif supplémentaire n’est actuellement enregistré.

---

# 9. Cleanup / gouvernance des anciennes PR

## SUPERSEDED connus

#228, #229, #230, #231, #232, #234, #250, #81, #282, #52 et duplicate #470.

## HISTORICAL connus

#337, #319, #289, #255, #113, #133, #54, #126, #125, #124, #121, #118, #115, #110, ainsi que les lots fermés explicitement ci-dessus.

Règle :

`CURRENT MAIN AUDIT → UNIQUE VALUE CHECK → REBUILD ON CURRENT MAIN SI NÉCESSAIRE → DOUBLE CHECK → SCORE ≥9 → NEW/REALIGNED PR`

Aucun merge direct d’une branche historique.

---

# 10. Dépendances inter-lanes

```text
#474 MASS-FIRST ───────────────┐
                              ├→ current Search stable
#473 SEARCH-UX ────────────────┘        │
                                       ├→ Visual Engine → Card Composition → Rabat activation
                                       │
                                       └→ MASS-COVERAGE-ADMISSIBLE-1

#454 reconciliation → DATA-4.10A Partner/Authorization

DATA-EXACT-SCOPE-GUELIZ-1
        ↓
P1C.4A-REPLAY
        ↓ PROVEN
P1C.4-REPLAY
        ↓ CERTIFIED
P1C.5 CANARY
        ↓ PASS
P1C.6 OBSERVATION
        ↓ PASS ≥9
P1C.7 SCOPED PUBLIC ON

Search stabilization
        ↓
AUTH-RLS-REVALIDATION peut être exécuté sans bloquer DATA/Carte
```

---

# 11. Template obligatoire pour tout nouveau lot

```text
LOT-ID — Nom
Responsabilité unique :
Lane :
Priorité : P0 / P1 / P2
Dépend de :
Débloque :
Branche :
PR :
État : PLANNED / READY / IMPLEMENTING / REVIEW / CERTIFIED / MERGED / CLOSED / BLOCKED / SUPERSEDED
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

# 12. Règle de synchronisation cross-window

À partir de maintenant :

- **tout lot futur est écrit ici dès sa planification**, même sans branche ni PR ;
- les fenêtres parallèles peuvent détailler leur lane ailleurs, mais elles doivent mettre à jour cette roadmap maître ;
- une PR docs-only empilée (#475/#476) n’est pas une roadmap concurrente : son contenu utile doit être absorbé ici ;
- si deux fenêtres proposent le même lot, on fusionne le plan avant implémentation ;
- si deux lots touchent le même contrat, l’ordre de merge est explicite ici avant code ;
- la roadmap décrit **tout le travail connu**, pas seulement le travail déjà commencé.
