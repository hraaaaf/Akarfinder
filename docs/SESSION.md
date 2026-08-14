# AkarFinder — Session courante

**Mise à jour : 2026-08-14**

Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.

## UI polish / mockup v1

- **Progression stricte : 9/10 jalons CLOSED = 90 %** — seuls les lots certifiés + mergés comptent.
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
- **P5 🔄 NEXT** — certification globale unique de toutes les surfaces prioritaires + secondaires, puis closeout final.
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

**UI polish : P0 → P4 ✅ CLOSED, progression stricte 90 %. Prochaine action exacte : P5 certification globale sur le main courant, inspection humaine finale, correction de toute régression mesurée, merge puis closeout canonique.**
