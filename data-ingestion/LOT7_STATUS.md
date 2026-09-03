# Lot 7 Status

**Status: 🟡 OPEN — Phase 7A CLOSED; real AkarFinder read path / ranking / lifecycle / API-UI proof remain**

## Goal

Prouver que les données canoniques peuvent alimenter AkarFinder dans un environnement strictement isolé, sans toucher à la production ni à la base SQLite historique.

## Safety boundary

Interdictions inchangées :

- jamais écrire dans `scripts/scrapers/output/akarfinder.db` ;
- jamais utiliser Supabase production ;
- aucun déploiement Vercel ;
- aucun write production ;
- aucun merge automatique.

Toutes les DB Lot 7 sont créées dans un répertoire temporaire et supprimables sans effet collatéral.

## Upstream prerequisite

Lot 1 re-certification : **GREEN**.

- workflow : `Data Ingestion Lot 1 Contract Gate`
- run ID : `33814112348`
- résultat : `success`
- transaction absente : fail-closed ;
- `agency_direct` conservé comme provenance distincte.

## Phase 7A — isolated sandbox store

**Status: ✅ CLOSED**

Implémenté :

- `data-ingestion/sandbox-store.ts`
- import `CanonicalPropertyV1` ;
- clé idempotente `source_name + source_id` ;
- filtres ville / type / transaction / prix / surface ;
- détail par ID ;
- pagination ;
- purge source portail ;
- témoin `agency_direct` protégé ;
- SQLite temporaire uniquement.

### Preuves autoritatives

#### Palier 20

- workflow : `Data Ingestion Lot 7 Sandbox Gate`
- run : `33816613177`
- conclusion : **success**
- 20 Mubawab + 1 témoin direct ;
- re-import idempotent ;
- purge Mubawab sélective.

#### Palier 100

- workflow : `Data Ingestion Lot 7 Sandbox 100 Gate`
- run : `33816499499`
- conclusion : **success**
- 100 Mubawab + 1 témoin direct ;
- 50 Casablanca / 50 Rabat ;
- 50 sale / 50 rent ;
- filtres + pagination + idempotence + purge sélective.

#### Palier 1 000

- workflow : `Data Ingestion Lot 7 Sandbox 1000 Gate`
- run : `33816613319`
- conclusion : **success**
- 1 000 Mubawab + 1 témoin direct ;
- pagination profonde ;
- idempotence ;
- purge Mubawab sélective ;
- témoin direct intact.

## Phase 7B — real AkarFinder SQLite read path

**Status: 🟡 OPEN**

Risque identifié : les preuves 7A utilisaient le helper `Lot7SandboxStore.query()` et ne prouvaient donc pas encore le lecteur réel AkarFinder.

Correction engagée :

- schéma sandbox aligné avec les attentes de `lib/listings/db-listings.ts`, notamment `data_completeness_score` ;
- test `scripts/scrapers/__tests__/data-ingestion-lot7-real-read-path.test.ts` ;
- le test importe via le store puis lit via les fonctions réelles `queryDbListings()` et `getDbListingById()` ;
- gate dédié `.github/workflows/data-ingestion-lot7-real-read-path.yml`.

## Remaining Lot 7 proof

Après 7B, il restera à démontrer sur environnement isolé :

1. ranking AkarFinder sur les données sandbox ;
2. désactivation/lifecycle dans le store sandbox ;
3. API AkarFinder branchée au dataset isolé ;
4. validation UI/recherche/filtres/détail ;
5. provenance et purge visibles de bout en bout.

Lot 7 ne sera CLOSED qu'après ces preuves, même si le simple volume 20 → 100 → 1 000 est déjà validé.

## Next exact

Obtenir le GREEN de `Data Ingestion Lot 7 Real Read Path Gate`, puis brancher le ranking réel AkarFinder sur le même dataset sandbox.
