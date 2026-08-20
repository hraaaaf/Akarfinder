# AkarFinder Experience — P1-A1 Fidelity Shell

Date : 2026-08-20
Base : `main@665ae331fb5c3f015ca84d51cd321eca383fcd15`
Statut : **IMPLEMENTATION PREPARED — CI/AFTER À CERTIFIER**

## Goal

Unifier le shell visuel des écrans pivots AkarFinder sans réécrire Search C2, MapLibre, les contenus métier, le ranking, les données ni les contrats de vérité.

## Succès

1. Home conserve son hero transparent et le texte `1er moteur de recherche immobilier au Maroc` ;
2. Search C2 conserve son header `exact-white` et son ergonomie certifiée ;
3. les écrans applicatifs secondaires convergent vers une hauteur de chrome commune : 67 px sous 1024, 63 px à partir de 1024 ;
4. les headers light/compact reprennent la densité et le rythme du shell Search C2 ;
5. le bottom nav mobile reste visible sous 768 et caché à partir de 768 ;
6. aucun overflow horizontal sur les viewports certifiés ;
7. aucune mutation DB ;
8. aucun déploiement Vercel.

## Baseline BEFORE

Baseline exhaustive réutilisée : workflow `UI All Pages Baseline`, run `32360158450` sur `c32031bf0f3e419fe59dc87cd1e932d043cb162b`.

- 77 pages inventoriées ;
- 65 pages rendables ;
- 4 viewports : 390 / 430 / 768 / 1280 ;
- 260 / 260 captures ;
- 0 finding technique.

Le patch final C2 entre cette baseline et P1-A1 était non visuel ; cette baseline reste donc la référence BEFORE pertinente pour le shell.

## Référence visuelle validée

Référence : `P1_A1_REFERENCE_BOARD.png`, présentée et validée explicitement par le propriétaire produit le 20/08/2026.

Direction verrouillée :

- Home : marque, profondeur, hiérarchie ;
- Search C2 : chrome applicatif, densité, navigation ;
- Map : intelligence territoriale ;
- Visual System Proposition 3 : géométrie et tokens, pas un remplacement des pages métier.

## Écrans pivots certifiés

Le benchmark P1-A1 couvre 10 routes, dans la plage prévue de 8 à 12 :

1. `/` ;
2. `/search` ;
3. `/map?city=rabat&layer=explore` ;
4. `/acheter` ;
5. `/louer` ;
6. `/neuf` ;
7. `/immobilier/rabat` ;
8. `/mon-projet` ;
9. `/vendre` ;
10. `/pro/agences`.

Chaque route est certifiée en 390x844, 430x932, 768x900 et 1280x900.

## Implémentation

Le lot est volontairement limité à un shell CSS central :

- marqueur global `data-experience-shell="p1-a1"` ;
- tokens visuels du shell ;
- convergence des headers light/compact vers le chrome Search C2 ;
- Search C2 explicitement exclu des overrides ;
- Home transparent explicitement préservée ;
- aucun changement de contenu métier ou de données.

## Preuve machine requise

Workflow : `Experience P1 A1 Fidelity Shell`.

Il doit produire :

- TypeScript vert ;
- build production vert ;
- 40 / 40 captures AFTER ;
- 0 finding sur shell marker, H1, overflow, header geometry et mobile bottom nav ;
- artifact `experience-p1-a1-fidelity-shell-after-*`.

## Contrat d'arrêt

P1-A1 ne peut être fermé ni mergé avant :

1. workflow P1-A1 vert ;
2. inspection des captures AFTER aux mêmes viewports ;
3. comparaison BEFORE / référence validée / AFTER ;
4. score UX/UI ;
5. validation explicite du propriétaire produit ;
6. merge et closeout canonique.
