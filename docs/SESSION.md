# AkarFinder — Session courante

**Mise à jour : 2026-08-10**

Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.

<!-- SEARCH-UX-WINDOW-RECONCILIATION-START -->
## Fenêtre active — Search UX convergence

> Ce bloc est le handover prioritaire de cette fenêtre. Il prévaut sur les anciennes mentions `Main / LOT actif`, `Prochain LOT UX/Search` et `coverage audit next` plus bas lorsqu'elles décrivent un ordre désormais dépassé. Les autres lanes restent intactes.

- `main` relu le 2026-08-10 : `f4563602119c8c01298bf694285e35856097bbd6` — merge PR #472 `P1C.4A — Acquisition Source Universe & Denominator Design`.
- Branche de travail actuelle : `feat/search-ux-1-cards-grid`.
- PR actuelle : **#473 — SEARCH-UX-1 — Inventory-first cards & responsive grid**.
- Exact head courant documenté : `42e951814b204ca67b846b81613a1080de3e9ea3`.
- État : **ACTIVE — BLOCKED_BY_CI / NOT CERTIFIED**. La PR est ouverte et mergeable, mais l'ouverture seule n'est pas une preuve d'activité ni de certification.
- Responsabilité : convergence Search vers une SERP **image-first + inventory-first** : cards compactes, 2 colonnes mobile/tablette, 3 desktop intermédiaire, 4 wide desktop, whole-card primary action, disparition du gros CTA plein largeur, transparence/provenance conservée en couche secondaire.
- Dépendances réutilisées : SEARCH-UX-FAST-1 #390, SEARCH-WORDING-PURITY-1 #391, SEARCH-CONTINUOUS-FLOW-1 #393, SEARCH-MOBILE-CARD-GRID-1 #394, UNIFIED-LISTING-CARD-1 #407, CONTEXTUAL-VISUAL-ASSETS-1 #414, DETERMINISTIC-ATTRIBUTION-1 #416, SEARCH-ACTION-HIERARCHY-1 #418, SEARCH-DESKTOP-SPLIT-1 #423, CONTEXTUAL-ILLUSTRATIONS-FOUNDATION-1 #437 et RABAT-REAL-PHOTO-LIBRARY-1 #468.
- Preuves exact-head actuellement acquises sur `42e951…` : Visible Dedup, P0 Closure, Final Design Accessibility, UX Gate 0, Canonical Baseline Compile/Validation, Search UX Fast, B2B, Seller, User Journey, Home Proof, Unified Card, Contextual Illustrations Foundation, Desktop Split, Mobile Card Grid, Wording Purity, Final Sweep, Geo Productization, Post-results Cleanup, Intent Hubs, Search Truth, Deterministic Attribution, Property Type Visual Option A et ODM-09D = **SUCCESS**.
- Blocker exact : `SEARCH-ACTION-HIERARCHY-1 Gate` a son contrat/types/build **SUCCESS** mais sa **visual-certification FAILURE** sur le head courant. `UX P1 Mobile Decision Ergonomics` et `CONTEXTUAL-VISUAL-ASSETS-1` étaient encore en cours lors du dernier contrôle.
- Score : **NON ATTRIBUÉ / NON CERTIFIÉ** sur ce head. Les scores ou captures d'anciens heads ne ferment pas le lot. Gate obligatoire : **>= 9/10** sur **1440×900** et **390×844** après re-test exact-head.
- Prochaine étape : corriger ou réconcilier le finding visuel Action Hierarchy sans restaurer le gros CTA, attendre l'ensemble des workflows exact-head, re-capturer les deux viewports de certification, double-check indépendant, score, corrections si <9, re-test, re-score puis seulement Release Certification/merge.

### Lots suivants verrouillés par cette fenêtre

1. **VISUAL-REPRESENTATION-ENGINE-1 — PLANNED / BLOCKED_BY_SEARCH-UX-1**  
   Lane : UX/Search + Visual Stack. Responsabilité : formaliser et brancher une sélection visuelle déterministe `PROPERTY → STREET → DISTRICT → CITY → TYPE`, sans inventer de géographie ni présenter une photo d'ambiance comme photo du bien. Dépend de #473 + signaux Geo structurés certifiés + assets contextuels existants. Branche/PR : **aucune tant que #473 n'est pas certifiée et mergée**. Score : N/A. Prochaine étape : ouvrir un lot/branche séparé depuis le `main` post-#473.
2. **SEARCH-UX-2 — Compact Search Header & Filters — PLANNED**  
   Lane : UX/Search. Responsabilité : header clair, recherche/filtres compacts, catégories, compteur/tri, réduction de la masse navy. Dépend de SEARCH-UX-1 et du contrat visuel VRE. Branche/PR : aucune. Score : N/A. Blocker : prédécesseurs non fermés.
