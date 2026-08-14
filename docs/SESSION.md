# AkarFinder — Session courante

**Mise à jour : 2026-08-14**

Handover opérationnel court. `README.md` porte l’identité/doctrine. `docs/ROADMAP.md` reste la roadmap canonique. Les preuves détaillées vivent dans les archives de certification dédiées.

## Audit Toutes Pages — chantier actif

- **Progression stricte : 4/5 jalons CLOSED = 80 %** — seuls les jalons certifiés + mergés comptent.
- **A1 Inventaire exhaustif ✅ CLOSED — PR #626**, merge `34ab649e2571303972d7791ea0738c6560dde3b6`.
  - inventaire automatique `app/**/page.tsx` : **64 pages = 57 statiques + 7 dynamiques** ; 0 doublon ; 0 route dynamique non classée.
- **A2 Baseline exhaustive ✅ CLOSED — PR #630**, merge `598d778915dad3f326872e11f41cc26071a4aee4`.
  - run `31818373848` ✅ ; **252/252 captures** ; baseline initiale **120 findings sur 19 routes**.
- **A3 Remédiation structurée ✅ CLOSED — PR #631**, merge `27b109abde4c868bdf43d41c9f3003e761ccad48`.
  - vrai défaut produit corrigé : overflow `/vendre/dossier` ; inspection humaine 390 / 430 / 768 / 1280 PASS ;
  - redirects et 401 attendus modélisés explicitement ; aucune erreur générique whitelistée ;
  - inventaire final : **52 pages rendables + 12 blockers explicitement typés** ;
  - run `31822919168` ✅ ; **208/208 captures, 0 finding** ; artefact `9227821372`, digest `sha256:48a05a18873353c74de7c857fe3035f66ae79183ba527c7dc2ec78502b8f17aa`.
- **A4 Recertification stricte ✅ CLOSED — PR #633**, merge `9107c0143ea053a329bd55cfae06ae2b36cbd8ed`, exact head `3a696cab09dbd81c188aa26b25b3156badd9b996`.
  - run `31824121689` ✅ ; **208/208 captures, 0 finding, 0 route en défaut** ;
  - gate strict : couverture complète obligatoire, 0 finding inattendu, blockers autorisés uniquement s’ils sont typés + justifiés ;
  - artefact `9228248430`, digest `sha256:7047553be163e3572e8b5d0b3d4d3613257010cddfbb43b19405e92a2b103f6a`.
- **A5 Gouvernance / closeout ⏳ ACTIVE — PR #635**.
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

**Audit Toutes Pages — 80 %. A1→A4 CLOSED. A5 ACTIVE sur PR #635 : attendre uniquement les checks devenus nécessaires, merger le closeout si verts, vérifier `main` + archive + SESSION, puis le chantier passe à 100 %. Issue #634 conserve la dette des 12 fixtures sans falsifier la certification.**
