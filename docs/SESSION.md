# AkarFinder — Session courante

**Mise à jour : 2026-08-21**

Ce fichier est le handover opérationnel court. `README.md` porte l’identité/doctrine et `docs/ROADMAP.md` reste l’unique roadmap canonique.

## Product Experience Reconciliation — état courant

Progression validée : **9/12 lots CLOSED = 75 %**.

- P0–P2 ✅ CLOSED
- P3 Accueil ✅ CLOSED
- P4 Search + Carte ✅ CLOSED
- P5 Listings ✅ CLOSED
- P6 Quartier / Ville ✅ CLOSED
- P7 Mon Projet ✅ CLOSED
- P8 Publication ✅ CLOSED
- P9 Professionnels ⏭ NEXT
- P10 Pages secondaires ⏳
- P11 QA global / responsive / accessibilité / performance / nettoyage ⏳

## P8 Publication — closeout

- PR `#843` ✅ MERGED
- head certifié `10460c45028575dbd939cbaea53374512c840036`
- run dédié `32518229299` — SUCCESS
- artifact `9459637165`
- digest `sha256:b7601871caca2b3b10816a2cda8da44a4ad41c75dd364baa5eecc5350488bb25`
- 4/4 captures AFTER : 390×844 / 430×932 / 768×900 / 1280×900
- `findingCount = 0`
- score visuel humain : **9,1/10**
- human visual gate : APPROVED le 2026-08-21
- squash merge `bb14bedc5fa4cde8013dd31a83479c09dd610502`
- `main` post-merge vérifié sur ce commit
- aucune migration DB ; aucun Vercel
- preuve canonique : `docs/AKARFINDER_PRODUCT_EXPERIENCE_P8.md`

## Invariants Product Experience

- UI/UX : BEFORE exact → Goal écrit → référence/mockup → implémentation → AFTER mêmes viewports → comparaison → score → human gate avant merge ;
- aucune donnée, géographie, source, partenariat ou signal inventé ;
- exact-head + preuve dédiée avant certification ;
- CI en cours n’interrompt pas le travail indépendant ;
- aucun déploiement Vercel sans autorisation explicite.

## Reprise exacte

**P9 — Professionnels.** Commencer sur `main` après le closeout P8 : identifier les routes professionnelles cibles, capturer le BEFORE aux viewports 390 / 430 / 768 / 1280, verrouiller Goal + critères, récupérer la référence visuelle canonique avant toute implémentation, puis exécuter un seul lot P9 cohérent jusqu’au human gate.

Les autres lanes DATA / Search / Carte restent gouvernées par `docs/ROADMAP.md` et ne sont pas implicitement modifiées par ce handover Product Experience.