3. **SEARCH-UX-3 — Mobile First-Viewport Compression — PLANNED**  
   Lane : UX/Search mobile. Responsabilité : faire apparaître le début de la première rangée presque immédiatement, en conservant 2 colonnes et les contrôles essentiels. Dépend de SEARCH-UX-2. Branche/PR : aucune. Score : N/A.
4. **SEARCH-UX-4 — View Modes & Secondary Navigation — PLANNED**  
   Lane : UX/Search. Responsabilité : réévaluer `Liste/Mixte/Carte`, simplifier mobile vers Liste/Carte et décider séparément la navigation secondaire. Dépend de SEARCH-UX-2/3 et ne doit pas empiéter sur la lane Carte. Branche/PR : aucune. Score : N/A.
5. **CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1 — RECONCILIATION REQUIRED**  
   Ancien prochain lot UX/Search après #468. Il reste utile comme audit read-only, mais **n'est plus le prochain lot exécutable** : #473 modifie la présentation et le futur VRE modifiera la chaîne de fallback. Branche/PR : aucune. Prochaine étape : le replanifier après le contrat VRE ou l'intégrer comme preuve read-only de ce lot, sans nouvel asset par intuition.

Règle de fermeture de cette fenêtre : `IMPLEMENTATION → DOUBLE CHECK → SCORE /10 → CORRECTIONS → RE-TEST → RE-SCORE → CERTIFICATION`. **Aucun lot CLOSED sous 9/10.**

Correction cross-window vérifiée : **DATA-4.9B PR #452 est CLOSED/MERGED**, merge `45631345a6efb653256273354d2fb903b33c1ff9`, head final `e79db482bcab23c819766d1378833025b33ebbd2`. Toute ancienne mention `DATA-4.9B 🟠` plus bas est **HISTORICAL/OBSOLETE**, sans modifier la propriété de la lane DATA.
<!-- SEARCH-UX-WINDOW-RECONCILIATION-END -->

<!-- DATA-CURRENT-START -->
## DATA — vérité courante

- DATA-4.9A ✅ PR #444 — merge `18be46c7349e8a56b2b68b56005d79f85e125675`.
- DATA-4.9B 🟠 PR #452 — High-Capacity Structural Detail Qualification, read-only.
- Snapshot durci certifié : head `ae4b212e28f6ca0929548299860b04936daea218`, run `31369710665` PASS, observé `2026-08-10T08:24:02.397Z`.
- Artefact : `sha256:dce77812b6666b09f29d7e716500cd5abed39e6902fcbcc71a515eeb4680f33d`.
- **10 128** net-new URL identities → **2 326 structural detail candidate URL representations** + **7 802 rejects**, 0 collision.
- Par source : Val Foncier **709**, Christie's **602**, Immo Maroc **276**, AgadirImmobilier.ma **37**, ProImmobilier **99**, Capital Properties **603**.
- **2 326 n'est pas un nombre de biens uniques** ; le proof machine l'interdit explicitement.
- 0 detail-page fetch ; 0 DB/Registry/policy mutation ; 0 ingestion/display activation.
- Les six sources restent live Registry `unverified + hidden + internal_signal_only`, `current_representation_count=0`.

**Prochain LOT : DATA-4.9C — Source Policy Decision & Registry Assignment.** Revue de preuves officielles actuelles et décision par source ; mutation du Registry uniquement si démontrée, jamais d'ingestion dans ce lot.

Ensuite **DATA-4.9D** pourra concevoir un canary d'ingestion borné uniquement pour les sources effectivement autorisées.
<!-- DATA-CURRENT-END -->

## Vérité canonique après merges parallèles

