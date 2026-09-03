# Lot 7 Status

**Status: 🟡 OPEN — sandbox 20 implemented, CI proof pending**

## Goal

Prouver que les données canoniques peuvent alimenter AkarFinder dans un environnement strictement isolé, sans toucher à la production ni à la base SQLite historique.

## Success

Progression contrôlée :

```text
20 annonces
→ 100 annonces
→ 1 000 annonces
```

Pour chaque palier, valider :

- import canonique ;
- recherche ;
- filtres ;
- ranking ;
- page détail ;
- provenance ;
- mise à jour idempotente ;
- désactivation ;
- purge `source=mubawab` ;
- absence d'impact sur toute donnée non-Mubawab / directe / partenaire.

## Safety boundary

Le Lot 7 utilise une base SQLite dédiée au sandbox.

Interdictions :

- ne jamais écrire dans `scripts/scrapers/output/akarfinder.db` ;
- ne jamais utiliser Supabase production ;
- aucun déploiement Vercel ;
- aucun write production ;
- aucun merge automatique.

Le sandbox est créé dans un répertoire temporaire et détruit après le test.

## Upstream prerequisite

Lot 1 re-certification : **GREEN**.

- workflow : `Data Ingestion Lot 1 Contract Gate`
- run ID : `33814112348`
- résultat : `success`
- transaction absente : fail-closed, jamais transformée en vente par défaut ;
- `agency_direct` conservé comme provenance distincte.

## Phase 7A — sandbox store contract

Implémenté :

- `data-ingestion/sandbox-store.ts`
  - crée une SQLite dédiée à un chemin explicite ;
  - tables `property_listings` + `listing_sources` ;
  - import `CanonicalPropertyV1` ;
  - idempotence par `source_name + source_id` ;
  - requêtes ville / type / transaction / prix / surface ;
  - détail par ID ;
  - purge portal source ;
  - provenance persistée séparément.

- `scripts/scrapers/__tests__/data-ingestion-lot7-sandbox.test.ts`
  - 20 annonces Mubawab canoniques synthétiques à partir des fixtures validées ;
  - 1 annonce témoin `agency_direct` ;
  - re-import des 20 ;
  - vérification filtres et détail ;
  - purge Mubawab ;
  - vérification que le témoin direct survit ;
  - nettoyage du répertoire temporaire.

- `.github/workflows/data-ingestion-lot7-sandbox.yml`
  - gate CI dédié `Data Ingestion Lot 7 Sandbox Gate` ;
  - Node 22 ;
  - zéro réseau métier ;
  - zéro secret ;
  - zéro production.

## Proof required for 7A

Le gate CI doit démontrer :

- sandbox DB créée dans un répertoire temporaire ;
- 20 Mubawab + 1 témoin direct importés ;
- re-import = 0 doublon supplémentaire ;
- filtres vente/location/type/ville/prix/surface fonctionnels ;
- détail accessible ;
- purge Mubawab retire les 20 Mubawab ;
- la fixture `agency_direct` reste intacte ;
- DB sandbox supprimable après test ;
- `production_writes = 0` par construction du workflow.

## Current proof state

Code + test + workflow : ✅

CI autoritative : ⏳ en attente d'indexation/exécution du nouveau HEAD.

## Next exact

1. obtenir le premier run GREEN du `Data Ingestion Lot 7 Sandbox Gate` ;
2. si vert, certifier **7A / palier 20** ;
3. étendre le même store au palier **100 annonces** sans ajouter de nouvelle architecture ;
4. ajouter ranking et désactivation/lifecycle au gate avant passage à 1 000.
