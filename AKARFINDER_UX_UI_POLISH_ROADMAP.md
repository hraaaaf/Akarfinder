# AKARFINDER_UX_UI_POLISH_ROADMAP.md

## Chantier
AkarFinder — UX/UI Global Polish

Dernière mise à jour : 2026-08-30

## Goal
Polir le site page par page sans refonte gratuite, avec priorité à la hiérarchie, la densité, la cohérence inter-pages, les états vides et la qualité perçue mobile/desktop.

## Méthode
BEFORE 390×844 / 430×932 / 768×900 / 1280×900 → Goal → référence → implémentation → AFTER mêmes viewports → comparaison + tests → score visuel.

Contraintes respectées : aucun changement ranking/data/DB dans ce chantier ; aucun déploiement Vercel.

# État final — CLOSED

- P0 : CLOSED.
- P1 : CLOSED.
- P2 : CLOSED.
- UX/UI Global Polish : CLOSED.

## P0.2 `/search` — CLOSED

- BEFORE canonique : run `33196086594`, artifact `9695997166`, 390×844 / 430×932 / 768×900 / 1280×900.
- Référence premium #947 absorbée dans #949 sans dérive des composants produit.
- Candidat fonctionnel certifié `a323b9f8ffffd4bae700b53dd809623a0597de4f` :
  - Search-7 `33305319046` ✅, artifact `9730427654` ;
  - Search Final `33305319133` ✅, artifact `9730434749` ;
  - UI All Pages Certification `33305319034` ✅ ;
  - P0 Closure `33305319049` ✅ ;
  - P2 Residual Closure `33305319108` ✅ ;
  - Accessibility `33305318971` ✅.
- Viewport 430×932 inclus dans le certifieur final.

## P1 — CLOSED

- `/neuf` : CLOSED — score 9.1/10.
- `/investir` + `/mre` : CLOSED — score 9.2/10.
- `/credit` : CLOSED / NO-CHANGE.
- `/favorites` + `/compare` + `/alerts` : CLOSED — score 9.1/10.
- `/accompagnement` + `/faq` + `/contact` + `/a-propos` : CLOSED — score 9.2/10.
- `/acheter` + `/louer` + `/immobilier` + `/quartiers` : CLOSED / NO-CHANGE.

## P2 — CLOSED

Preuves fonctionnelles :
- UI Polish P4 Secondary `33305318966` ✅ ;
- UI Polish P5 Global `33305318861` ✅ ;
- UI All Pages Baseline `33305319147` ✅ ;
- UI All Pages Certification `33305319034` ✅ ;
- Premium Header `33305318978` ✅ ;
- Bottom Nav `33305319180` ✅ ; Premium BottomNav Glass `33305319142` ✅ ;
- Premium Cards Media `33305319184` ✅ ; Cards `33305319057` ✅ ;
- Lot 8 Casablanca AFTER `33305319144` ✅ ; C7 `33305319182` ✅ ;
- Contextual Foundation / Agadir / SCALE-1 / SCALE-2 / Rabat Real Photo Library ✅.

Corrections de closeout :
- audits historiques réalignés sur les sélecteurs et surfaces actuels sans affaiblir les garanties ;
- SCALE-2 respecte la hiérarchie actuelle : photo d’ambiance Rabat prioritaire, illustrations contextuelles Tanger/Fès, resolver 36/36 conservé ;
- overflow, disclosure, assets, fallbacks, stabilité reload, build et TypeScript restent contrôlés ;
- derniers correctifs de certification sans modification produit.

## Exact-head final avant merge

HEAD `17c81df1b1f2f1a2c10abe0b3a26f165973bc67e` :
- UI All Pages Baseline `33306177793` ✅ ;
- UI All Pages Certification `33306177902` ✅ ;
- Search Final `33306177787` ✅ ;
- Search-7 `33306177878` ✅ ;
- P0 Closure `33306177917` ✅ ;
- P2 Residual Closure `33306177786` ✅ ;
- SCALE-2 `33306177924` ✅ ;
- aucun run rouge dans la vague finale ; L4/L5 skip attendus.

## Git / closeout

- PR #949 : MERGED le 2026-08-30.
- Merge commit sur `main` : `048ad51612749f0ddf3d3df958395e5b1bc2abe5`.
- Merge commit signé par GitHub, parents exacts : ancien `main@3495fc2938a003160569a607876fdc93142d1f39` + branche `17c81df1b1f2f1a2c10abe0b3a26f165973bc67e`.
- PR #947 : CLOSED, superseded by #949.
- aucun déploiement Vercel.

## NEXT EXACT
Aucune action restante sur ce chantier. Reprendre le prochain lot produit depuis `main`.
