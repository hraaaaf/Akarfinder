# C8B — Registre canonique des localités Rabat

## Portée

C8B matérialise le contrat C8A sans étendre le runtime public. Le registre est un inventaire de travail canonique et fail-closed : présence dans le registre ne signifie jamais activation carte.

Chaque entrée porte désormais : identifiant, slug, nom canonique, aliases, parent administratif quand prouvé, statut taxonomique, statut géométrique, disponibilité métriques, disponibilité contexte first-party et raison explicite de blocage.

## Autorités séparées

- `product_locality` : sémantique produit AkarFinder ;
- `admin_parent` : unité HCP distincte ;
- `geometry` : preuve indépendante ;
- `postal_names` : réservés à une ingestion dédiée, jamais inférés.

Les parents HCP enregistrés sont : Agdal Riyad, Hassan, Souissi, Yacoub El Mansour, Youssoufia et Touarga. Un parent ne crée pas automatiquement une localité produit.

## Baseline C0–C7 préservée

Les cinq entités historiques restent présentes sans renommage ni changement d'identité : Agdal, Hay Riad, Hassan, Souissi et Océan.

Agdal, Hay Riad et Hassan conservent leurs `point_proxy` historiques et leur activation legacy. Souissi et Océan restent bloqués côté registre C8B tant que la géométrie produit n'est pas certifiée dans C8C. Ce blocage n'annule pas les market zones analytiques C0–C7 déjà certifiées séparément.

## Couverture du dictionnaire interne Rabat

C8B exige désormais que **100 % des noms du dictionnaire `MOROCCO_DISTRICTS.Rabat` soient représentés** dans le registre produit, comme entité certifiée ou candidate :

- Agdal ;
- Hay Riad ;
- Souissi ;
- Hassan ;
- Océan ;
- Les Orangers ;
- Aviation ;
- Akkari ;
- Yacoub El Mansour ;
- Medina.

Aucun de ces noms ne peut disparaître silencieusement lors des lots suivants.

## Extension first-party AURS

Des noms explicitement utilisés par l'Agence Urbaine de Rabat-Salé sont conservés comme candidats sans fusion automatique : Mabella, Takaddoum, Kbibat, Douar Doum, El Kora, El Garaa et Al Boustane. Akkari/Océan sont également documentés par l'AURS ; la Médina dispose d'un document d'urbanisme dédié.

Ces candidats restent :

- `taxonomy_status: candidate` ;
- `market_map_eligible: false` ;
- `geometry_status: unresolved` ;
- `activation_status: blocked` ;
- `fail_closed_reason: taxonomy_candidate`.

## Disponibilité vérité

- Les métriques C3 historiques sont seulement signalées `legacy_c3_available` pour les entités déjà couvertes par le pilote C0–C7 ; C8B ne les recalcule pas.
- Un contexte `first_party_available` signifie uniquement qu'une source first-party existe ; son contenu public n'est pas encore projeté automatiquement.
- `not_assessed` reste fail-closed et ne doit jamais être transformé en contenu de substitution.

## Limite importante

Le registre compte actuellement **19 localités produit/candidates** et couvre **10/10 du dictionnaire Rabat interne**. Cela constitue un plancher vérifié, **pas encore une revendication exhaustive de tous les quartiers de la commune de Rabat**. L'exhaustivité finale nécessite un recensement source-backed supplémentaire et reste ouverte dans C8.

## Non-activation runtime

C8B n'est importé ni par `lib/geo/resolve-listing-geo.ts`, ni par `/api/geo/rabat-market-intelligence`. Il ne modifie donc ni Search ranking, ni métriques C3, ni resolver runtime, ni surface publique de la heat map.

C8C peut maintenant certifier les géométries défendables une par une, sans fabriquer de limites pour les entrées restantes.
