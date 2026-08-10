# AkarFinder — Session courante

**Mise à jour : 2026-08-10**

Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.

<!-- UX-SEARCH-1-CLOSEOUT-START -->
## UX-SEARCH-1 — Density First ✅ CERTIFIED — PR #479

Responsabilité unique : augmenter la densité de scan des résultats Search sans modifier DATA, ranking, filtres, Registry ni logique Map.

- passe initiale Reviewer rejetée : carte desktop **474 px**, au-dessus du gate ; correction puis replay complet ;
- certification finale exact-head `8e75bc8cf43bd094850c6dbf3453ff6f996d4954` ; run spécialisé `31436735917` ;
- **Product Design Reviewer PASS** + **Independent Release Certifier PASS** sur deux builds/replays séparés ;
- **23/23 workflows exact-head SUCCESS** ; TypeScript, production build, Search Truth, dedup, accessibility, UX fast et canary ODM verts ;
- grille certifiée : **390 px = 2 colonnes**, **768 px = 2**, **1024 px = 3**, **1280/1440 px = 4** ;
- desktop list : cartes **381 px** de haut à 1024/1280/1440 ; deuxième rangée visible dès **669 px** ; zéro overflow sur les 5 viewports ;
- mobile 390×844 : cartes **173×321 px**, 2 colonnes conservées, zéro overflow ;
- split view reste à 2 colonnes avec pane Map préservée ;
- toutes les informations prix/titre/localisation/facts/fraîcheur/source/confiance sont conservées ; seul le gros CTA redondant disparaît en list desktop ;
- audit visuel final contre la référence fournie : **densité 9,3/10** — gate ≥9/10 atteint.

**Prochain LOT UX/Search : UX-SEARCH-2 — Compact Search & Filters.** Objectif : réduire la hauteur avant inventaire, sans rouvrir UX-SEARCH-1.
<!-- UX-SEARCH-1-CLOSEOUT-END -->

<!-- UX-SEARCH-2-CLOSEOUT-START -->
## UX-SEARCH-2 — Compact Search & Filters ✅ CERTIFIED — PR #480

Responsabilité unique : **réduire la hauteur et la fragmentation des contrôles avant l’inventaire sur /search**, sans modifier DATA, ranking, Source Registry, dédup, prix, ordre commercial ni logique Map.

Résultat certifié :

- mobile **360×800 / 390×844** : recherche + Filtres sur **une seule ligne de 48 px**, puis compteur + vue + tri sur une seule barre compacte ;
- transaction mobile/tablette reste intégralement accessible dans le panneau Filtres ; desktop conserve Acheter / Louer / Neuf directement sur la ligne primaire ;
- mobile : modes Liste/Mixte/Carte passent par un select compact **48 px** au lieu de l’ancien segmented control sticky ;
- première annonce à **240 px** sur 360/390, contre **347 px** au début de UX-SEARCH-1 ;
- tablette 768 : première annonce **252 px** ; desktop 1024/1280/1440 : première annonce **250 px** ;
- contrat de densité UX-SEARCH-1 préservé : **390=2 colonnes / 768=2 / 1024=3 / 1280=4 / 1440=4** ;
- quick filters fermés : **48 px mobile/tablette, 46 px desktop** ; toolbar résultats : **59 px mobile, 61 px tablette/desktop** ;
- touch targets critiques mobile recherche / filtres / vue / tri = **48 px** ;
- **0 overflow horizontal** sur les 6 viewports ; aucune information de confiance/source retirée ;
- les anciens contrats Search/A11y/Mobile ont été réconciliés avec le nouveau pattern sans affaiblir leur intention : états ARIA conservés, bottom sheet safe-area conservée, Option A reste derrière Filtres ;
- exact-head comportemental 7226fe892d109c847dd704a73dc90b013ef4fb31 : **31 workflows SUCCESS** ; Search Truth, dedup, accessibility, mobile ergonomics, SEARCH-UX-FAST, UX-SEARCH-1 predecessor, TypeScript et build production verts ;
- run spécialisé 31438758126 : **Product Design Reviewer PASS + Independent Release Certifier PASS** sur deux builds/replays indépendants ;
- audit visuel humain des captures 390×844 et 1440×900 : **9,5/10** — gate ≥9/10 atteint.

**Prochain LOT UX/Search : UX-SEARCH-3 — Card Architecture.** Objectif : converger la hiérarchie interne des cards vers IMAGE → PRIX → TITRE → LOCALISATION → FACTS → PROVENANCE, préserver transparence/trust AkarFinder et maintenir la densité certifiée. Gate UX ≥9/10 avant clôture.
<!-- UX-SEARCH-2-CLOSEOUT-END -->

<!-- UX-SEARCH-3-CLOSEOUT-START -->
## UX-SEARCH-3 — Card Architecture ✅ CERTIFIED — PR #481

Responsabilité unique : **converger la hiérarchie interne des cards Search vers IMAGE → PRIX → TITRE → LOCALISATION → FACTS → PROVENANCE → ACTION**, sans modifier DATA, ranking, Source Registry, dédup, prix, ordre commercial ni logique Map.

Résultat certifié :

- cards internes et externes utilisent la même séquence visuelle canonique ;
- mobile **360×800 / 390×844** : 2 colonnes, première annonce **239,5 px**, cartes typiques **342,9 px**, maximum certifié **362,4 px**, 0 overflow ;
- tablette 768 : 2 colonnes, première annonce **252,3 px** ;
- desktop 1024 : 3 colonnes ; 1280/1440 : 4 colonnes ; première annonce **250,3 px** ; cartes **398,5 px** puis max **419 px**, 0 overflow ;
- titres à 2 lignes max ; prix dominant ; localisation, facts et provenance alignés sur un rythme de scan unique ;
- crédit des photos d’ambiance Rabat placé après la provenance : il ne coupe plus la lecture LOCALISATION → FACTS ;
- provenance, fraîcheur, source et signaux de confiance restent explicites ; AkarInfo Gateway utilise une variante SERP compacte sans retirer la version complète ;
- ancien contrat Action Hierarchy réconcilié avec UX-SEARCH-1 : desktop dense garde 0 gros CTA redondant, la card reste directement cliquable et le maximum reste 1 action forte ;
- exact-head `17d42fc363a126a453b23cd9159f3ce870c406b3` : **30/30 workflows SUCCESS** ;
- run spécialisé `31442655754` : **Product Design Reviewer PASS + Independent Release Certifier PASS** ;
- contrat machine six viewports : **10/10** ; audit visuel humain : **9,4/10** — gate ≥9/10 atteint.

**Prochain LOT UX/Search : UX-SEARCH-4 — Visual Inventory System.**
<!-- UX-SEARCH-3-CLOSEOUT-END -->


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
- Prochain LOT UX/Search : **UX-SEARCH-4 — Visual Inventory System** ; `CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1` devient une preuve read-only intégrée à ce lot, sans nouvel asset par intuition.
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

- UX/Search : `UX-SEARCH-1` ✅ #479 + `UX-SEARCH-2` ✅ #480 ; prochain LOT = **UX-SEARCH-3 — Card Architecture** ; `CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1` reste queued read-only ; Search reste canonique.
- UX/Carte : P1B.12 est présent sur `main`; les prochaines décisions Carte restent dans sa lane ; Offre quartier reste gouvernée par ses gates propres.

## Invariants

No-bypass ; Source Registry autoritaire ; provenance réelle ; Search canonique ; aucune donnée/géométrie inventée ; une responsabilité/branche/PR/merge par LOT ; rollback avant mutation ; exact-head CI verte avant write ; mise à jour README/ROADMAP/SESSION au closeout.
