# AkarFinder Product Experience — P6 Quartier / Ville

Date : 2026-08-21
Base : `main@e56855609ffdf1de94bffac0191e817f383b9ff2`
Statut : **PREPARED — RUN / AFTER / HUMAN GATE À CERTIFIER**

## Goal

Faire converger les surfaces Ville et Quartier vers la hiérarchie canonique :

`Territoire → Marché → Vie locale → Biens → Décision`

avec une lecture plus courte, une mini-carte territoriale réelle et la palette bleu / navy / blanc, sans fabriquer de métrique ville, de position ou de disponibilité.

## Succès

1. Ville et Quartier commencent par un bloc Territoire compact ;
2. trois repères truth-safe sont visibles immédiatement ;
3. Ville ne calcule aucune moyenne prix : elle compte uniquement les quartiers disposant réellement d'un repère marché ;
4. Vie locale Ville est un nombre de tags réellement présents dans les quartiers contrôlés ;
5. Quartier réutilise uniquement `priceLabel`, `pricePeriod`, `confidence`, `lifestyleTags` et `proximityHighlights` existants ;
6. la mini-carte utilise les coordonnées canoniques existantes et n'invente aucun polygone ;
7. Biens précède Décision ;
8. le style bronze est absent de la surface P6 ;
9. `GeoResultPreview` conserve son rendu historique par défaut et n'active le bleu que via `accent="brand"` ;
10. 0 overflow sur 390 / 430 / 768 / 1280 ;
11. header blanc exact, logo canonique et un seul H1/main par route ;
12. 8/8 captures AFTER et 0 finding ;
13. aucun déploiement Vercel.

## BEFORE exact

Branche : `agent/product-experience-p6-quartier-ville-before`
PR : `#838` — **CLOSED / PROOF ONLY / NEVER MERGE**
HEAD : `7a630672f522584ae5a2233bca7a22cd2f170347`
Run : `32489490492` — **SUCCESS**
Artifact : `9449200557`
Digest : `sha256:3642119d082c896435676021c00a83c6866bc356dba21be39a8f2ad36279bf95`
Routes : `/immobilier/rabat` et `/immobilier/rabat/agdal`
Viewports : 390×844 / 430×932 / 768×900 / 1280×900
Résultat : **8/8 captures, 0 finding, 0 overflow**.

### Écart observé

Le runtime BEFORE est responsive et fonctionnel, mais trop éditorial : prose longue, cartes dispersées, Marché / Vie locale / Biens / Décision peu hiérarchisés et accents bronze hérités. Sur mobile, l'information utile demande un scroll important avant d'atteindre les biens.

## Référence visuelle

Référence P1-B1 certifiée :
- run `32406060774` — SUCCESS ;
- artifact `9420359227` ;
- `quartier-390x844.png` ;
- `quartier-1280x900.png`.

La référence impose la composition : titre territoire → trois repères → carte dominante → biens → décision. Les chiffres du mockup ne sont jamais copiés sans donnée réelle correspondante.

## Implémentation préparée

### Ville

- résumé `Marché` = nombre de quartiers SEO disposant réellement d'un `priceLabel` ;
- résumé `Vie locale` = nombre de lifestyle tags réellement présents ;
- résumé `Territoire` = nombre de quartiers SEO contrôlés ;
- centre mini-carte = moyenne des coordonnées des seuls quartiers canoniques disponibles ;
- aucun prix/m² ville agrégé ;
- biens puis décision, puis exploration par quartiers.

### Quartier

- résumé Marché = `priceLabel` + `pricePeriod` existants, sinon fallback explicite ;
- résumé Vie locale = nombre de `proximityHighlights` existants ;
- résumé Confiance = niveau existant ;
- mini-carte = coordonnées exactes du `NeighborhoodPoint` canonique ;
- tags et proximités existants conservés de façon compacte ;
- biens puis décision.

## Certification finale requise

Workflow `Product Experience P6 Quartier Ville` :
- contrat P6 truth-safe ;
- TypeScript ;
- build production ;
- Chromium réel ;
- mini-cartes chargées ;
- ordre Territoire < Biens < Décision ;
- trois summaries exacts ;
- zéro classe bronze dans la surface P6 ;
- 8 captures AFTER ;
- 0 finding.

Après run vert : inspection 8/8 → comparaison BEFORE / P1-B1 / AFTER → score UX/UI P6 → human gate explicite avant merge.

## Hors scope

Le concept interactif national « villes / régions comme boutons de carte » reste PARKED. PR #835 fermée sans merge. Aucun déploiement Vercel dans P6.
