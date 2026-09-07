# Mubawab Discovery — Lot 2

**Status:** 🟡 EN COURS

## Goal

Cartographier de manière déterministe les routes de découverte Mubawab actuellement actives afin de produire un inventaire stable des annonces avant toute extraction détaillée ou ingestion AkarFinder.

## Constats vérifiés — 2026-09-03

### 1. Page racine

`https://www.mubawab.ma/fr`

La page expose les grandes intentions :

- Vente
- Location
- Immobilier neuf
- Location vacances

Et les familles visibles :

- Appartements
- Terrains
- Villas
- Locaux commerciaux
- Maisons
- Riads
- Bureaux

### 2. Routes nationales

Patterns confirmés :

```text
/fr/sc/appartements-a-vendre
/fr/sc/appartements-a-louer
```

`sc` représente une recherche/catégorie nationale.

### 3. Routes ville + catégorie

Patterns confirmés :

```text
/fr/st/{citySlug}/{categorySlug}
```

Exemples réellement accessibles au 2026-09-03 :

```text
/fr/st/casablanca/appartements-a-vendre
/fr/st/rabat/villas-et-maisons-de-luxe-a-louer
/fr/st/rabat/maisons-a-louer
```

`st` est donc une route ville + type/catégorie et doit être considérée comme une porte d'entrée valide du discovery actuel.

### 4. Routes quartier

Pattern confirmé :

```text
/fr/sd/{citySlug}/{districtSlug}/{categorySlug}
```

Exemple :

```text
/fr/sd/rabat/quartier-des-ambassades/villas-et-maisons-de-luxe-a-louer
```

Ces routes sont utiles pour comprendre la taxonomie des quartiers mais ne doivent pas être utilisées comme source principale de crawl tant que leur redondance avec `st` n'est pas mesurée.

### 5. Routes SEO / intent

Pattern observé :

```text
/fr/is/{querySlug}
```

Exemples :

```text
/fr/is/villa-location_rabat_meublée
/fr/is/villa-location_rabat_particulier
```

Ces pages sont des routes SEO/intent et peuvent dupliquer les annonces des catégories principales. Elles ne doivent pas être incluses dans le crawl primaire tant qu'un audit de recouvrement n'est pas terminé.

### 6. Pagination

Pattern confirmé sur les pages catégorie :

```text
{base}:p:{n}
```

Exemple :

```text
/fr/st/casablanca/appartements-a-vendre:p:2
```

Le parseur discovery devra :

1. traiter la page 1 sans suffixe ;
2. construire les pages suivantes avec `:p:{n}` ;
3. arrêter quand aucune nouvelle annonce unique n'est découverte ;
4. dédupliquer par identifiant source / URL détail et non par titre.

### 7. Route détail et identifiant source

Pattern actuel observé :

```text
/fr/pa/{numericId}/{slug}
```

Exemples :

```text
/fr/pa/8289361/vente-studio-46-m-et-20-de-terrasse-ain-sebaa
/fr/pa/8272960/superbe-studio-à-vendre-à-maârif-extension
```

Le `numericId` est le meilleur candidat actuel pour `source_id` Mubawab.

Règle proposée :

```text
source.name = "mubawab"
source.source_id = numericId
source.url = URL canonique détail
```

Le slug n'est pas une identité stable et ne doit pas participer à l'identité primaire.

## Données visibles dès la page de résultats

Selon les annonces, les pages catégorie exposent déjà :

- prix ou prix à consulter ;
- titre ;
- quartier + ville ;
- surface ;
- pièces ;
- chambres ;
- salles de bains ;
- caractéristiques / équipements ;
- extrait de description ;
- URL détail.

Les blocs `IMMOBILIER NEUF` / `Projet` sont structurellement différents des annonces classiques et doivent être classés séparément lors du discovery.

## Divergence avec le crawler historique AkarFinder

Le code existant `scripts/scrapers/sources/mubawab-depth-expansion.ts` utilise principalement :

```text
/fr/ct/{citySlug}/{categorySlug}
```

et documente que les catégories appartement/villa spécifiques seraient indisponibles.

Cette hypothèse est aujourd'hui obsolète : les routes `st` spécifiques appartement, villa et maison répondent actuellement.

**Décision :** ne pas modifier le crawler historique pendant la phase Discovery. Le Lot 2 doit d'abord produire une cartographie vérifiée et mesurer les doublons entre `ct`, `st`, `sc`, `sd` et `is`.

## Discovery lanes

### Lane A — primaire

- `st` ville + catégorie
- `sc` catégorie nationale, comme contrôle de couverture

### Lane B — validation

- `ct` routes historiques existantes

### Lane C — taxonomie / diagnostic

- `sd` quartier
- `is` SEO intent

Lane C ne doit pas alimenter le dataset primaire tant que sa redondance n'est pas connue.

## Critère de fermeture du Lot 2

Lot 2 est CLOSED uniquement lorsque :

- les familles de routes sont inventoriées ;
- la pagination est prouvée ;
- le pattern de `source_id` est prouvé ;
- une matrice villes × catégories est définie ;
- les routes obsolètes / secondaires sont identifiées ;
- un discovery manifest peut être produit sans ouvrir les pages détail ;
- les mêmes annonces découvertes via plusieurs routes sont dédupliquées ;
- aucune ingestion DB n'est effectuée.

## Next exact

Construire `config.json` avec la matrice initiale villes × catégories et un script de discovery read-only qui sort uniquement des URLs + IDs + provenance de route.