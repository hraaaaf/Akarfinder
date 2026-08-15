<!-- PRICE-EXTRACTION-V3-CLOSEOUT-START -->
## SEARCH Price Extraction v3 ✅ CLOSED

- **PR #649 ✅ MERGED** — merge `95132b751d0000be140d84fcfbf1f17ad84a2a5e`, head technique `ce13b5326cf82cdcfdf7323e3044d48ccd7e05f4`.
- Snapshot enregistré dans #649 : **2 690 / 15 438 = 17,42 %** ; snapshot live observé après merge : **2 694 / 15 438 = 17,45 %**.
- Baseline avant chantier prix : **915 / 15 438 = 5,93 %** ; couverture actuelle ≈ **2,94×** cette baseline.
- DarAgadir live : **1 676** prix publics ; **0** short-stay publié avec prix ; garde fail-closed conservée.
- PromoImmo : `HOLD`, aucune extraction suffisamment fiable. Avito : `HOLD`, HTTP 403, aucun bypass.
- Drift live `2690 → 2694` consigné sans causalité inventée.
- Preuve : `docs/PRICE_EXTRACTION_V3_CLOSEOUT.md`.
- Prochain lot Search prix : **Price Extraction v4**, source par source, mêmes garde-fous et canary borné avant write important.
<!-- PRICE-EXTRACTION-V3-CLOSEOUT-END -->

<!-- B2B-PARTNER-LANDING-PRODUCTIZATION-START -->
## B2B Partner Landing Productization ✅ CLOSED

- **PR #650 ✅ MERGED** — merge `32c0b3635f9f8aec2fe92722eef09f0484dfec1b`, final head `8c149a73e3e4b0c4da0c09326b34f10be6dc7699`.
- Objectif : rendre `/pro/agences` et `/promoteurs` commercialement concrets sans modifier activation, publication, ranking, DATA ou Registry.
- Ajouts : aperçu basé sur les démos existantes, onboarding 3 étapes, formats d’intégration, livrables, reporting truth-safe, FAQ courte et différenciation Agence/Promoteur.
- Aucun faux partenaire créé ; aucune promesse de volume, vente, ranking ou statut partenaire.
- Gate B2B final `31891405851` : contrats + TypeScript + production build **SUCCESS**.
- UI All Pages final `31891405842` : capture exhaustive + zero unexpected findings **SUCCESS** ; artefact `9248716663`, digest `sha256:5b9223953cbfab597923601be2e88b49f1c1589ad662aa6e2da3fbeeb2cb4a3c`.
- Accessibilité finale + canonical baseline/compile : **SUCCESS**.
- Incidents orthogonaux : P0 build Google Fonts externe ; DATA MASS-1 live-audit timeout Supabase. Aucun n’est causé par le diff B2B.
- Closeout : `docs/B2B_PARTNER_LANDING_PRODUCTIZATION_CLOSEOUT.md`.
- Dettes séparées inchangées : **#641** double source promoteur ; **#643** validation téléphone serveur + anti-abus `/api/leads`.
<!-- B2B-PARTNER-LANDING-PRODUCTIZATION-END -->

<!-- PRICE-EXTRACTION-V2-CLOSEOUT-START -->
## SEARCH Price Extraction v2 ✅ CLOSED

- **PR #647 ✅ MERGED** — merge `7b5612fecb399c4a7af4d52d9bf3259f5d711f91`, exact head certifié `a706b6c002f98e04f034eeb83642e303f4add5d9`, **9/9 workflows SUCCESS**.
- Snapshot production final : **15 438** représentations publiques, **1 351** avec prix sûr = **8,75 %**, contre **915 / 15 438 = 5,93 %** avant le lot ; gain observé **+436 prix sûrs**.
- Backfill texte strict : **+124** prix ; extraction source-spécifique, URL de fiche uniquement, aucun prix inventé, aucun prix/m² converti en prix total.
- DarAgadir : **319 prix publics** ; QA min **1 600 DH**, médiane **850 000 DH**, max **31 000 000 DH** ; **0 short-stay/journalier tarifé**, **0 vente < 10 000 DH**, **0 suspicion prix/m²** sur le contrôle ciblé.
- PromoImmo Marrakech : **0/30** extraction suffisamment sûre → `HOLD`.
- Avito : **30/30 HTTP 403** → `HOLD`, aucun contournement anti-bot/login/captcha/API privée.
- Garde production DarAgadir short-stay fail-closed active ; CI PR read-only ; tout futur write détail exige un `workflow_dispatch` explicite.
- `15 438` = représentations publiques, **pas** un nombre garanti de biens uniques ; ce closeout ne prétend pas une couverture prix complète ni une autorisation tierce.
- Preuve détaillée : `docs/PRICE_EXTRACTION_V2_CLOSEOUT.md`.
<!-- PRICE-EXTRACTION-V2-CLOSEOUT-END -->

