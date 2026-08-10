# AkarFinder — Session courante

**Mise à jour : 2026-08-10**

Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.

<!-- DATA-CURRENT-START -->
## DATA — vérité courante

- DATA-4.8A ✅ PR #442 — merge `b9d38932bb3af0acfd08a681cc79abb5254b81e3` ; preuve finale **506 → 0 detail candidate** sur Dar/Aykana/LSF ; Promo DNS bloqué ; zéro write.
- DATA-4.9A 🟠 PR #444 — Mass Source Onboarding Qualification, read-only raw sitemap capacity.
- Snapshot live de closeout : head `0c7cfd9ee6b135e3ef0373933921452d8c35fd3f`, run `31366418643` PASS, observé `2026-08-10T07:38:55.953Z`.
- Artefact : `sha256:5c867a1e17ab4a70b43cba13e33933426d4ed97c6af6863acbf465d2e0ca6080`.
- 11 sources zéro-stock auditées ; **9 live qualifiées / 2 bloquées** : Capital Properties et Immobest sur payload sitemap non reconnu.
- Capacité sitemap net-new brute totale qualifiée : **10 631** — explicitement **pas** un compteur d'annonces.
- Top : Val Foncier **6 190** dont `/bien-immobilier/` **5 793** ; Christie's Morocco **1 252** ; Immo Maroc **1 204** ; AgadirImmobilier.org **519** ; Noura Immobilier **516**.
- 0 detail-page fetch ; 0 DB/Registry/policy mutation ; 0 ingestion/display activation.

**Prochain LOT : DATA-4.9B — High-Capacity Structural Detail Qualification**, read-only. Chemin critique source-live `unverified` : Val Foncier, Christie's Morocco, Immo Maroc, AgadirImmobilier.ma, ProImmobilier. Capital Properties est requalifiable à part si son sitemap courant redevient lisible.

4.9B doit produire le nombre réel de pages détail structurellement qualifiées. 4.9C décidera ensuite la policy ; 4.9D seulement pourra envisager un canary d'ingestion borné.
<!-- DATA-CURRENT-END -->

## Vérité canonique après merges parallèles

- Base documentaire utilisée pour ce closeout UX/Search : `a2e92ac6c4385792744ab7bf3e105663d040bc9d` — merge de `CONTEXTUAL-ILLUSTRATIONS-AGADIR-PILOT-1` PR #445, lui-même descendant du merge Carte P1B.10. Les avancées parallèles ultérieures de `main` doivent être conservées ; ce closeout ne prétend pas figer le SHA courant de `main`.
- `CONTEXTUAL-ILLUSTRATIONS-FOUNDATION-1` ✅ : PR #437, exact-head `36620ca20e826be46464ab177e9611fb01f94a16`, **27/27 workflows exact-head verts**, specialized gate PASS, Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900**, audit visuel **9,6/10**, Reviewer PASS, Release Certifier GO, merge `66ee5a9263fbdef673c4f16f6066aa10c7cf0417`.
- `CONTEXTUAL-ILLUSTRATIONS-AGADIR-PILOT-1` ✅ : PR #445, exact-head `f6b1d15e92636439dfca8128e54892fbf32b95a6`, **20/20 workflows exact-head verts**, specialized P1 + predecessor P0 PASS, Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900**, **12/12 variantes Agadir uniques**, reload stable, 0 label/prix tronqué, 0 overflow, audit visuel **9,4/10**, Reviewer PASS, Release Certifier GO, merge `a2e92ac6c4385792744ab7bf3e105663d040bc9d`.
- Artefact P1 #445 : `sha256:46441308c3449fe1fabef5c8cd651ae9700cd52f91b190190b153ca7f8152860`. Le smoke global a produit **48 captures / 0 finding**.
- Prochain LOT UX/Search : **CONTEXTUAL-ILLUSTRATIONS-SCALE-1** — étendre prudemment les pools à d'autres villes/types sur le même resolver déterministe et truth-safe, sans district tant qu'aucun signal structuré certifié n'est disponible.
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

## UX/Search — illustrations contextuelles P1 certifiées ✅

- P0 #437 pose un catalogue local explicite et un resolver pur/fail-closed pour les illustrations contextuelles.
- P1 #445 exploite cette fondation sans modifier le resolver : **4 variantes ville Agadir + 4 Appartement + 4 Villa**.
- Priorité inchangée : thumbnail autorisée → illustration contextuelle → artwork type reconnu → fallback neutre.
- `Appartement` et `Villa` utilisent le tier `city_type`; les autres types reconnus à Agadir retombent sur le pool `city` multi-assets.
- Sélection multi-assets : Rendezvous/HRW, déterministe, indépendante de l'ordre des candidats et stable au reload.
- Identité stable : `original_url` normalisée conservativement ; tracking, fragment, trailing slash et ordre de query ne remappent pas, paramètres significatifs restent distincts, URL invalide → fail-closed.
- Le district reste volontairement inactif tant que Search n'expose pas un signal structuré certifié.
- Disclosure publique uniforme : `Illustration`; aucun visuel n'est présenté comme une photo réelle de l'annonce.
- Certification P1 : **12/12 asset IDs atteignables et distincts**, **20/20 workflows**, 5 viewports Chromium, 0 clipping/overflow, UX **9,4/10**.

## Autres lanes

- UX/Search : `CONTEXTUAL-ILLUSTRATIONS-AGADIR-PILOT-1` ✅ #445 ; prochain LOT = **CONTEXTUAL-ILLUSTRATIONS-SCALE-1** ; Search reste canonique.
- UX/Carte : P1B.8 ✅ ; prochain lot carte documenté = P1B.9 Tier A Registry Candidate Review ; Offre quartier reste OFF.

## Invariants

No-bypass ; Source Registry autoritaire ; provenance réelle ; Search canonique ; aucune donnée/géométrie inventée ; une responsabilité/branche/PR/merge par LOT ; rollback avant mutation ; exact-head CI verte avant write ; mise à jour README/ROADMAP/SESSION au closeout.
