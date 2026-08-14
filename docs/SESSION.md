# AkarFinder — Session courante

**Mise à jour : 2026-08-14**

Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.

## UI polish / mockup v1

- **Progression stricte : 10/10 jalons CLOSED = 100 %** — seuls les lots certifiés + mergés comptent.
- **P0 Search ✅ CLOSED** — Search v1 reste la référence visuelle figée.
- **P1 Audit réel mobile ✅ CLOSED — PR #597** — 12/12 captures réelles sur `/search`, `/favorites`, `/map`, `/alerts`, `/compare`, `/mon-projet` en 390×844 / 430×932, 0 overflow horizontal.
- **P2 Design system transversal ✅ CLOSED — PR #615**, merge `993adff175e156eb3d159e63b687a6f992203b1d`.
- **P3.1 Favoris ✅ CLOSED — PR #617**, merge `a4fd6506803805e6ff0ab464cf80ca3aa103e5bf`.
- **P3.2 Carte ✅ CLOSED — PR #618**, merge `268e1e2ecdf989e0a007de267db5fe9ae7950d0e`.
- **P3.3 Alertes ✅ CLOSED — PR #619**, merge `4590282a7b26443a01b8305252bb57ea0371e787`.
- **P3.4 Comparer ✅ CLOSED — PR #620**, merge `3304458c7640f45c769dea06e78853f23e481b96`, exact head `7fe6fa89eb226a35a8304729cab6add4587f1548`.
  - certification P3 `31809184403` ✅ ; harness 24 captures avec Compare vide + populated 2 biens ; inspection humaine 390 / 430 / 768 / 1280 PASS ; artefact `9222467501`, digest `sha256:6c1e90d2d774a1525d79cee963c77a8ce880df5f2ec3107fb490eb365d7762dc`.
- **P3.5 Mon Projet ✅ CLOSED — PR #621**, merge `29bdbd9bd3c87bff04dac2c316c0c6509b801fb5`, exact head `42e3aa851cc586f4845736394db555ade5933a96`.
  - certification P3 `31810201144` ✅ ; Canonical `31810201062` ✅ ; Compile `31810201036` ✅ ; A11y `31810200972` ✅ ; User Journey `31810200977` ✅ ; Gate0 `31810201001` ✅ ;
  - inspection humaine 390 / 430 / 768 / 1280 PASS : wizard 8 étapes préservé, accès projets enregistrés visible, mobile scrollable et desktop équilibré ; artefact `9222864023`, digest `sha256:b1aba03a7d615571ab4a7f63a984fd98a90a6cdb242a7ff8cac88e45e670fb38`.
- **P3 ✅ CLOSED** — cinq pages prioritaires harmonisées et visuellement certifiées.
- **P4 pages secondaires ✅ CLOSED — PR #623**, merge `4b69ca81b88961db17230cb1d7fccf2b503483a1`, exact head `9f16043ce3d31fac3d7d2003f0bb3a8fed2f1868`.
  - baseline 40-shot `31811601185` ✅ ; after-state 40-shot `31812334242` ✅ ; Search Final `31812334233` ✅ ; Canonical `31812334751` ✅ ; Compile `31812334387` ✅ ; A11y `31812334223` ✅ ; P3 regression `31812334278` ✅ ;
  - 10 routes secondaires couvertes sur 390 / 430 / 768 / 1280 ; 7 pages réellement dérivantes migrées vers `SecondaryPageShell`; `/acheter`, `/accompagnement`, `/compagnon` préservés car aucune anomalie structurelle nécessitant refonte ;
  - inspection humaine after-state PASS ; safe zone mobile `pb-28` vérifiée ; artefact `9223686303`, digest `sha256:f254721a672c1a4acd35786ed2528ddf2180e7dc858bf7d720c4a2147a645885`.
- **P5 certification globale ✅ CLOSED — PR #624**, merge `f2ed71568105b7d022e3e7bc370964adcf73e9b8`, exact head `6c5dace409b9a2960faa7edb863094549d6777c2`.
  - run final `31814084564` ✅ ; 17 scénarios × 4 viewports = **68/68 captures**, **0 failure**, **0 overflow horizontal** ; Canonical `31814084526` ✅ ; Compile `31814084579` ✅ ; A11y `31814084513` ✅ ; Gate0 `31814084569` ✅ ; P0/P1/P2/P3 regressions ✅ ;
  - Comparer populated-state recertifié avec 2 biens sur 390 / 430 / 768 / 1280 ; inspection humaine finale PASS ; artefact `9224380594`, digest `sha256:d177d5faf18e7c930c626686bde74a2da9fa24299e3460ad228acb0810b6d424` ;
  - run initial `31813395364` conservé comme preuve superseded : 68 captures produites mais faux négatif du harness sur deux sélecteurs Compare inexistants ; aucun défaut produit associé.
