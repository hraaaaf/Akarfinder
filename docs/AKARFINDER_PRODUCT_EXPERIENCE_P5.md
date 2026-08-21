# AkarFinder Product Experience — P5 Listings

Date : 2026-08-21
Base : `main@842238669d08ea5efe190071b6a6b5af20e03b00`
Statut : **CERTIFIED — MERGED**

## Goal

Faire converger la fiche Listing réelle vers la hiérarchie canonique :

`Bien → Confiance → Marché → Vie locale → Décision → Source`

sans supprimer les fonctions premium déjà certifiées et sans fabriquer de signal métier.

## Succès

1. `PropertyCore` reste le bloc Bien canonique ;
2. Confiance, Marché et Vie locale sont visibles immédiatement après le Bien ;
3. Confiance n'affiche que la provenance réellement disponible ;
4. Marché n'affiche une médiane que pour une cohorte `certified` ;
5. Vie locale n'affiche des repères que lorsque le modèle fournisseur est visible et contient des POI ;
6. les fallbacks Marché / Vie locale sont explicites et non inventés ;
7. Décision est disponible avant l'Intelligence détaillée sur mobile et reste dans le rail desktop ;
8. Source suit la Décision ;
9. AkarFinder Intelligence, détails, financement, historique et provenance détaillée restent disponibles plus bas ;
10. aucun overflow horizontal sur 390 / 430 / 768 / 1280 ;
11. header exact-white, logo canonique et contrats CTA / Mon Projet restent verts ;
12. 4/4 captures AFTER et 0 finding ;
13. aucun déploiement Vercel.

## BEFORE exact

Branche de preuve : `agent/product-experience-p5-listings-before`
PR : `#836` — **CLOSED / PROOF ONLY / NEVER MERGE**
Run : `32476648839` — **SUCCESS**
Artifact : `9444556584`
Digest : `sha256:81ffb53c95c00a87194bef76445a7b80f3c38582270085ececddd28f11a33a56`
Route : `/visual-qa/announcement-page-pro-conversion`
Viewports : 390×844 / 430×932 / 768×900 / 1280×900
Résultat : 4/4 captures, aucun overflow, header exact-white et logo canonique préservés.

### Écart observé

Le runtime initial était fonctionnel et riche, mais la lecture utile était repoussée par un bloc `AkarFinder Intelligence` très dominant puis par le dossier détaillé. Sur mobile, Marché et Vie locale arrivaient tard dans le parcours.

## Référence visuelle P1-B1

Run cible canonique : `32456454178`
Artifact : `9420359227`
Références Listing :
- `listing-390x844.png` ;
- `listing-1280x900.png`.

La référence impose la hiérarchie, pas une copie pixel-perfect ni la suppression des modules premium existants.

## Implémentation certifiée

- nouveau résumé truth-safe `ListingExperienceSummary` ;
- trois cartes compactes : Confiance / Marché / Vie locale ;
- logique pure dédiée dans `lib/property-detail/listing-experience-summary.ts` ;
- Décision professionnelle remontée avant Intelligence sur mobile ;
- Source compacte juste après Décision ;
- rail desktop conservé avec Décision + Source ;
- personnalisation, Intelligence et dossier détaillé conservés ;
- aucun changement de données, ranking, source, DB ou navigation métier.

## Preuve finale

PR : `#837` — **MERGED**
Exact head certifié : `99d995d844dfc1d11c3a76f5f92ce78a23b1fd75`
Run dédié : `32477827862` — **SUCCESS**
Artifact AFTER : `9444998204`
Digest : `sha256:062cedbb8236c345f3627d24587e373b659dcb4e4d571ab81444c869d589279f`
Merge squash dans `main` : `7853237c2435ab6e003346cb7175b27618f5c9c9`

Gates verts :
- contrats P5 et vérité Listing ;
- régressions core / conversion / Mon Projet / décision mobile ;
- TypeScript ;
- build production ;
- Chromium ;
- audit responsive 390 / 430 / 768 / 1280 ;
- 4/4 captures AFTER ;
- 0 finding ;
- smoke UI/accessibilité additionnel : 12 routes × 4 viewports = 48 captures, 0 finding.

Inspection visuelle : **8,8/10**. La hiérarchie canonique est nettement plus lisible ; la densité mobile reste supérieure à la maquette P1-B1 car les fonctions de conversion certifiées sont volontairement conservées.

Human gate : **PASS** le 2026-08-21.

## Hors scope / backlog

Le concept d'interaction carte par villes/régions est **PARKED**. La PR `#835` a été fermée sans merge et aucun code de ce détour n'a atteint `main`.
