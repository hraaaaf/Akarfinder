# AkarFinder Experience — C1 Session / navigation unifiée

Date : 2026-08-20
Base initiale : `main@ec0a23e3d07d2815175ac7e14c1032e3a0d718d9`
Statut : **CLOSED — CI SUCCESS + PR MERGÉE + MAIN VÉRIFIÉ**

## Goal

Préserver le contexte utilisateur entre Search, la vue carte de Search et une fiche Listing, sans changement visuel intentionnel.

## Succès

1. le canonicaliseur Search ne supprime plus `mre=true` ;
2. le canonicaliseur Search ne supprime plus `project_id` ;
3. back/forward restaure correctement l'état MRE ;
4. tout lien interne `/listings/*` produit depuis Search transporte un `return_to` vers la session Search courante ;
5. `return_to` est strictement limité à `/search` et `/map` afin d'éviter un open redirect ;
6. le lien « Retour aux résultats » d'une fiche Listing revient vers la session validée ;
7. l'ancien comportement `/search` reste le fallback lorsqu'aucun retour valide n'existe ;
8. aucune mutation DB/source et aucun déploiement Vercel.

## Implémentation

- `lib/ux/navigation-continuity.ts` : contrat pur de retour Search/Map ↔ Listing ;
- `lib/ux/search-history.ts` : conservation `mre` / `project_id` et restauration MRE ;
- `components/search/useCanonicalSearchSession.ts` : canonicalisation enrichie sans perte de contexte ;
- `components/search/SearchMapNavigationBridge.tsx` : synchronisation des liens Map et Listing avec l'URL canonique courante ;
- `app/listings/[id]/page.tsx` : validation serveur de `return_to` ;
- `components/listings/ListingReturnNavigationBridge.tsx` : restauration du lien retour existant, sans modifier son rendu ;
- `components/listings/AnnouncementPageShell.tsx` : orchestration du retour.

## Sécurité

`return_to` n'accepte que des chemins locaux commençant exactement par `/search` ou `/map`.

Sont rejetés notamment :

- URL absolue externe ;
- URL protocol-relative `//...` ;
- toute autre route interne.

## Visuel

Aucun changement visuel intentionnel dans C1. Aucun human gate AFTER n'était requis pour ce lot non visuel.

## Preuve de fermeture

- commit de travail : `96b3d0d2090c9bdeac822c3b01030b2e5a01a84b` ;
- PR : `#826` ;
- workflow `Experience C1 Navigation Session` : run `32352573743` ;
- test C1 : SUCCESS ;
- TypeScript : SUCCESS ;
- production build : SUCCESS ;
- merge : `ee0b028106fa000d14d83a612c50e0537ca970fc` ;
- `main` post-merge vérifié exactement sur `ee0b028106fa000d14d83a612c50e0537ca970fc` avant ce closeout documentaire ;
- mutation DB/source : 0 ;
- Vercel : 0.
