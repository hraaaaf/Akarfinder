# C8C — Certification géométrique Rabat

## Mission

C8C rattache uniquement des géométries déjà défendables aux localités produit C8B. Il ne fabrique aucune limite et n'active aucune nouvelle zone publique.

## Source géométrique réutilisée

Le pilote C0–C7 possède déjà quatre `market_zone` Rabat revues et certifiées en Canary :

- `market_zone_rabat_agdal` → `district_rabat_agdal` ;
- `market_zone_rabat_hay_riad` → `district_rabat_hay_riad` ;
- `market_zone_rabat_souissi` → `district_rabat_souissi` ;
- `market_zone_rabat_centre` → `district_rabat_hassan`.

Ces géométries sont des **zones analytiques immobilières AkarFinder**, dérivées de données OSM avec méthode et provenance conservées. Elles portent explicitement `officialBoundary: false`. Elles ne sont donc jamais présentées comme des frontières administratives ou officielles de quartier.

## Certification C8C

`lib/geo/rabat-locality-geometry-registry.ts` accepte un binding uniquement si :

1. la market zone est `reviewed: true` ;
2. son statut est `canary` ou `published` ;
3. `officialBoundary === false` ;
4. `validateMarketZoneRecord()` ne retourne aucune anomalie ;
5. la localité cible existe dans C8B et sa taxonomie est `certified`.

Le résultat est étiqueté :

- `semanticType: analytical_market_zone` ;
- `geometryStatus: certified_polygon` ;
- `certificationStatus: certified_for_market_analytics` ;
- `c8PublicActivation: false`.

## État exact

Sur le registre C8B actuel de **23 entrées** :

- **4/23** disposent d'une géométrie C8C certifiée pour analyse marché : Agdal, Hay Riad, Hassan, Souissi ;
- **19/23** restent `unresolved` dans C8C, notamment Océan et tous les candidats taxonomiques.

L'absence de géométrie reste un état valide et fail-closed. Aucun centroïde, Voronoï additionnel ou contour déduit d'un nom n'est créé pour augmenter artificiellement la couverture.

## Sources first-party et limite de C8C

Le Géoportail AURS met à disposition les plans d'aménagement homologués des grands arrondissements/secteurs de Rabat, mais ces documents ne constituent pas automatiquement des limites officielles de chaque `product_locality`. C8C refuse donc de convertir un plan d'arrondissement ou une simple occurrence de nom en polygone de quartier.

## Non-activation

C8C n'est importé ni par `lib/geo/resolve-listing-geo.ts`, ni par `/api/geo/rabat-market-intelligence`. Le pilote public C0–C7 reste inchangé. L'extension publique des nouvelles localités appartient à C8D seulement après vérification de la taxonomie, de la géométrie, des données marché, du contexte et des règles de publication.
