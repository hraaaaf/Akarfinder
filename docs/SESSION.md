# AkarFinder — Session courante

**Mise à jour : 2026-08-14**

Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.

## UI polish / mockup v1

- **Progression stricte : 6/10 jalons CLOSED = 60 %** — seuls les lots certifiés + mergés comptent.
- **P0 Search ✅ CLOSED** — Search v1 reste la référence visuelle figée.
- **P1 Audit réel mobile ✅ CLOSED — PR #597** — 12/12 captures réelles sur `/search`, `/favorites`, `/map`, `/alerts`, `/compare`, `/mon-projet` en 390×844 / 430×932, 0 overflow horizontal.
- **P2 Design system transversal ✅ CLOSED — PR #615**, merge `993adff175e156eb3d159e63b687a6f992203b1d`, exact head `8e8487be7ff06a92e603ed9a262762aca00ab8bc`.
- **P3.1 Favoris ✅ CLOSED — PR #617**, merge `a4fd6506803805e6ff0ab464cf80ca3aa103e5bf`.
- **P3.2 Carte ✅ CLOSED — PR #618**, merge `268e1e2ecdf989e0a007de267db5fe9ae7950d0e`.
- **P3.3 Alertes ✅ CLOSED — PR #619**, merge `4590282a7b26443a01b8305252bb57ea0371e787`, exact head `350da11a85df356c770246e89113b74bad1da18c`.
  - 20-shot `31805985863` ✅ ; Canonical `31805985886` ✅ ; Compile `31805985775` ✅ ; A11y `31805985772` ✅ ; BottomNav `31805985811` ✅ ; Premium BottomNav `31805985849` ✅ ;
  - inspection humaine : chevauchement CTA/bottom-nav détecté puis corrigé via safe zone mobile `pb-28 md:pb-0`; recertification verte ; artefact `9221237011`, digest `sha256:ad958ef00ec457fc714ad97b32457d8b8e7f1077465bdd6efdcb96087fce9c06`.
- **P3.4 Comparer 🔄 NEXT** — branche préparée directement sur le `main` courant ; puis Mon Projet.
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

**UI polish : P0 → P3.3 Alertes ✅ CLOSED, progression stricte 60 %. Prochaine action exacte : P3.4 Comparer, ouvrir la branche préparée sur le main courant, certifier 390 / 430 / 768 / 1280, inspecter les captures, corriger puis merger.**
