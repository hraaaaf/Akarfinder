# C8A — Contrat d’autorité et taxonomie Rabat

## Mission

Étendre la carte intelligence marché de Rabat au-delà de la surface certifiée C0–C7 vers tous les quartiers de marché défendables, sans rouvrir ni affaiblir le socle historique.

## Invariant historique

- C0–C7 restent le baseline historique immuable, fermé à **8 / 8 = 100 %**.
- Les sémantiques et métriques C3 restent inchangées.
- Aucun identifiant, nom ou sens d’entité existante n’est silencieusement renommé, ré-identifié ou réinterprété.
- Le resolver géographique reste **fail-closed** : ambigu, inconnu ou non certifié reste non résolu.
- C8A est un contrat de taxonomie et d’autorité. **Il n’active aucune nouvelle zone runtime ou publique.**

## Couches d’autorité indépendantes

C8 sépare explicitement quatre couches qui ne doivent jamais être fusionnées par commodité :

1. **`product_locality`** — localité/quartier canonique selon la sémantique produit AkarFinder.
2. **`admin_parent`** — hiérarchie administrative ou statistique officielle, avec source et version explicites.
3. **`postal_names`** — noms et alias postaux officiels, uniquement après ingestion reproductible de la source.
4. **`geometry`** — géométrie indépendante, versionnée, sourcée et certifiée séparément.

Une unité administrative n’est pas automatiquement un quartier de marché. Réciproquement, un quartier de marché peut être plus fin qu’une unité administrative.

## Modèle cible C8B

Chaque `product_locality` Rabat doit pouvoir porter au minimum :

- `id`
- `city`
- `display_name`
- `normalized_name`
- `aliases[]`
- `admin_parent_id | null`
- `taxonomy_status: certified | candidate | rejected`
- `market_map_eligible`
- `geometry_status: certified_polygon | point_proxy | unresolved`
- `geometry_source`
- `geometry_version`
- `data_sources[]`

## Règles de sûreté

- Un alias ne fusionne jamais silencieusement deux entités.
- Aucun polygone n’est inféré à partir d’un nom seul.
- Toute localité ambiguë ou non résolue reste **fail-closed**.
- Aucun centroïde, polygone ou parent administratif n’est fabriqué pour améliorer artificiellement la couverture.
- Une `product_locality` peut être incluse dans un `admin_parent` officiel sans en reprendre automatiquement les limites.
- Un arrondissement officiel ne devient pas automatiquement une `product_locality` de marché.
- `market_map_eligible: true` exige une taxonomie certifiée et une géométrie défendable pour l’usage concerné.
- Les métriques C3 ne sont ni recalculées ni mutées par C8A/C8B.
- L’extension se fait incrémentalement, par entités explicites, sourcées et testées.

## Baseline interne Rabat préservé

| Entité canonique | État produit actuel | Éligibilité carte actuelle | Géographie actuelle |
|---|---|---:|---|
| Agdal | canonique | `true` | proxy ponctuel/centroïde existant |
| Hay Riad | canonique | `true` | proxy ponctuel/centroïde existant |
| Hassan | canonique | `true` | proxy ponctuel/centroïde existant |
| Souissi | canonique | `false` | non résolue pour activation marché |
| Océan | canonique | `false` | non résolue pour activation marché |

Cette baseline doit rester lossless pendant C8.

## Rôle des sources d’autorité

- **HCP** : autorité pour la hiérarchie administrative/statistique publiée et sa nomenclature, pas pour déduire automatiquement la sémantique produit AkarFinder.
- **AURS** : autorité de planification/secteur et de limites lorsqu’elles sont explicitement publiées et versionnables.
- **Poste Maroc** : source potentielle de noms/alias de quartiers uniquement après extraction reproductible et traçable ; ce n’est pas une autorité polygonale par défaut.
- Portails immobiliers, blogs et pages éditoriales : jamais autorité canonique de géométrie.

Le contexte officiel HCP inclut notamment une unité **Agdal Riyad**, alors que la taxonomie produit actuelle distingue **Agdal** et **Hay Riad**. Cette différence doit être modélisée, pas écrasée.

## Roadmap extension C8

- **C8A — Authority + taxonomy contract**
- **C8B — Canonical Rabat locality registry + aliases/parents**
- **C8C — Defensible geometry ingestion/certification**
- **C8D — Market-data projection + UI expansion + final certification**

## Critères d’acceptation C8A

C8A est clos uniquement si :

- le présent contrat est versionné et couvert par un gate dédié ;
- le statut historique C7 reste inchangé à **8 / 8 = 100 %** ;
- les cinq entités Rabat existantes sont conservées sans perte ;
- les quatre couches d’autorité sont explicitement séparées ;
- aucune nouvelle zone runtime/publique n’est activée ;
- C8B précède toute ingestion/certification polygonale C8C.
