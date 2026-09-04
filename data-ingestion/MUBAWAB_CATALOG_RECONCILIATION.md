# Mubawab Catalog Reconciliation — Lot 9

**Status: 🟡 ACTIVE — obligatoire avant fermeture Lot 9**

## Goal

Expliquer quantitativement l'écart entre le catalogue public Mubawab et les `source_id` uniques réellement découvrables par la pipeline AkarFinder dans le périmètre autorisé.

Ce document ne transforme jamais le compteur public Mubawab en vérité canonique. Il sert de baseline externe à réconcilier.

## Baseline publique — 2026-09-04

La home Mubawab Maroc affiche environ **102K biens immobiliers**.

Le dernier checkpoint AkarFinder certifié avant la deep extinction contient :

- 18 294 `source_id` uniques ;
- 21 352 refs découvertes ;
- 730 / 730 pages réussies ;
- 3 058 doublons de navigation ;
- 107 scopes terminaux ;
- 25 partitions profondes encore pending.

Le ratio brut 18 294 / ~102K est seulement un indicateur de gap. Il ne doit pas être interprété comme un taux de couverture final tant que les métriques ne sont pas alignées.

## Périmètre actuel AkarFinder

### Villes configurées

Casablanca, Rabat, Marrakech, Tanger, Agadir, Fès, Kénitra, Mohammedia, Témara, Dar Bouazza, Bouskoura, Salé.

### Catégories activées

- appartements vente / location ;
- terrains vente ;
- villas vente / location ;
- maisons vente / location ;
- locaux commerciaux vente / location ;
- riads vente / location.

### Catégories non couvertes ou non certifiées

- bureaux vente / location ;
- location vacances ;
- immobilier neuf / projets comme surface de discovery propre ;
- villes / zones hors des 12 configurées ;
- autres familles / routes encore inconnues.

## Routes publiques déjà vérifiées

### Bureaux

Routes distinctes observées :

- `/fr/st/<ville>/bureaux-et-commerces-a-vendre`
- `/fr/st/<ville>/bureaux-et-commerces-a-louer`
- `/fr/sc/bureaux-et-commerces-a-vendre`
- `/fr/sc/bureaux-et-commerces-a-louer`

Exemples de compteurs observés :

- Casablanca bureaux location : ~1 901 ;
- Rabat bureaux location : ~184 ;
- Maroc bureaux vente : ~713 ;
- Maroc bureaux location : ~2 840.

Attention : ces routes peuvent recouvrir partiellement la famille `locaux`. Déduplication et overlap doivent être mesurés avant ajout au total.

### Location vacances

Routes observées :

- `/fr/ct/<ville>/immobilier-vacational`
- `/fr/sc/appartements-vacational`
- `/fr/sc/villas-et-maisons-de-luxe-vacational`

Exemples de compteurs :

- appartements vacances Maroc : ~1 050 ;
- villas / maisons luxe vacances Maroc : ~156 ;
- Rabat vacances toutes familles : ~62.

### Immobilier neuf / projets

Une surface dédiée `listing-promotion` existe et affiche environ **225 projets** lors de l'audit.

Les projets neufs apparaissent aussi au sein de listes classiques sous forme de blocs `Projet · N biens immobiliers`, donc leur contribution au compteur global doit être mesurée sans double comptage.

## Compteurs nationaux visibles — échantillon

Ordres de grandeur observés le 2026-09-04 :

- appartements vente : ~14,7K ;
- appartements location : ~14,4K ;
- terrains vente : ~6,9K ;
- villas vente : ~6,1K ;
- villas location : ~2,9K ;
- maisons vente : ~2,0K ;
- maisons location : ~0,2K ;
- locaux vente : ~2,3K ;
- locaux location : ~2,1K ;
- riads vente : ~1,1K ;
- riads location : ~0,03K ;
- bureaux vente : ~0,7K ;
- bureaux location : ~2,8K ;
- appartements vacances : ~1,05K ;
- villas vacances : ~0,16K.

Ces compteurs **ne doivent pas être additionnés directement** : certaines familles se chevauchent et certains projets sont injectés dans plusieurs surfaces de navigation.

## Hypothèses à tester

1. **Coverage géographique** : le catalogue national contient une part importante hors des 12 villes actuelles.
2. **Bureaux** : route correcte absente du planner actuel.
3. **Vacational** : transaction absente du planner actuel.
4. **Neuf / projets** : unités de projets potentiellement comptées dans le total home, parfois déjà visibles dans les listes classiques.
5. **Route overlap** : `bureaux-et-commerces` et `locaux` peuvent partager des annonces.
6. **Metric mismatch** : le compteur home peut compter des biens / unités / promotions selon une métrique différente des URLs uniques de détail.
7. **Pagination / route aliases** : certaines annonces peuvent être absentes de nos partitions même si leur type / ville semble couvert.

## Plan de preuve

### Phase A — finir la matrice actuelle

- laisser la deep extinction atteindre son checkpoint final ;
- conserver le stock unique et le manifest comme baseline `classic-12-cities`.

### Phase B — inventory national sans crawl massif

Pour chaque grande famille nationale publique :

- capturer route canonique ;
- compteur affiché ;
- sémantique de transaction ;
- overlap probable ;
- présence de projets ;
- pagination observable.

### Phase C — couverture géographique

- inventorier toutes les villes / zones publiquement proposées ;
- comparer avec les 12 villes configurées ;
- chiffrer le delta de catalogue par géographie avant crawl.

### Phase D — nouvelles routes

Ajouter au planner uniquement après vérification :

- bureaux ;
- location vacances si retenue dans le Goal produit ;
- surface neuf / projets si elle produit des unités distinctes et exploitables ;
- villes / zones manquantes.

Chaque ajout garde les mêmes garanties : robots, délai, checkpoint, kill-switch, aucune page détail pendant discovery, aucun DB/prod.

### Phase E — réconciliation finale

Produire :

```text
home_catalog_count
vs
sum_of_public_route_counts (avec overlap documenté)
vs
unique_discovery_ids
vs
canonical_valid_ids (Lot 10)
```

Le Lot 9 n'est CLOSED que lorsque le delta résiduel est soit faible, soit expliqué par une différence de métrique / overlap / périmètre documentée avec preuve.
