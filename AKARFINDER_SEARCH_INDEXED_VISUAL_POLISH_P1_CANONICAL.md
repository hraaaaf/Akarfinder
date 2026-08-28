# AKARFINDER_SEARCH_INDEXED_VISUAL_POLISH_P1_CANONICAL.md

## Chantier
**AkarFinder — Search Indexed Visual — Polish P1**

Dernière mise à jour : 2026-08-28

## Goal
Rapprocher les illustrations `public_indexed` du mockup premium approuvé le 2026-08-28 : visuels blancs/airés, line-art fin et propriétaire, narration distincte par transaction.

- Achat : orange chaleureux, maison + repère + clé.
- Location : bleu cobalt, porte ouverte + clé + accès.
- Neuf : vert émeraude, grue + structure.

## Succès observable
- rendu plus fin et premium que la baseline certifiée du lot précédent ;
- aucune photo tierce réintroduite ;
- identité Achat / Location / Neuf lisible immédiatement ;
- aucun changement ranking/data/DB ;
- captures AFTER 390×844 / 430×932 / 768×900 / 1280×900 ;
- build + TypeScript + tests mapping verts ;
- comparaison BEFORE / TARGET / AFTER avant merge.

## BEFORE
Baseline certifiée du chantier précédent :
- run Chromium `33186984893` ✅
- artifact `9692437320`
- viewports 390 / 430 / 768 / 1280 ✅

## TARGET
Mockup utilisateur approuvé dans la conversation du 2026-08-28 : concept premium clair avec :
- Achat orange : maison / pin / clé ;
- Location cobalt : porte ouverte / clé ;
- Neuf vert : grue / structure ;
- line-art fin, espaces blancs, décor contextuel très léger.

## État repo
- Repo : `hraaaaf/Akarfinder`
- Base : `main`
- Base SHA : `b571a6b6c0f4ebeb59df279c0942d0b334e3b15d`
- Branche : `feat/search-indexed-visual-polish-p1`
- DB : aucune modification prévue
- Vercel : aucun déploiement sans autorisation explicite

## Implémentation en cours
- palette éclaircie et rapprochée du TARGET ;
- `IndexedTransactionArtwork.tsx` redessiné avec line-art plus fin ;
- Achat enrichi maison + pin + clé + skyline légère ;
- Location enrichie porte ouverte + clé + ville légère ;
- Neuf enrichi grue + structure + arbres ;
- contrat de mapping couleurs mis à jour.

## NEXT EXACT
1. Ouvrir PR draft.
2. Lancer/observer une fois les CI déclenchées.
3. Continuer tout travail indépendant pendant les runs.
4. Récupérer les captures Chromium 390/430/768/1280.
5. Comparer BEFORE / TARGET / AFTER.
6. Corriger si écart visuel critique.
7. Score visuel documenté seulement après inspection.
8. Closeout canonique + ready + merge si preuves vertes.
9. Aucun déploiement Vercel sans human gate explicite.

## Avancement
**P1 actif — implémentation terminée, certification pending.**