- **UI polish / mockup v1 ✅ CLOSED — 100 %** — P0 → P5 certifiés et mergés.
- **Archive de certification : `docs/UI_POLISH_V1_CERTIFICATION.md`**.
- **Hotfix navigation post-closeout ✅ — PR #625**, merge `ad98a9cc3afddb3ee096c478fd990cc05ddddacc` : accès explicite `Ouvrir le comparateur` ajouté dans l’en-tête Favoris, visible même sans favori ; P3/P5 et tous gates exact-head verts ; inspection 390 / 430 / 768 / 1280 PASS.
- La lane UI n'a pas modifié DATA, ranking, Registry, persistance, géographie ou moteur listing hors de son périmètre.

## Audit Toutes Pages — nouveau chantier

- **Progression stricte : 2/5 jalons CLOSED = 40 %** — seuls les jalons certifiés + mergés comptent.
- **A1 Inventaire exhaustif ✅ CLOSED — PR #626**, merge `34ab649e2571303972d7791ea0738c6560dde3b6`, exact head `a9268f10ed615f8793bc977916566a44a79a7ee4`.
  - inventaire automatique `app/**/page.tsx` : **64 pages = 57 statiques + 7 dynamiques** ;
  - **63 rendables immédiatement**, **1 `DATA_FIXTURE_REQUIRED`** : `/professionnels/[slug]` faute de profil public déterministe validé ;
  - **0 route dynamique non classée, 0 doublon** ; artefact inventory `9225353414`, digest `sha256:22a5b55a92c412c843bff1afc9aa32164c9d5ed2772cd19e3e5c0cd119a864e9` ;
  - Gate0 rerun ✅ après un premier échec réseau Google Fonts ; 94/94 contrats UX + TypeScript + build final PASS.
- **A2 Baseline exhaustive ✅ CLOSED — PR #630**, merge `598d778915dad3f326872e11f41cc26071a4aee4`, exact head `6cdd456abe99de64a9ad022ac91f390c5818f78e`.
  - run `31818373848` ✅ ; **252/252 captures** sur 63 pages × 4 viewports ; artefact `9226367149`, digest `sha256:d5b7bf69c2f74b5099334c199e6bcfa2cfa496cdd2081d4a042bb69bfa249bae` ;
  - **120 findings sur 19 routes** : 64 console, 32 HTTP, 20 redirects, 4 overflow ;
  - seul défaut structurel certain détecté : `/vendre/dossier` déborde horizontalement aux 4 viewports (882 px de largeur utile sur 390/430 mobile) ;
  - redirects `/compagnon`, `/onboarding`, `/profil-recherche`, `/pro/leads`, `/quartiers` observés et à classifier comme attendus ou à corriger selon contrat ; plusieurs 404/console proviennent de fixtures QA/dynamiques et doivent être distingués des défauts produit avant remédiation.
- **A3 Remédiation structurée ⏳ ACTIVE** : priorité 1 = corriger l’overflow `/vendre/dossier`; priorité 2 = corriger/classifier fixtures HTTP/console/redirect sans masquer de défaut réel ; ne pas retoucher les pages déjà conformes.
- A4 Recertification exhaustive : after-state de toutes les pages rendables.
- A5 Certification finale / dette data : résolution ou traitement explicite de la page bloquée puis closeout global.
- Doctrine : chaque vraie page App Router compte, y compris routes dynamiques, redirections, pages auth et pages demo/QA ; les `route.ts` API ne comptent pas comme pages.
- Viewports cibles : 390×844 / 430×932 / 768×900 / 1280×900.

## Bibliothèque visuelle quartiers — Rabat

Doctrine verrouillée : photos réelles uniquement, provenance/licence défendables, aucune photo d'ambiance présentée comme photo du bien, aucune géographie inventée.
- **P0 Souissi → P2 Visual Resolver integration ✅ CLOSED**.
- **P3 national rollout ⏳ NEXT**.

## DATA MASS

- **MASS-1 → MASS-6 ✅ CLOSED**.
- **MASS-X5 ✅ CLOSED — PR #609**.
- Toute activation ou mutation production reste hors scope et exige un gate humain explicite préalable.

## Invariants opérationnels

- `code mergé dans main → SESSION/ROADMAP/README cohérents → lot suivant` ;
- zéro donnée, permission, géographie ou provenance inventée ;
- une responsabilité / branche / PR / merge par lot ;
- aucune écriture DB sans feu vert humain explicite préalable ;
- CI en cours n'interrompt pas le travail indépendant ;
- exact-head + preuve visuelle requise avant certification d'un lot visuel.

## Reprise exacte

**UI polish / mockup v1 ✅ CLOSED 100 % + hotfix Compare #625 ✅. Chantier actif : Audit Toutes Pages — 40 %. A1 + A2 CLOSED. A3 ACTIVE : corriger `/vendre/dossier`, classifier/corriger les fixtures HTTP/console/redirect, puis lancer la recertification exhaustive A4.**
