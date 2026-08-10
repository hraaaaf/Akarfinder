# AkarFinder — Session courante

**Mise à jour : 2026-08-10**

Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.

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

- Base documentaire utilisée pour ce closeout UX/Search : `aeb29a76c225bda24e65c8b262007b9348be3f36` — `main` après DATA-4.9A puis P1B.12 Carte. P1B.12 n'a modifié aucun des 3 MD canoniques ; ses 4 fichiers Carte sont conservés. Le `main` contient déjà le merge `CONTEXTUAL-ILLUSTRATIONS-SCALE-1` PR #448 (`081d51ebd38ff728366694aca9ae6c1923a54fe5`). Les blocs DATA/Carte de cette base sont conservés ; le closeout UX/Search n'en change aucune décision.
- `CONTEXTUAL-ILLUSTRATIONS-FOUNDATION-1` ✅ : PR #437, exact-head `36620ca20e826be46464ab177e9611fb01f94a16`, **27/27 workflows exact-head verts**, specialized gate PASS, Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900**, audit visuel **9,6/10**, Reviewer PASS, Release Certifier GO, merge `66ee5a9263fbdef673c4f16f6066aa10c7cf0417`.
- `CONTEXTUAL-ILLUSTRATIONS-AGADIR-PILOT-1` ✅ : PR #445, exact-head `f6b1d15e92636439dfca8128e54892fbf32b95a6`, **20/20 workflows exact-head verts**, specialized P1 + predecessor P0 PASS, Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900**, **12/12 variantes Agadir uniques**, reload stable, 0 label/prix tronqué, 0 overflow, audit visuel **9,4/10**, Reviewer PASS, Release Certifier GO, merge `a2e92ac6c4385792744ab7bf3e105663d040bc9d`.
- `CONTEXTUAL-ILLUSTRATIONS-SCALE-1` ✅ : PR #448, exact-head final `3a4df096c16cf1fe1f9c051dfd24f59bd750b5a4`, **21/21 workflows exact-head verts**, specialized SCALE + Agadir P1 + P0 PASS, Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900**, **24/24 variantes Marrakech + Casablanca uniques**, lazy images explicitement hydratées avant capture, reload stable, 0 label/prix tronqué, 0 overflow, audit visuel **9,3/10**, Reviewer PASS, Release Certifier GO, merge `081d51ebd38ff728366694aca9ae6c1923a54fe5`.
- Artefact SCALE-1 #448 : `sha256:b80d2539afea1fda4bfc8e515fe94ffe7821aee0d2f71c45e29c844f586ca8f5`.
- Prochain LOT UX/Search : **CONTEXTUAL-ILLUSTRATIONS-SCALE-2** — étendre prudemment les pools aux villes encore singleton à plus fort impact restant, **Rabat + Tanger + Fès**, sur le même resolver déterministe et truth-safe ; district toujours inactif tant qu'aucun signal structuré certifié n'est disponible.
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

## UX/Search — illustrations contextuelles SCALE-1 certifiées ✅

- P0 #437 pose le catalogue local explicite et le resolver pur/fail-closed ; P1 #445 prouve le multi-assets Agadir ; SCALE-1 #448 étend exactement la même mécanique à Marrakech et Casablanca.
- Pool actif certifié : **Agadir 12 variantes + Marrakech 12 + Casablanca 12**, soit 36 variantes contextuelles sur ces trois villes, sans modifier le resolver.
- Pour Marrakech et Casablanca : **4 variantes ville + 4 Appartement + 4 Villa** ; `Appartement` et `Villa` utilisent `city_type`, les autres types reconnus retombent sur `city`.
- Rabat, Tanger et Fès restent volontairement singleton dans SCALE-1 et constituent la cohorte bornée proposée pour SCALE-2.
- Priorité inchangée : thumbnail autorisée → illustration contextuelle → artwork type reconnu → fallback neutre.
- Sélection multi-assets : Rendezvous/HRW, déterministe, indépendante de l'ordre des candidats et stable au reload.
- Identité stable : `original_url` normalisée conservativement ; tracking/fragment/trailing slash/ordre de query ne remappent pas.
- Le district reste volontairement inactif tant que Search n'expose pas un signal structuré certifié.
- Disclosure publique uniforme : `Illustration`; aucun visuel n'est présenté comme une photo réelle de l'annonce.
- Certification SCALE-1 : **24/24 asset IDs Marrakech/Casa atteignables et distincts**, **21/21 workflows**, 5 viewports Chromium, lazy-load réellement hydraté avant capture, 0 clipping/overflow, UX **9,3/10**.

## Autres lanes

- UX/Search : `CONTEXTUAL-ILLUSTRATIONS-SCALE-1` ✅ #448 ; prochain LOT = **CONTEXTUAL-ILLUSTRATIONS-SCALE-2** sur Rabat + Tanger + Fès ; Search reste canonique.
- UX/Carte : P1B.12 est présent sur `main`; les prochaines décisions Carte restent dans sa lane ; Offre quartier reste gouvernée par ses gates propres.

## Invariants

No-bypass ; Source Registry autoritaire ; provenance réelle ; Search canonique ; aucune donnée/géométrie inventée ; une responsabilité/branche/PR/merge par LOT ; rollback avant mutation ; exact-head CI verte avant write ; mise à jour README/ROADMAP/SESSION au closeout.
