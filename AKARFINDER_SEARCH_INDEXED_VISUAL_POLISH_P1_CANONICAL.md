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
- line-art fin, espaces blancs, décor contextuel très léger ;
- badge transaction coloré visible ;
- libellé `Annonce indexée` lisible dans le visuel.

## État repo
- Repo : `hraaaaf/Akarfinder`
- Base : `main`
- Base SHA : `b571a6b6c0f4ebeb59df279c0942d0b334e3b15d`
- Branche : `feat/search-indexed-visual-polish-p1`
- PR : `#945` draft
- HEAD actuel : `738ef25a18fe8db514d91cee67f6cc007108df92`
- DB : aucune modification
- Vercel : aucun déploiement sans autorisation explicite

## Implémentation
- palette éclaircie et rapprochée du TARGET ;
- `IndexedTransactionArtwork.tsx` redessiné avec line-art plus fin ;
- Achat enrichi maison + pin + clé + skyline légère ;
- Location enrichie porte ouverte + clé + ville légère ;
- Neuf enrichi grue + structure + arbres ;
- contrat de mapping couleurs mis à jour ;
- labels premium centralisés dans l'artwork pour rester visibles dans `SearchListingCardDark` et `ExternalIndexedResultCard`.

## Première certification visuelle — HEAD `3affe7e...`
Run Chromium baseline `33194701137` ✅
Artifact `9695432269` ✅
Digest `sha256:2c17ce69144956dbce658f9b20c6689f308d5d864e1a40e4d34024ee5960ede5`

Captures inspectées :
- 390×844 ✅
- 430×932 ✅
- 768×900 ✅
- 1280×900 ✅

Constats :
- line-art, palette et hiérarchie nettement rapprochés du TARGET ✅ ;
- Achat / Location / Neuf distincts ✅ ;
- aucune photo tierce ✅ ;
- défaut détecté : badge transaction sur `SearchListingCardDark` trop peu visible car le composant parent désactivait les labels internes ⚠️.

Correction appliquée : commit `738ef25a18fe8db514d91cee67f6cc007108df92`.
Les labels premium sont désormais forcés pour les transactions reconnues afin de conserver le badge coloré et `Annonce indexée` même lorsque le parent désactive historiquement ces overlays.

## CI globale hors diff
Le gate Phase 1 P0 rouge observé sur la PR échoue sur d'anciens contrats `/compagnon` / onboarding, sans rapport avec les fichiers du polish. Il est documenté, pas masqué.

## NEXT EXACT
1. Récupérer la nouvelle CI Chromium sur HEAD `738ef25...`.
2. Inspecter AFTER 390/430/768/1280.
3. Comparer TARGET / première passe / AFTER corrigé.
4. Si aucune régression critique : documenter score visuel final.
5. Closeout canonique.
6. PR ready puis squash merge si HEAD inchangé et mergeable.
7. Vérifier `main` post-merge.
8. Aucun déploiement Vercel sans human gate explicite.

## Avancement
**P1 actif — correction visuelle appliquée, recertification requise.**
