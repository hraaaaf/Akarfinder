# Mubawab Catalog Reconciliation — Lot 9

**Status: 🟡 ACTIVE — obligatoire avant fermeture Lot 9**

## Goal

Expliquer quantitativement l'écart entre le catalogue public Mubawab et les `source_id` uniques réellement découvrables par la pipeline AkarFinder dans le périmètre autorisé.

Ce document ne transforme jamais le compteur public Mubawab en vérité canonique. Il sert de baseline externe à réconcilier.

## Baseline publique — 2026-09-04

La home Mubawab Maroc affiche environ **102K biens immobiliers**.

Le dernier checkpoint AkarFinder obtenu après la première deep extinction contient :

- **26 117 `source_id` uniques** ;
- 30 057 refs découvertes ;
- 1004 / 1005 pages réussies ;
- 3 940 doublons de navigation ;
- 122 scopes terminaux ;
- 9 partitions pending ;
- 1 partition failed sur HTTP 502 transitoire (`Marrakech / terrains vente / page 28`).

Le ratio brut 26 117 / ~102K est seulement un indicateur de gap. Il ne doit pas être interprété comme un taux de couverture final tant que les métriques et surfaces ne sont pas alignées.

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

### Familles de routes

L'audit public confirme plusieurs familles distinctes :

- `st` : ville × catégorie ;
- `sc` : catégorie nationale ;
- `cc` : agrégats nationaux ;
- `pl` : immobilier neuf / projets.

La matrice Full Coverage historique ne couvre que `st`.

### Bureaux

Routes distinctes observées :

- `/fr/st/<ville>/bureaux-et-commerces-a-vendre`
- `/fr/st/<ville>/bureaux-et-commerces-a-louer`
- `/fr/sc/bureaux-et-commerces-a-vendre`
- `/fr/sc/bureaux-et-commerces-a-louer`

Exemples de compteurs observés :

- Casablanca bureaux vente : ~399 ;
- Maroc bureaux vente : ~713 ;
- Maroc bureaux location : ~2,9K.

Attention : ces routes peuvent recouvrir partiellement la famille `locaux`. Déduplication et overlap doivent être mesurés avant ajout au total.

### Location vacances

Routes observées :

- `/fr/st/<ville>/appartements-vacational`
- autres surfaces `vacational` nationales / par type à inventorier.

Exemples de compteurs observés :

- Casablanca appartements vacances : ~162 ;
- Rabat appartements vacances : ~54.

### Immobilier neuf / projets

Une surface dédiée `listing-promotion` existe et affiche environ **225 projets** lors de l'audit.

Les projets neufs apparaissent aussi au sein de listes classiques sous forme de blocs promotionnels, donc leur contribution au compteur global doit être mesurée sans double comptage.

### Agrégats `cc`

Les agrégats montrent un ordre de grandeur très supérieur à certaines catégories `sc` :

- `/fr/cc/immobilier-a-louer` : ~22,7K résultats ;
- `/fr/cc/bureaux-et-commerces-a-vendre` : ~34,5K résultats.

Ces surfaces ne doivent pas être additionnées aux catégories `sc`/`st`. Elles servent d'abord à détecter du stock ou des géographies absentes de la matrice actuelle.

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
- bureaux location : ~2,9K.

Ces compteurs **ne doivent pas être additionnés directement** : certaines familles se chevauchent et certains projets sont injectés dans plusieurs surfaces de navigation.

## Catalog Inventory V1

Implémentation :

- `data-ingestion/sources/mubawab/catalog-inventory.ts`
- `scripts/scrapers/__tests__/data-ingestion-lot9-catalog-inventory.test.ts`

Le modèle sépare explicitement :

- `national_category` ;
- `national_aggregate` ;
- `city_category` ;
- `vacational` ;
- `new_projects`.

Il enregistre le compteur visible, le titre sémantique et les groupes d'overlap. Le test interdit d'interpréter la somme naïve des compteurs comme un nombre de listings uniques.

## Retry transitoire de la matrice classique

Un HTTP 502 isolé sur Marrakech terrains vente page 28 a montré qu'un échec réseau/5xx ne doit pas devenir une extinction permanente.

Le Lot 9 distingue désormais :

- 403 / 429 / robots → stop sécurité, jamais requalifié ;
- 5xx / timeout / reset réseau → retry borné sur `--resume` ;
- historique d'erreurs conservé ;
- budget max : 3 tentatives par partition avant échec final documenté.

## Hypothèses à tester

1. **Coverage géographique** : le catalogue national contient une part importante hors des 12 villes actuelles.
2. **Bureaux** : route correcte absente du planner actuel.
3. **Vacational** : transaction absente du planner actuel.
4. **Neuf / projets** : unités de projets potentiellement comptées dans le total home, parfois déjà visibles dans les listes classiques.
5. **Route overlap** : `bureaux-et-commerces` et `locaux` peuvent partager des annonces.
6. **Metric mismatch** : le compteur home peut compter des biens / unités / promotions selon une métrique différente des URLs uniques de détail.
7. **Pagination / route aliases** : certaines annonces peuvent être absentes de nos partitions même si leur type / ville semble couvert.
8. **National aggregates** : `cc` peut exposer des listings appartenant à des villes ou catégories jamais ouvertes par notre matrice `st`.

## Plan de preuve

### Phase A — finir la matrice actuelle

- reprendre depuis le checkpoint 26 117 ;
- retenter uniquement les échecs transitoires dans le budget autorisé ;
- atteindre extinction ou stop documenté des dernières partitions `st` ;
- conserver ce stock comme baseline `classic-12-cities`.

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

### Phase E — overlap mesuré

Comparer les `source_id` vus via :

```text
classic st
vs
national sc
vs
aggregate cc
vs
vacational
vs
pl / projects
```

Le but est d'identifier les IDs réellement nouveaux, pas de gonfler artificiellement le stock en additionnant les routes.

### Phase F — réconciliation finale

Produire :

```text
home_catalog_count
vs
public_route_counts (avec overlap documenté)
vs
unique_discovery_ids
vs
canonical_valid_ids (Lot 10)
```

Le Lot 9 n'est CLOSED que lorsque le delta résiduel est soit faible, soit expliqué par une différence de métrique / overlap / périmètre documentée avec preuve.
