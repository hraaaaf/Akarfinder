# AkarFinder Experience — P2 Navigation globale

Date : 2026-08-20
Base : `main@37a7bfef1ba4124b1a785909a4f0813f32b7112f`
Statut : **FERMÉ — VALIDÉ, CERTIFIÉ ET MERGÉ**

## Goal

Rendre Search ↔ Carte ↔ Listing réellement continu : les filtres, le tri, la vue, la zone et le contexte utilisateur restent navigables et restaurables avec Back / Forward sans reset silencieux.

## Ce que P2 touche

- historique URL de `/search` ;
- continuité Search ↔ Carte ↔ Listing ;
- retour Listing → résultats ;
- tests de navigation, captures et documentation P2.

## Ce que P2 ne touche pas

- logo / branding ;
- Home / Vendre validés en P1 ;
- ranking, données, scrapers, DB ou API métier ;
- design interne des pages Search, Carte ou Listing ;
- déploiement Vercel.

## Références externes croisées avant implémentation

1. Baymard Institute — filtres / tris perçus comme de nouvelles vues doivent respecter les attentes Back / Forward.
2. MDN — `History.pushState()` crée une entrée de session ; `popstate` permet sa restauration.
3. Zillow 2026 — la recherche immobilière est pensée comme un parcours continu de la découverte à la décision.

Implication AkarFinder : hydratation/canonicalisation = remplacement discret ; changement utilisateur = entrée d'historique coalescée ; Back / Forward = restauration sans entrée parasite.

## BEFORE

`UI All Pages Baseline` :

- run `32411535507` — SUCCESS ;
- artifact `9422493689` ;
- digest `sha256:bea0f02794be36bf849877124fac214120fde6f336652e98c9b7b7ed854b8e82` ;
- runtime équivalent au main P1 fermé.

## Implémentation validée

- décision explicite `none / replace / push` dans `lib/ux/search-history.ts` ;
- hydratation / restauration silencieuse ;
- changements utilisateur coalescés à 280 ms puis ajoutés via `pushState()` ;
- `popstate` restaure les contrôles existants sans pousser une nouvelle entrée ;
- continuité Search → Carte / Listing resynchronisée via l'événement canonique existant ;
- garde-fous C1 (`return_to`, MRE, `project_id`, open redirect) préservés.

## Preuve finale

- PR : `#831` ;
- HEAD certifié : `c579f68d3b716ab69a76bfc0835bf3e7f66cb5e9` ;
- workflow P2 : run `32417603234` — SUCCESS ;
- régression C1 : run `32417603240` — SUCCESS ;
- artifact AFTER : `9424543505` ;
- digest : `sha256:a30ebd76763d9a21952794c9f26a4838548a6e6025152b9d40a77b9fff48debc` ;
- captures AFTER : `12/12` ;
- findings : `0` ;
- historique : `2 → 4` après deux changements utilisateur ;
- Back : `price-asc` restauré ;
- Forward : `price-desc` restauré ;
- Search → Carte : ville + tri conservés ;
- Listing → Search : `return_to` exact ;
- score UX/UI : `9,5/10` ;
- human gate : validé par l'utilisateur le 2026-08-20 ;
- merge squash : `a1ba3ad002d94a9d9cbf1b71d9dddf1be16b8374` ;
- mutation DB/source : `0` ;
- déploiement Vercel : `0`.

## Fermeture

P2 est fermé. La navigation Search ↔ Carte ↔ Listing est certifiée fonctionnellement, la non-régression visuelle est validée et le lot est mergé sur `main`.