- Base documentaire utilisée pour ce closeout UX/Search : `07d9fc07fe24a9a176ad8830bd0e6852631ed1a4` — `main` après DATA-4.9B et merge `CONTEXTUAL-ILLUSTRATIONS-SCALE-2` PR #453. Les blocs DATA/Carte de cette base sont conservés ; le closeout UX/Search n'en change aucune décision.
- `CONTEXTUAL-ILLUSTRATIONS-FOUNDATION-1` ✅ : PR #437, exact-head `36620ca20e826be46464ab177e9611fb01f94a16`, **27/27 workflows exact-head verts**, specialized gate PASS, Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900**, audit visuel **9,6/10**, Reviewer PASS, Release Certifier GO, merge `66ee5a9263fbdef673c4f16f6066aa10c7cf0417`.
- `CONTEXTUAL-ILLUSTRATIONS-AGADIR-PILOT-1` ✅ : PR #445, exact-head `f6b1d15e92636439dfca8128e54892fbf32b95a6`, **20/20 workflows exact-head verts**, specialized P1 + predecessor P0 PASS, Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900**, **12/12 variantes Agadir uniques**, reload stable, 0 label/prix tronqué, 0 overflow, audit visuel **9,4/10**, Reviewer PASS, Release Certifier GO, merge `a2e92ac6c4385792744ab7bf3e105663d040bc9d`.
- `CONTEXTUAL-ILLUSTRATIONS-SCALE-1` ✅ : PR #448, exact-head final `3a4df096c16cf1fe1f9c051dfd24f59bd750b5a4`, **21/21 workflows exact-head verts**, specialized SCALE + Agadir P1 + P0 PASS, Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900**, **24/24 variantes Marrakech + Casablanca uniques**, lazy images explicitement hydratées avant capture, reload stable, 0 label/prix tronqué, 0 overflow, audit visuel **9,3/10**, Reviewer PASS, Release Certifier GO, merge `081d51ebd38ff728366694aca9ae6c1923a54fe5`.
- Artefact SCALE-1 #448 : `sha256:b80d2539afea1fda4bfc8e515fe94ffe7821aee0d2f71c45e29c844f586ca8f5`.
- `CONTEXTUAL-ILLUSTRATIONS-SCALE-2` ✅ : PR #453, exact-head `e242960788f57975ae9d107ab04766f14fa29d87`, **22/22 workflows exact-head SUCCESS**, specialized SCALE-2 + SCALE-1 + Agadir P1 + P0 PASS, Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900**, **36/36 variantes Rabat + Tanger + Fès uniques**, Fes/Fès alias-safe, lazy-load hydraté, reload stable, 0 clipping/overflow, audit visuel **9,3/10**, Reviewer PASS, Release Certifier GO, merge `07d9fc07fe24a9a176ad8830bd0e6852631ed1a4`.
- Artefact SCALE-2 #453 : `sha256:85659a415e52e28d4258b152fc26ea43dd726d16203e23b3941efb3a6d4ad564`.
- `RABAT-REAL-PHOTO-LIBRARY-1` ✅ : PR #468, exact-head `3de085a2058862edc52bab4fe0dcd3aca04a4f4c`, **29/29 workflows exact-head SUCCESS**, **40/40 sources + licences Commons** vérifiées, TypeScript + build PASS, Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900**, 10/10 photos chargées, reload stable, 0 clipping/overflow, mobile **2 colonnes**, audit visuel **9,2/10**, Reviewer PASS, Release Certifier GO, merge `2585017ea377d72b3a54ca1083dbf1b609899ad9`.
- Rabat real-photo : **40 vraies photos = 8 × Agdal/Hay Riad/Souissi/Océan/Hassan** ; bibliothèque séparée, activation uniquement sur signal `listing.neighborhood` structuré + `fallback_visual`, sans inférence texte.
- Les 6 villes contextualisées disposent désormais de **12 variantes chacune = 72 IDs contextuels uniques**.
- Prochain LOT UX/Search : **CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1**, read-only ; mesurer couverture/répétition réelle **après #468**, y compris le tier Rabat real-photo et son taux d'échec distant, avant tout nouvel asset. Le district du catalogue d'illustrations historique reste OFF.
- Ce closeout UX/Search ne modifie aucune décision DATA/Carte ; les sections DATA/Carte ci-dessous restent la propriété de leur lane.

## Main / LOT actif

- Main de départ du LOT : `0019f33e6a10a58d76a6db4521c681861067c651` — merge DATA-4.7A PR #433.
- LOT actif : **DATA-4.7B — LSF Controlled Expansion Write**.
- PR : **#435**.
- Exact write head certifié avant mutation : `f3f72f6b4e7e7f877df4eb67fa6c31f0140e81b3`.
- Specialized CI : run `31330561506` PASS — contract + TypeScript + static safety + live dry-run.
- Rollback artifact : `sha256:d791172e8036d0b475cbf2119dca0c497938940f87563923dbcbf68370398672`, **250 apply rows / 250 rollback rows**, 0 write pendant CI.

## DATA-4.7A ✅

LSF qualification live :

- 1 414 seeds ; 99 fresh-confirmed ; 1 315 seed-only au départ ;
- sitemap courant : 1 423 URLs ;
- 1 064 identités URL sûres ; 174 groupes collision DB exclus fail-closed ;
- 983 seed-only encore présentes dans le sitemap ;
- **353** candidates `seed_only + normalized + display eligible + Public Search` ;
- tier C long-tail accepté comme `eligible_secondary`, sans exiger prix/surface ni fabriquer de donnée ;
- 0 mutation.

