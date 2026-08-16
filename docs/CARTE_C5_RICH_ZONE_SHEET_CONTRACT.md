# Carte intelligence marché — C5 fiche zone riche

Date : 2026-08-16
Statut : PREPARED, non fermé
Dépendance : C4 heat map interactive

## Objectif

Enrichir la fiche ouverte après sélection d'une AkarFinder `market_zone` sans changer la vérité statistique définie par C2/C3 et sans présenter la zone analytique comme une frontière administrative officielle.

## Sources autorisées

### Métriques live

Les valeurs `Prix`, `Densité` et `Annonces` affichées dans la fiche proviennent exclusivement du payload C3 `/api/geo/rabat-market-intelligence` pour le mode et la transaction actifs.

Interdictions :
- ne pas utiliser `MARKET_DATA` ou le benchmark statique 2024-2025 comme valeur live de la fiche ;
- ne pas calculer de moyenne locale alternative ;
- ne pas interpoler une valeur absente ;
- ne pas transformer `NULL` / `insufficient` en zéro.

### Contexte quartier

Le contexte non statistique peut être enrichi à partir du référentiel canonique existant `lib/map/canonical-neighborhood-data.ts` :
- `proximityHighlights` / `highlights` ;
- `lifestyleTags` ;
- lien vers la page quartier canonique lorsqu'elle existe.

Ce contexte reste séparé visuellement et sémantiquement de la métrique C3.

## Bindings pilote Rabat

- `market_zone_rabat_agdal` → district canonique `agdal` → contexte Agdal autorisé ;
- `market_zone_rabat_hay_riad` → `hay-riad` → contexte Hay Riad autorisé ;
- `market_zone_rabat_centre` → `hassan` → contexte Hassan autorisé ;
- `market_zone_rabat_souissi` → `souissi` → aucun contexte de proximité n'est inventé si `getNeighborhoodBySlug("rabat", "souissi")` ne retourne pas de fiche canonique.

L'absence de contexte quartier ne bloque jamais l'affichage de la métrique C3 de la zone.

## Hiérarchie UI

La fiche reste compacte et compatible mobile :
1. type `Market zone AkarFinder · Rabat` + nom de zone ;
2. métrique active C3 + sample count + surface + fiabilité si pertinente ;
3. contexte quartier disponible sous forme de tags/repères courts ;
4. CTA primaire `Rechercher dans cette zone` conservant ville, district et transaction ;
5. lien secondaire vers la fiche quartier canonique uniquement si le binding existe ;
6. disclaimer permanent : zone analytique AkarFinder, non frontière administrative officielle, valeurs observées et non interpolées.

La fiche ne doit pas masquer la navigation mobile ni rendre la carte inutilisable.

## Fail-closed

- API C3 indisponible : aucun chiffre de remplacement ;
- métrique `insufficient` : état explicite `Données insuffisantes` ;
- contexte canonique absent : section contexte omise, aucun placeholder pseudo-factuel ;
- lien quartier absent : lien omis ;
- aucune nouvelle écriture DB, mutation Search/ranking ou activation publique implicite.

## Critères de fermeture C5

C5 peut être déclaré CLOSED uniquement après preuve que :
- les quatre zones Rabat ouvrent une fiche ;
- les métriques affichées restent celles de C3 ;
- Agdal / Hay Riad / Centre utilisent seulement leur contexte canonique disponible ;
- Souissi reste sans contexte inventé si le référentiel ne le fournit pas ;
- Search CTA est filtré correctement ;
- mobile 390/430 et desktop 1280 sont sans collision/overflow ;
- TypeScript, build et smoke navigateur ciblé sont verts ;
- le closeout canonique est mis à jour après merge.
