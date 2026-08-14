# AkarFinder — Session courante

**Mise à jour : 2026-08-14**

Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.

## UI polish / mockup v1

- **Progression stricte : 4/10 jalons CLOSED = 40 %** — seuls les lots certifiés + mergés comptent.
- **P0 Search ✅ CLOSED** — Search v1 reste la référence visuelle figée.
- **P1 Audit réel mobile ✅ CLOSED — PR #597** — 12/12 captures réelles sur `/search`, `/favorites`, `/map`, `/alerts`, `/compare`, `/mon-projet` en 390×844 / 430×932, 0 overflow horizontal.
- **P2 Design system transversal ✅ CLOSED — PR #615**, merge `993adff175e156eb3d159e63b687a6f992203b1d`, exact head `8e8487be7ff06a92e603ed9a262762aca00ab8bc`.
  - primitives light-premium transversales + `surfaceGlass` ; `/compare` garde Favoris actif dans la bottom-nav ; harness P3 390 / 430 / 768 / 1280 ;
  - Design System `31794270618` ✅ ; Canonical `31794270705` ✅ ; Compile `31794270596` ✅ ; BottomNav `31794270558` ✅ ; Premium BottomNav `31794270592` ✅ ; Search Final `31794270709` ✅ ;
  - Search Final : machineScore 10, 6 viewports, 0 overflow, 0 image cassée ; référence Search visuellement préservée.
- **CI flow ✅ optimisé — PR #608**, merge `28b9e885e947edb909c4c314665ecc60e34ab0cc` — `cancel-in-progress` + scoping des lanes hors sujet ; la fan-out UI observée est passée d'environ 22–100+ runs à ~9–12 runs utiles selon le scope.
- **Visual Inventory stale contracts ✅ corrigés — PR #613**, merge `db93d63650bf44d14e6877bda03dd572628b6a90` — contrat + audit alignés sur les pools Rabat certifiés actuels, sans runtime/data/ranking mutation.
- **P3 visual certification ✅ ACTIVE — PR #616**, merge `e23be20203efd8566079665b5d27b504d0ce4133` — workflow 5 routes × 4 viewports = 20 captures réelles ; harness corrigé pour mesurer la visibilité CSS réelle de la bottom-nav et sa destination active.
- **P3.1 Favoris ✅ CLOSED — PR #617**, merge `a4fd6506803805e6ff0ab464cf80ca3aa103e5bf`, exact head `1395fe11d6ce2af3d127f62f3ba9f5b5bc68b929`.
  - 20-shot exact-head `31802048676` ✅ ; Canonical `31802048710` ✅ ; Compile `31802048765` ✅ ; A11y `31802048822` ✅ ; Design System `31802048795` ✅ ;
  - inspection humaine 390×844 : CTA vide corrigé en bleu canonique `#0B63CE`, bottom-nav active Favoris, 0 overflow ; artefact `9219711069`, digest `sha256:b73ea87c9bb831f4decbe6d89a652c87979fdfc672c3b97dc37392eb3be08b47`.
- **P3.2 Carte 🔄 NEXT** — branche v4 préparée ; puis Alertes, Comparer, Mon Projet, une PR à la fois.
- La lane UI ne doit pas écraser DATA ni la bibliothèque visuelle.

## Bibliothèque visuelle quartiers — Rabat

Doctrine verrouillée : photos réelles uniquement, provenance/licence défendables, aucune photo d’ambiance présentée comme photo du bien, aucune géographie inventée.