PR #433 mergée : `0019f33e6a10a58d76a6db4521c681861067c651`.

## DATA-4.7B — write production certifié ✅ (merge PR encore à faire)

Preflight exact avant write :

- 250/250 URLs exactes présentes ;
- 250/250 encore `seed_only` ;
- 250/250 sans `public_sitemap_presence` précédent ;
- 250/250 sans ancien `freshness_evidence` ;
- digest exact URL set : `79e3982f128c4e639197a64a29766e9c`.

Résultat production :

- write atomique : **250/250** ;
- fresh-confirmed : **250/250** ;
- `public_sitemap_presence` : **250/250** ;
- normalized : **250/250** ;
- technical display : **250/250** ;
- Public Search : **250/250** ;
- Thin Index freshness projection : **250/250** ;
- rollback : disponible, **non requis** ;
- Registry/policy : inchangés.

LSF après write : **1 414 total / 349 fresh-confirmed / 1 065 seed-only / 250 public_sitemap_presence**.

## Sources en attente

- Promo Immo : `BLOCKED_EXTERNAL_SOURCE` — DNS/source directe ; ne pas contourner.
- Dar Agadir : `BLOCKED_SOURCE_DRIFT` — robots ne déclare plus le sitemap historique ; ne pas réutiliser une preuve ancienne comme preuve live.

## Prochain DATA

Après merge/closeout de #435 : **DATA-4.7C — Residual Reservoir Requalification**, read-only. Revalider le résiduel LSF (103 candidates seulement dans la preuve pré-write, donc chiffre à recalculer) et le comparer au prochain réservoir admissible, Aykana en premier candidat. Aucun second write automatique.

## UX/Search — illustrations contextuelles + Rabat real-photo certifiées ✅

- P0 #437 pose le resolver déterministe ; P1 #445 apporte Agadir ; SCALE-1 #448 Marrakech/Casablanca ; SCALE-2 #453 Rabat/Tanger/Fès.
- Pool certifié total : **6 villes × 12 variantes = 72 IDs contextuels uniques**.
- Par ville : **4 variantes ville + 4 Appartement + 4 Villa** ; `Appartement` / `Villa` utilisent `city_type`, les autres types reconnus retombent sur `city`.
- `Fes` / `Fès` partagent exactement le même pool `fes-*` ; aucun doublon sémantique ajouté.
- Priorité inchangée : thumbnail autorisée → illustration contextuelle → artwork type reconnu → fallback neutre.
- Sélection multi-assets : Rendezvous/HRW, déterministe, indépendante de l'ordre des candidats et stable au reload.
- Identité stable : `original_url` normalisée conservativement ; tracking/fragment/trailing slash/ordre de query ne remappent pas.
- Le tier `district` du catalogue d'illustrations historique reste inactif. **Exception bornée et séparée** : Rabat real-photo consomme uniquement `listing.neighborhood` structuré pour Agdal, Hay Riad, Souissi, Océan et Hassan.
- Disclosure illustrations historiques : `Illustration`. Pour Rabat real-photo : `Photo d’ambiance` + `Rabat • Quartier` + crédit/licence Commons ; aucune photo d'ambiance n'est présentée comme une photo réelle de l'annonce.
- Certification SCALE-2 : **36/36 IDs Rabat/Tanger/Fès**, **22/22 workflows**, 5 viewports Chromium, lazy-load hydraté, 0 clipping/overflow, UX **9,3/10**.
- Certification Rabat real-photo #468 : **40/40 Commons**, **29/29 workflows**, 5 viewports Chromium, 10/10 photos chargées, reload stable, 0 clipping/overflow, mobile 2 colonnes, UX **9,2/10**.
- Prochaine décision : **coverage audit read-only** incluant le tier Rabat real-photo ; pas de nouveau pack d'assets par intuition.

## Autres lanes

- UX/Search : `CONTEXTUAL-ILLUSTRATIONS-SCALE-2` ✅ #453 + `RABAT-REAL-PHOTO-LIBRARY-1` ✅ #468 ; prochain LOT = **CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1** read-only ; Search reste canonique.
- UX/Carte : P1B.12 est présent sur `main`; les prochaines décisions Carte restent dans sa lane ; Offre quartier reste gouvernée par ses gates propres.

## Invariants

No-bypass ; Source Registry autoritaire ; provenance réelle ; Search canonique ; aucune donnée/géométrie inventée ; une responsabilité/branche/PR/merge par LOT ; rollback avant mutation ; exact-head CI verte avant write ; mise à jour README/ROADMAP/SESSION au closeout.