## Audit pages partenaires B2B ✅ CLOSED

- **Progression stricte : 5/5 jalons CLOSED = 100 %**.
- Scope : `/pro/agences`, `/promoteurs`, `/pro#contact`, `/demo/agence`, `/demo/promoteur`, profils publics professionnels/promoteurs.
- PR initiale **#642** supersédée après dérive orthogonale de `main`; replay propre **PR #646 ✅ MERGED**.
- Exact head #646 : `f280d69ac2f0304d06e58fc28de2700235452f6a`; merge : `d44e4d7145dae9c04f5ad6bd413175183e15f14e`.
- Gate B2B run `31855231126` ✅ : **13/13 tests**, TypeScript ✅, production build ✅.
- UI certification run `31855231168` ✅ : **208/208 captures**, **0 finding**, 52 pages rendables + 12 blockers explicites.
- Artefact `9238878207`, digest `sha256:b65527fcb38e8120b3529c0dfa9e757ccf790dc4b69f9dac59db63d9350114d5`.
- Landings `/pro/agences` et `/promoteurs` inspectées post-correctif en 390 / 430 / 768 / 1280 : hiérarchie stable, CTA lisibles, aucun overflow observé.
- Correctifs : contexte agence/promoteur conservé jusqu’au formulaire, pré-sélection du profil, `source_page` conservée, canonicals explicites, `/promoteurs` statique, téléphone client 8–15 chiffres, test dédié branché au gate B2B officiel.
- Dette **#641** : retirer/migrer la double source de vérité promoteur legacy avant toute première activation réelle.
- Dette **#643** : durcir validation téléphone serveur + anti-abus de `/api/leads` dans un lot transverse.
- Archive : `docs/B2B_PARTNER_PAGES_DEEP_AUDIT.md`.

# AkarFinder — Session courante

**Mise à jour : 2026-08-15**

Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.

## Audit Toutes Pages — chantier CLOSED

- **Progression stricte : 5/5 jalons CLOSED = 100 %** — seuls les jalons certifiés + mergés comptent.
- **A1 Inventaire exhaustif ✅ CLOSED — PR #626**, merge `34ab649e2571303972d7791ea0738c6560dde3b6`.
  - inventaire automatique `app/**/page.tsx` : **64 pages = 57 statiques + 7 dynamiques** ; 0 doublon ; 0 route dynamique non classée.
- **A2 Baseline exhaustive ✅ CLOSED — PR #630**, merge `598d778915dad3f326872e11f41cc26071a4aee4`.
  - run `31818373848` ✅ ; **252/252 captures** ; baseline initiale **120 findings sur 19 routes**.
- **A3 Remédiation structurée ✅ CLOSED — PR #631**, merge `27b109abde4c868bdf43d41c9f3003e761ccad48`.
  - vrai défaut produit corrigé : overflow `/vendre/dossier` ; inspection humaine 390 / 430 / 768 / 1280 PASS ;
  - redirects et 401 attendus modélisés explicitement ; aucune erreur générique whitelistée ;
  - inventaire final : **52 pages rendables + 12 blockers explicitement typés** ;
  - run `31822919168` ✅ ; **208/208 captures, 0 finding** ; artefact `9227821372`, digest `sha256:48a05a18873353c74de7c857fe3035f66ae79183ba527c7dc2ec78502b8f17aa`.
