# AkarFinder Experience — P1 Closeout

Date : 2026-08-20
Statut : **FERMÉ — VALIDÉ, CERTIFIÉ ET MERGÉ**

## Goal P1

**Architecture produit + mockups canoniques** : disposer d'un langage UI cohérent, de cibles haute fidélité approuvées et d'une réconciliation Home/Vendre suffisante pour servir de contrat aux lots page-level suivants.

## Sous-lots fermés

### P1-A1 — Home + Vendre reconciliation

- PR `#828` ;
- final HEAD `0b9c28f28e6e1d5edb0d7d46bd1ff0edd91d2d95` ;
- run final `32411535248` — SUCCESS ;
- artifact `9422367028` ;
- 16/16, 0 finding ;
- score 9,0/10 ;
- merge `950afda458c3170ac031e4cdf527a4a5e77caea6`.

### P1-A2 — Shared Components

- PR `#829` ;
- run final `32393990605` — SUCCESS ;
- artifact `9415995389` ;
- 24/24, 0 finding ;
- score 8,5/10 ;
- merge `48893d882580d0524ef032b1976d8896255eb468`.

### P1-B1 — Canonical Page Targets

- PR `#830` ;
- final HEAD `5f94a477bfca401eab4c250750bfdfd3a9355ef6` ;
- run final `32406060774` — SUCCESS ;
- artifact `9420359227` ;
- 16/16, 0 finding ;
- score 8,8/10 ;
- merge `260922d2e051b67b8bdd80be519b111fbbc64d3f`.

## Contrats désormais verrouillés

- huit cibles canoniques : Accueil, Search, Carte, Quartier, Listing, Mon Projet, Publier, Professionnels ;
- primitives partagées AkarFinder ;
- Home hero non full-screen, avec valeur produit visible rapidement ;
- Vendre type-first ;
- Search/Carte `exact-white` et logique map/list conservées ;
- logo production exact ; branding hors scope sans autorisation ;
- aucun Vercel sans autorisation explicite.

## Validation externe — règle à partir du closeout P1

Toute étape UX/UI significative est précédée d'un croisement 2–3 références externes sérieuses. Le résultat est écrit comme : **source → constat → implication AkarFinder**.

Références ayant confirmé la décision finale Home :

- Nielsen Norman Group : https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
- Zillow, Summer Launch 2026 : https://www.zillow.com/news/zillow-launches-a-personalized-hub-that-guides-home-buyers-from-first-search-to-closing/
- Rightmove Search : https://www.rightmove.co.uk/news/new-look-for-rightmove-search/

## Preuve de fermeture P1

A1, A2 et B1 sont tous fermés avec CI dédiée, artifacts, inspection visuelle et human gate. Aucune objection P1 ne reste ouverte.

Le programme global P0–P11 compte désormais **2 lots majeurs fermés sur 12 : P0 + P1 = 16,7 %**.
