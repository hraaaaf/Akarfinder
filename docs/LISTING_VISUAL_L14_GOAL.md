# LISTING-VISUAL L14 — Hero + bloc signature

## Statut

ACTIVE — 0 % crédité avant preuve navigateur exact-head.

## Baseline vérifiée

- Source : rendu ANN-L13 certifié, viewport 1280.
- SHA-256 capture 1280 : `cf54e73b94f5b88c4e50909be89154369ac1f131e3aed122916fd52918bb7cba`.
- SHA-256 capture 390 : `717611935dab617fa0aa15ff3fe31a9be4dbab0a788637390cade403e0599dc7`.
- Baseline UX/UI : architecture solide mais rendu trop plat, hero peu statutaire lorsque le média est limité, prix/titre et facts encore traités comme contenu fonctionnel.

## Target visuel verrouillé

Référence fournie par le propriétaire produit le 2026-08-18 : fiche AkarFinder premium full-page, 864×1536.

SHA-256 du fichier de référence : `ff93da64787111a253782cd898e01290931566d925104bf4f50e847503060c84`.

Caractéristiques normatives L14 :

1. galerie immédiatement dominante, aspect éditorial, coins généreux et contrôles discrets ;
2. desktop multi-image : grande image principale + colonne de vignettes ;
3. badges sous le média, puis prix très statutaire, titre dense, localisation calme ;
4. bandeau de facts comme une surface premium unifiée, avec pictogrammes et séparateurs subtils ;
5. densité plus maîtrisée, davantage de profondeur et moins d'effet « document technique » ;
6. aucune donnée, photo, badge ou certification inventée pour atteindre le mockup ;
7. permissions et fail-closed média ANN-L0→L13 inchangés.

## Goal

Faire converger le haut de `/listings/[id]` vers ce target sans modifier les contrats métier ni introduire de contenu fictif.

## Succès observable

- hero visuellement dominant sur 1280 sans réduire la lisibilité du rail ;
- galerie desktop premium et mobile cohérente ;
- prix/titre/localisation hiérarchisés comme bloc signature ;
- facts regroupés dans une surface premium et responsive ;
- 0 overflow à 390 / 430 / 768 / 1280 ;
- aucune régression média, H1, permissions, CTA ou vérité ;
- revue avant / target / après ;
- score humain L14 ≥ 9,2/10.

## Preuve requise

- captures after aux mêmes viewports ;
- audit Chromium exact-head ;
- tests ANN-L1→L13 pertinents + TypeScript/build ;
- aucun déploiement Vercel dans ce lot.
