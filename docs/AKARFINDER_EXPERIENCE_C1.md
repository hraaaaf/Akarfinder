# AkarFinder Experience — C1 Session / navigation unifiée

Date : 2026-08-20
Base : `main@ec0a23e3d07d2815175ac7e14c1032e3a0d718d9`
Statut : **IMPLEMENTED — PR/CI À CERTIFIER**

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

Aucun changement visuel intentionnel dans C1. La cible visuelle Search + Carte a été validée en P0-5B ; elle sera implémentée seulement dans le lot visuel dédié suivant, avec BEFORE/AFTER et gate humain.

## Preuve attendue pour fermer C1

- tests `experience-c1-navigation-session.test.ts` SUCCESS ;
- TypeScript SUCCESS ;
- production build SUCCESS ;
- PR mergée ;
- `main` post-merge vérifié.
