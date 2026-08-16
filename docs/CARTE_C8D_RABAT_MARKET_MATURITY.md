# C8D — Rabat market maturity

## Goal

Mesurer, en lecture seule, si les 18 localités candidates C8 disposent déjà d'une matière économique suffisante pour supporter une projection marché future.

## Résultat

Le shadow resolver fournit **68 matchs candidats uniques** sur le corpus Rabat borné. Ils se répartissent sur 11 localités ayant au moins une annonce ; 7 localités disposent d'au moins 2 sources.

Mais la profondeur économique reste insuffisante :

- le nombre maximal d'échantillons `normalized_price_m2` vente pour une candidate est **2** ;
- plusieurs candidates à bon volume n'ont **aucun** échantillon prix/m² ;
- toute médiane observée ici repose sur 1 ou 2 valeurs seulement et reste strictement diagnostique ;
- **0 candidate** n'est déclarée prête pour une métrique prix/m² publique.

## Cohortes prioritaires observées

- Diour Jamaa : 16 annonces, 3 sources, 0 prix/m² vente ;
- Kbibat : 9 annonces, 1 source, 1 prix/m² vente ;
- Hay Nahda : 8 annonces, 2 sources, 0 prix/m² vente ;
- Yacoub El Mansour : 7 annonces, 3 sources, 1 prix/m² vente ;
- Aviation : 6 annonces, 2 sources, 1 prix/m² vente ;
- Les Orangers : 6 annonces, 1 source, 2 prix/m² vente ;
- Médina : 6 annonces, 2 sources, 1 prix/m² vente.

Les autres candidates ont 4 annonces ou moins, ou aucune annonce shadow unique dans le snapshot.

## Diagnostic structured fields

Un second audit read-only compare champs bruts et normalisés sur les candidates non vides :

- **0 cas** où `price_mad` existe mais `normalized_price_mad` disparaît ;
- **0 cas** où `surface_m2` existe mais `normalized_surface_m2` disparaît.

Le normalizer ne perd donc pas les champs bruts observés. La dette principale est en amont : **disponibilité/extraction/récupération structurée insuffisante des prix et surfaces dans le corpus source**. Certaines valeurs normalisées sont déjà récupérées même lorsque le champ brut est absent, mais la couverture reste trop faible pour construire des statistiques robustes.

## Garde-fous

- aucun seuil de publication statistique nouveau n'est inventé ici ;
- aucune médiane sparse n'est exposée publiquement ;
- aucun `geo_entity`, `geo_alias`, `geo_resolution_event`, `property_listing` ou indicateur public n'est modifié ;
- géométrie, contexte et autorité restent des gates séparés.

## Conclusion

Le prochain levier C8D n'est pas l'UI ni une réécriture du normalizer. Il faut augmenter la récupération structurée `price/surface` à la source et la profondeur multi-source sur les candidates les plus prometteuses, tout en poursuivant la géométrie défendable. Publier maintenant donnerait surtout une carte plus grande avec des statistiques plus fragiles, exploit assez peu enviable.