- **A4 Recertification stricte ✅ CLOSED — PR #633**, merge `9107c0143ea053a329bd55cfae06ae2b36cbd8ed`, exact head `3a696cab09dbd81c188aa26b25b3156badd9b996`.
  - run `31824121689` ✅ ; **208/208 captures, 0 finding, 0 route en défaut** ;
  - gate strict : couverture complète obligatoire, 0 finding inattendu, blockers autorisés uniquement s’ils sont typés + justifiés ;
  - artefact `9228248430`, digest `sha256:7047553be163e3572e8b5d0b3d4d3613257010cddfbb43b19405e92a2b103f6a`.
- **A5 Gouvernance / closeout ✅ CLOSED — PR #635**, merge `1e429371fe6a0abef5dc440f647bdb06ccc51cd5`.
  - archive finale : `docs/UI_ALL_PAGES_V1_CERTIFICATION.md` ;
  - dette suivie : issue **#634** ;
  - 2 `DATA_FIXTURE_REQUIRED` : `/listings/[id]`, `/professionnels/[slug]` ;
  - 10 `QA_FIXTURE_REQUIRED` : `/visual-qa/{agdal,akkari,aviation,hassan,hay-riad,les-orangers,medina,ocean,souissi,yacoub-el-mansour}` ;
  - définition de complétude : **64/64 patterns comptabilisés** = page rendue+certifiée ou blocker explicite avec condition de déblocage. Cela ne prétend pas que les 12 blockers ont été visuellement rendus.

Viewports certifiés : **390×844 / 430×932 / 768×900 / 1280×900**.

## UI polish / mockup v1

- **10/10 jalons ✅ CLOSED = 100 %**.
- P0 Search → P5 certification globale certifiés et mergés.
- P5 : PR #624, merge `f2ed71568105b7d022e3e7bc370964adcf73e9b8`, run `31814084564` ✅, **68/68 captures**, 0 failure, 0 overflow.
- Archive : `docs/UI_POLISH_V1_CERTIFICATION.md`.
- Hotfix Comparer ✅ PR #625, merge `ad98a9cc3afddb3ee096c478fd990cc05ddddacc` : CTA `Ouvrir le comparateur` visible dans Favoris ; inspection 390 / 430 / 768 / 1280 PASS.

## Search Ranking v2

- **PR #629 ✅ MERGED**, merge `7d20556a610c69b0898b21e3ccf2baa3bb50a580`.
- RPC/migration v2 actifs et audits DB validés ; hiérarchie commerciale codée sans entitlement inventé.
- **Déploiement applicatif production toujours BLOQUÉ** : `VERCEL_TOKEN` absent/vide dans GitHub Actions lors du dernier contrôle ; ne pas prétendre que l’interleaving applicatif de `main` est servi par Vercel tant qu’un déploiement authentifié n’est pas prouvé.

## Bibliothèque visuelle quartiers

- **Rabat P0 → P2 Visual Resolver integration ✅ CLOSED**.
- **P3 national rollout ⏳ NEXT**.
- Doctrine : photos réelles uniquement, provenance/licence défendables, aucune géographie inventée.

## DATA MASS

- **MASS-1 → MASS-6 ✅ CLOSED**.
- **MASS-X5 ✅ CLOSED — PR #609**.
- Toute activation/mutation production reste hors scope sans gate humain explicite.

## Invariants opérationnels

- zéro donnée, permission, géographie ou provenance inventée ;
- aucune écriture DB sans gate humain explicite ;
- une responsabilité / branche / PR / merge par lot ;
- CI en cours n’interrompt pas le travail indépendant ;
- exact-head + preuve visuelle requise avant certification d’un lot visuel ;
- une route bloquée doit être explicitement typée et suivie, jamais silencieusement exclue.

## Reprise exacte

**SEARCH Price Extraction v3 ✅ CLOSED techniquement via #649 ; closeout documentaire #652 en cours. Snapshot live consigné : 2 694 / 15 438 = 17,45 %. Prochaine action : v4 source par source, sans bypass ni inférence faible.**