- **P0 Souissi ✅ CLOSED**.
- **P1.1 Agdal ✅ CLOSED**.
- **P1.2 Akkari ✅ CLOSED**.
- **P1.3 Aviation ✅ CLOSED**.
- **P1.4 Hassan ✅ CLOSED**.
- **P1.5 Hay Riad ✅ CLOSED**.
- **P1.6 Les Orangers ✅ CLOSED**.
- **P1.7 Médina ✅ CLOSED — PR #556**.
- **P1.8 Océan ✅ CLOSED — PR #588**, merge `48188de7f62c80da163ff157040940712e45c93f`.
- **P1.9 Yacoub El Mansour / Hay El Fath ✅ CLOSED — PR #595**, merge `ab8f283c727f14b23f6f5717b6cadac5450ad07a`.
- **P2 Visual Resolver integration ✅ CLOSED — PR #605**.
  - exact head certifié `0451af0fe05997d747ec5e938c0cd52161af4117` ;
  - merge `997d60dad5fdcd2ad6b081b299834daa9a59bed2` ;
  - 5 pools P1 ajoutés au resolver Search : Akkari, Aviation, Les Orangers, Médina, Yacoub El Mansour / aliases Hay El Fath / Hay Al Fath ;
  - sélection déterministe et fallback ville historique préservés ; non-Rabat inchangé ;
  - labels publics truth-safe : `Rabat • contexte <quartier>` pour ne jamais transformer `nearby/edge_context` en claim `inside` ;
  - disclosure `Photo d’ambiance` conservé ; crédits source dynamiques exacts `Wikimedia Commons` / `KartaView` ; provider inconnu fail-closed ;
  - Contract `31760579909` ✅ ; Product Design Reviewer `31760579663` ✅ ; Independent Release Certifier `31760579853` ✅ ; legacy Rabat `31760579895` ✅ ;
  - artefacts : Product Design `9204939278`, digest `sha256:8de06fdae2d11cbe1f83bd5e1cd37849ae011b1cf63961ca21c45975549384b9` ; Independent Release `9204968178`, digest `sha256:8c87f000bb353d31c1f259d79cbb657e12f039f486802b54435e2fe9a23ff72e` ;
  - QA 360 / 390 / 768 / 1024 / 1280 / 1440 : 5/5 vraies photos chargées, 0 overflow, labels truth-safe et crédits exacts ;
  - human gate **PASS 9,2/10** sur contrôle réel 390×844 et 1440×900.
- **P3 national rollout ⏳ NEXT** — étendre la doctrine P2 hors Rabat sans abaisser les exigences de provenance, truth-boundary, droits ou QA.
- **P4 visual intelligence ⏳** après P3.

## DATA MASS

- **MASS-1 → MASS-6 ✅ CLOSED**.
- **MASS-X5 ✅ CLOSED — PR #609** — Exact Reconciliation Shadow v2 ; merge `3f1724faf03fd3c93fdafc2f522d61465d377e5b` ; exact head `f66c5578c433df52da37a00dc36d9a39010846ae` ; run `31762998799` SUCCESS ; artefact `9205427369`.
- Résultat canonique : **51 169 candidats uniques = 36 732 overlaps + 14 437 net-new**.
- Invariants : 0 DB write / 0 Registry write / 0 Search activation / 0 source-page fetch / 0 permission inference.
- Toute activation ou mutation production reste hors scope et exige un gate humain explicite.

## Invariants opérationnels

- `code mergé dans main → SESSION/ROADMAP/README cohérents → lot suivant` ;
- zéro donnée, permission, géographie ou provenance inventée ;
- une responsabilité / branche / PR / merge par lot ;
- aucune écriture DB sans feu vert humain explicite préalable ;
- CI en cours n'interrompt pas le travail indépendant ;
- exact-head + preuve visuelle requise avant certification d'un lot visuel.

## Reprise exacte

**UI polish : P0 → P3.1 Favoris ✅ CLOSED, progression stricte 40 %. Prochaine action exacte : P3.2 Carte, ouvrir la branche v4 préparée sur le main courant, certifier 390 / 430 / 768 / 1280, inspecter les captures, corriger puis merger.**

**Bibliothèque visuelle : P0 → P2 ✅ CLOSED. Prochaine action exacte : P3 national rollout.**

**DATA MASS : programme CLOSED. Toute activation future est un nouveau programme séparé avec gate humain explicite.**
