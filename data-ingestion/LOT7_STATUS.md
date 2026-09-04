# Lot 7 Status

**Status: 🟡 OPEN — functional gates GREEN; final browser visual proof pending**

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

## Functional proof status

Les gates Lot 7 fonctionnels sont validés sur la branche :

- sandbox 20 / 100 / 1 000 ;
- real SQLite read path ;
- ranking ;
- lifecycle ;
- API routing ;
- Search page contract.

La purge source est désormais explicite via `source_type='portal'` et ne repose plus sur `origin_type='unknown'`. Les sources directes et partenaires restent distinctes et protégées.

## Final browser proof

**Status: ⏳ PENDING**

La preuve finale doit venir d'un vrai Chromium headless lancé contre la vraie page `/search`, alimentée par une SQLite Lot 7 isolée.

Le job existant `Data Ingestion Lot 7 API Routing Gate / api-routing` porte désormais directement les étapes suivantes :

1. validation API routing ;
2. installation Chromium Playwright ;
3. seed SQLite Lot 7 isolée ;
4. lancement local AkarFinder ;
5. capture réelle de `/search` ;
6. screenshots desktop 1440 et mobile 390 ;
7. upload de l'artefact `lot7-search-visual-proof`.

## Closure rule

Lot 7 ne sera **CLOSED** qu'après :

- run `api-routing` final GREEN avec les étapes navigateur ;
- artefact `lot7-search-visual-proof` récupéré ;
- inspection des deux PNG ;
- aucune écriture production / historique.

## Next exact

Attendre le run déclenché par cette mise à jour `data-ingestion/**`, inspecter le job `api-routing`, puis récupérer et vérifier l'artefact visuel.
