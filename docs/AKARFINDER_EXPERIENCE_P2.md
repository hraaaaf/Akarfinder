# AkarFinder Experience — P2 Navigation globale

Date : 2026-08-20
Base : `main@37a7bfef1ba4124b1a785909a4f0813f32b7112f`
Statut : **PREPARED — CI / AFTER / HUMAN GATE À CERTIFIER**

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

1. Baymard Institute — `4 Design Patterns That Violate “Back” Button UX Expectations` et `Macy's Filtering Experience` : un changement de filtre ou de tri est perçu comme une nouvelle vue et doit donc être traversable avec Back.
2. MDN — `History.pushState()` / `popstate` : `pushState()` crée une entrée de session ; `popstate` est le mécanisme de restauration lors de Back / Forward.
3. Zillow, Summer Launch 2026 / AI-native housing platform : la recherche immobilière est conçue comme un parcours connecté allant de la découverte à la décision.

Implication AkarFinder : hydratation/canonicalisation = remplacement discret ; changement utilisateur = entrée d'historique coalescée ; Back / Forward = restauration de l'état sans création d'une entrée parasite.

## BEFORE

`UI All Pages Baseline` :

- run `32411535507` — SUCCESS ;
- artifact `9422493689` ;
- digest `sha256:bea0f02794be36bf849877124fac214120fde6f336652e98c9b7b7ed854b8e82` ;
- runtime équivalent au main P1 fermé ;
- Search / Carte disponibles en 390, 430, 768 et 1280.

## Cible visuelle

Aucun redesign. Les cibles P1-B1/P1 restent le contrat visuel. P2 doit être visuellement neutre sur Search, Carte et Listing.

## Défaut confirmé

`useCanonicalSearchSession` écrivait les changements Search via `history.replaceState()`. Plusieurs états utilisateur successifs écrasaient donc la même entrée d'historique et empêchaient Back / Forward de parcourir les changements de tri / filtres.

## Implémentation préparée

- décision explicite `none / replace / push` dans `lib/ux/search-history.ts` ;
- hydratation / restauration silencieuse ;
- changements utilisateur coalescés à 280 ms puis ajoutés via `pushState()` ;
- `popstate` restaure les contrôles existants sans pousser une nouvelle entrée ;
- le bridge Search → Carte / Listing reste synchronisé via l'événement canonique existant.

## Succès

1. deux changements de tri successifs créent deux entrées distinctes ;
2. Back restaure le premier tri et Forward le second ;
3. Search → Carte transporte le contexte courant ;
4. Search → Listing contient un `return_to` exact ;
5. aucune régression du header exact-white, du logo ou de l'overflow ;
6. 12/12 captures AFTER : Search / Carte / Listing représentatif × 4 viewports ;
7. 0 finding ;
8. aucune mutation DB ;
9. aucun Vercel.

## Preuve requise

Workflow `Experience P2 Navigation Global` : unité ciblée + TypeScript + build production + Playwright comportemental + 12 captures. Puis comparaison BEFORE / AFTER, score UX/UI et validation humaine explicite avant merge.
