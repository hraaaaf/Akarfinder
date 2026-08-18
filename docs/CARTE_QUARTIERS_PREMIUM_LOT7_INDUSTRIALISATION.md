# Carte des quartiers premium — Lot 7 Industrialisation multi-villes

## Goal
Extraire uniquement les contrats réellement communs prouvés par Rabat, afin que Casablanca, Marrakech, Tanger, Agadir et Fès puissent adopter la même expérience premium sans dupliquer les contrats Map, Search, Geo ou les règles fail-closed.

## Succès
- le routage `/map` reste canonique et compatible `city + district` ;
- un contrat unique décrit les villes premium supportées et leur niveau de capacité ;
- aucune ville ne peut être activée en intelligence polygonale sans provider géométrique et métriques admissibles ;
- Rabat conserve exactement son comportement certifié Lot 6 ;
- aucune duplication du Search handoff, de `map-navigation-state`, du Geo Registry ou de MapLibre lifecycle ;
- tests ciblés + build + gates existantes verts.

## Preuve
- diff limité aux abstractions communes réellement utilisées ;
- tests de contrat multi-villes ;
- exact-head CI ;
- comparaison Rabat avant/après sans régression fonctionnelle ou visuelle.

## Audit de l’existant après Lot 6

### Commun déjà prouvé
1. Navigation structurée : `MapNavigationState`, `buildMapHref`, `buildMapSearchHref`, `withMapLocation`.
2. Résolution géographique : Geo Entity Registry.
3. Shell `/map` et routage client : `MapNeighborhoodClient`.
4. MapLibre + thème clair/sombre.
5. Villes phares produit : Casablanca, Rabat, Marrakech, Tanger, Agadir, Fès.
6. Modes intelligence : prix, densité, annonces.
7. Transactions : vente, location.
8. États : loading, erreur, fail-closed, sélection, Search handoff.
9. Règle géométrique : ne jamais fabriquer une limite ou une métrique.

### Spécifique Rabat à ne pas généraliser aveuglément
1. endpoint `/api/geo/rabat-market-intelligence` ;
2. IDs `market_zone_rabat_*` ;
3. mapping zone -> district ;
4. géométries `market_zone` Rabat ;
5. métriques et preuves issues du pipeline Rabat ;
6. contenu contextuel de `RabatMarketZoneSheet`.

## Architecture minimale retenue

### A. Registre de capacités premium par ville
Un registre commun doit exposer au minimum :
- slug canonique ;
- nom affiché ;
- ordre produit ;
- capacité `explore` ;
- capacité `market_intelligence` ;
- statut fail-closed si la ville ne dispose pas encore de provider admissible.

Le registre ne doit contenir aucune géométrie, aucun prix et aucun fallback inventé.

### B. Expérience intelligence
La généralisation doit séparer :
- shell visuel et interactions communes ;
- adapter/provider propre à chaque ville ;
- mapping zone -> district propre à chaque ville ;
- contenu contextuel propre à la ville lorsque nécessaire.

Une ville sans adapter complet reste sur l’expérience canonique existante. Elle ne doit jamais être routée vers un faux clone de Rabat.

### C. Contrat provider
Un provider ville doit être capable de fournir :
- GeoJSON admissible ;
- provenance et fraîcheur ;
- métrique par mode/transaction ;
- mapping vers `district` Search ;
- état explicite lorsque la donnée est insuffisante.

## Interdictions
- copier-coller `RabatMarketIntelligenceExperience` cinq fois ;
- renommer des IDs Rabat pour simuler une autre ville ;
- utiliser un centroïde comme polygone ;
- extrapoler un prix ville en prix quartier ;
- contourner Geo Registry ou Search contract ;
- activer visuellement une ville avant preuve provider.

## Ordre d’exécution Lot 7
1. introduire le registre commun des six villes et capacités ;
2. remplacer les listes de villes dupliquées par ce registre ;
3. extraire le contrat d’adapter intelligence sans modifier le provider Rabat ;
4. brancher Rabat sur l’abstraction ;
5. certifier byte-for-behavior Rabat via les gates existantes ;
6. documenter le contrat d’entrée pour Lot 8.

## Gate de fermeture
Lot 7 est fermé seulement si l’abstraction est réellement utilisée par Rabat, que Rabat reste certifié, et qu’aucune des cinq autres villes n’est présentée comme data-rich sans provider prouvé.

Aucun déploiement Vercel sans autorisation explicite.
