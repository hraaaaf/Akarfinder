# AkarFinder — Session courante

**Mise à jour : 2026-08-14**

Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.

## UI polish / mockup v1

- **Progression stricte : 7/10 jalons CLOSED = 70 %** — seuls les lots certifiés + mergés comptent.
- **P0 Search ✅ CLOSED** — Search v1 reste la référence visuelle figée.
- **P1 Audit réel mobile ✅ CLOSED — PR #597** — 12/12 captures réelles sur `/search`, `/favorites`, `/map`, `/alerts`, `/compare`, `/mon-projet` en 390×844 / 430×932, 0 overflow horizontal.
- **P2 Design system transversal ✅ CLOSED — PR #615**, merge `993adff175e156eb3d159e63b687a6f992203b1d`.
- **P3.1 Favoris ✅ CLOSED — PR #617**, merge `a4fd6506803805e6ff0ab464cf80ca3aa103e5bf`.
- **P3.2 Carte ✅ CLOSED — PR #618**, merge `268e1e2ecdf989e0a007de267db5fe9ae7950d0e`.
- **P3.3 Alertes ✅ CLOSED — PR #619**, merge `4590282a7b26443a01b8305252bb57ea0371e787`.
- **P3.4 Comparer ✅ CLOSED — PR #620**, merge `3304458c7640f45c769dea06e78853f23e481b96`, exact head `7fe6fa89eb226a35a8304729cab6add4587f1548`.
  - certification P3 `31809184403` ✅ ; Canonical `31809184421` ✅ ; Compile `31809184402` ✅ ; A11y `31809184406` ✅ ; Gate0 `31809184428` ✅ ;
  - harness renforcé à **24 captures** avec `/compare` vide + populated-state 2 biens ; inspection humaine 390 / 430 / 768 / 1280 PASS ; rail mobile sticky, cartes tablette et tableau desktop vérifiés ; artefact `9222467501`, digest `sha256:6c1e90d2d774a1525d79cee963c77a8ce880df5f2ec3107fb490eb365d7762dc`.
- **P3.5 Mon Projet 🔄 NEXT** — branche préparée ; puis P4 pages secondaires et P5 certification globale.
- La lane UI ne doit pas écraser DATA ni la bibliothèque visuelle.

## Bibliothèque visuelle quartiers — Rabat

Doctrine verrouillée : photos réelles uniquement, provenance/licence défendables, aucune photo d’ambiance présentée comme photo du bien, aucune géographie inventée.

- **P0 Souissi → P2 Visual Resolver integration ✅ CLOSED**.
- **P3 national rollout ⏳ NEXT**.

## DATA MASS

- **MASS-1 → MASS-6 ✅ CLOSED**.
- **MASS-X5 ✅ CLOSED — PR #609**.
- Toute activation ou mutation production reste hors scope et exige un gate humain explicite.

## Invariants opérationnels

- `code mergé dans main → SESSION/ROADMAP/README cohérents → lot suivant` ;
- zéro donnée, permission, géographie ou provenance inventée ;
- une responsabilité / branche / PR / merge par lot ;
- aucune écriture DB sans feu vert humain explicite préalable ;
- CI en cours n'interrompt pas le travail indépendant ;
- exact-head + preuve visuelle requise avant certification d'un lot visuel.

## Reprise exacte

**UI polish : P0 → P3.4 Comparer ✅ CLOSED, progression stricte 70 %. Prochaine action exacte : P3.5 Mon Projet, certifier 390 / 430 / 768 / 1280, inspecter les captures, corriger puis merger.**
