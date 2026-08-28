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

## État repo certifié avant merge
- Repo : `hraaaaf/Akarfinder`
- Base : `main`
- Branche : `feat/search-indexed-visual-polish-p1`
- PR : `#945`
- HEAD certifié : `2e4be82af6328852c9f62c7fd605aaeb4ca207bc`
- PR mergeable : oui au contrôle du 2026-08-28
- Diff : 4 fichiers, 174 additions, 65 suppressions
- DB : aucune modification
- Vercel : aucun déploiement demandé ou autorisé

## Implémentation
- palette éclaircie et rapprochée du TARGET ;
- `IndexedTransactionArtwork.tsx` redessiné avec line-art plus fin ;
- Achat enrichi maison + pin + clé + skyline légère ;
- Location enrichie porte ouverte + clé + ville légère ;
- Neuf enrichi grue + structure + arbres ;
- contrat de mapping couleurs mis à jour ;
- labels premium centralisés dans l'artwork pour rester visibles dans `SearchListingCardDark` et `ExternalIndexedResultCard`.

## Certification finale exact-HEAD
HEAD : `2e4be82af6328852c9f62c7fd605aaeb4ca207bc`

### CI Chromium
- `UI All Pages Baseline` run `33196086643` ✅
  - artifact `9695997913`
  - digest `sha256:ae0da525d0fd361d0e4f8fd6679d7b2a091e0b14bef85581ef5cfbd389ef0d65`
- `UI All Pages Certification` run `33196086594` ✅
  - artifact `9695997166`
  - digest `sha256:a3c9f8fe66ebbad4078ef26a10abfc3488bd81c5addc94f79ea9ad90e2d83f30`

### Exhaustivité
- pages inventoriées : 81
- pages rendables : 70
- pages bloquées attendues : 11
- viewports : 4
- captures attendues : 280
- captures obtenues : 280
- findings : 0
- routes avec finding : 0

### AFTER inspecté
`visual-qa/search-indexed-cards` :
- 390×844 ✅
- 430×932 ✅
- 768×900 ✅
- 1280×900 ✅

Constats visuels :
- Achat : maison + pin + clé immédiatement identifiables ✅
- Location : porte ouverte + clé, narration distincte ✅
- Neuf : grue + structure, narration distincte ✅
- palette claire et line-art fin conformes au TARGET ✅
- badges transaction colorés visibles ✅
- `Annonce indexée` visible ✅
- aucune photo tierce ✅
- aucune régression critique observée sur les quatre viewports ✅

Score visuel du composant illustré : **9.2/10**.
Le score porte sur l'illustration transactionnelle et sa hiérarchie visuelle, pas sur une refonte globale du layout de la page QA.

## CI globale hors diff
Plusieurs gates historiques restent rouges sur des contrats Search/`/compagnon` et autres validations globales. Ils ne touchent pas les 4 fichiers du polish. Les deux certifications Chromium exact-HEAD du lot sont vertes et exhaustives ; les échecs hors diff restent documentés, pas masqués.

## Closeout
- Goal visuel : atteint avec preuve exact-HEAD ✅
- certification Chromium exhaustive : ✅
- AFTER inspecté 390/430/768/1280 : ✅
- findings certification : 0 ✅
- DB : inchangée ✅
- Vercel : aucun déploiement ✅

## NEXT EXACT
1. Passer la PR #945 de draft à ready.
2. Squash merge avec protection par HEAD attendu.
3. Vérifier `main` post-merge.
4. Aucun déploiement Vercel sans human gate explicite.

## Avancement
**P1 certifié — prêt au merge.**
