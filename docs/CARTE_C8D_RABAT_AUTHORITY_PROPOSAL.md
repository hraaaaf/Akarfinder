# C8D — Rabat authority proposal

## Goal

Préparer une autorité DB bornée pour les 18 localités C8B encore candidates, sans aucune mutation production.

## Succès

La proposition est acceptable si :

- les 18 candidates C8B sont représentées exactement une fois ;
- les 5 entités Rabat déjà validées restent exclues ;
- toute nouvelle entité proposée reste `pending_review`, `seo_eligible=false`, `map_eligible=false` ;
- les aliases proposés ne collisionnent pas avec les aliases DB existants ;
- les aliases normalisés sont uniques à l'intérieur d'une même entité ;
- aucune écriture DB n'est incluse.

## Preuves read-only

Le schéma production expose :

- `geo_entities.validation_status` ∈ `validated | pending_review | rejected` ;
- `geo_entities.entity_type` ∈ `city | neighborhood` ;
- unicité `(entity_type, parent_id, slug)` ;
- `geo_aliases` avec unicité `(geo_entity_id, normalized_alias)` ;
- `geo_aliases.confidence` bornée entre 0 et 1.

Entités Rabat déjà présentes et donc exclues de la proposition : Agdal, Hay Riad, Hassan, Souissi et Océan.

Un audit read-only des formes proposées n'a trouvé **aucune collision de `normalized_alias` avec `geo_aliases` existant**.

Deux collisions internes ont été volontairement dédupliquées avant toute future écriture :

- `Medina` / `Médina` → `medina` ;
- `Diour Jamaa` / `Diour Jamaâ` → `diour jamaa`.

## Manifest

`data/geo/rabat-authority-proposal-v1.json` contient 18 entités proposées sous namespace final `district_rabat_*`.

Toutes hériteraient, si un lot ultérieur est explicitement autorisé :

- `entity_type = neighborhood` ;
- `parent_id = city_rabat` ;
- `validation_status = pending_review` ;
- `seo_eligible = false` ;
- `map_eligible = false` ;
- `source_version = c8d_authority_proposal_v1`.

Le manifest n'est **pas** une migration et n'autorise aucune insertion.

## Dry-run production read-only

Le comparatif exécuté contre l'état production courant retourne :

- **18** entités proposées ;
- **18** entités nouvelles ;
- **0** conflit d'ID ;
- **0** conflit de slug sous `city_rabat` ;
- **26** lignes d'aliases proposées ;
- **26** aliases nouveaux ;
- **0** alias déjà présent pour les entités proposées ;
- **0 écriture exécutée**.

Ces résultats sont figés dans le manifest et contrôlés par test. Ils décrivent uniquement l'état observé au snapshot du 2026-08-16 ; ils devront être recalculés juste avant toute éventuelle mutation future.

## Décision de sécurité

Même lorsque le shadow resolver reconnaît une candidate, cela ne suffit pas à la publier. L'autorité DB proposée resterait non validée et non visible sur la carte jusqu'à certification séparée de la taxonomie, géométrie, métriques et contexte.

## Human gate réel

Toute future création de `geo_entity`, `geo_alias`, `geo_resolution_event` ou modification de `property_listing` en production est une action distincte et difficilement réversible. Elle nécessite donc une validation explicite avant exécution.

## Next

Après certification exact-head de cette proposition : préparer un **plan d'application borné** et réversible, mais ne pas l'exécuter sans validation explicite. En parallèle, poursuivre les preuves non destructives de géométrie et de métriques pour les candidates les plus mûres.
