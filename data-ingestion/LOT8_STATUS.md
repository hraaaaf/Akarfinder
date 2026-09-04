# Lot 8 Status

**Status: 🟡 OPEN — implementation landed; dedicated proof pending**

## Goal

Rendre possible une ingestion large depuis un dataset validé avec contrôle opérationnel, reprise, rollback et purge, sans toucher à la production pendant la preuve.

## Safety boundary

Cette première implémentation Lot 8 est volontairement limitée à une SQLite isolée située sous le répertoire temporaire de l'OS.

Interdictions inchangées :

- jamais écrire dans `scripts/scrapers/output/akarfinder.db` ;
- jamais utiliser Supabase production ;
- aucun déploiement Vercel ;
- aucun write production ;
- aucun merge automatique.

`ControlledSqliteBatchIngestor` refuse explicitement un chemin SQLite situé hors du répertoire temporaire de l'OS.

## Implémentation

Fichier : `data-ingestion/controlled-ingestion.ts`.

Capacités :

- ingestion par batch configurable ;
- taille de batch bornée ;
- métriques `inserted` / `updated` / batchs commités ;
- idempotence via le store canonique déjà prouvé au Lot 7 ;
- kill-switch vérifié avant chaque batch ;
- checkpoint `next_batch` pour reprise déterministe ;
- rollback du batch courant via snapshot SQLite pré-batch ;
- restauration de l'état exact pré-batch en cas d'échec ;
- purge source sélective héritée du store Lot 7 ;
- protection des sources `agency_direct` / `partner_feed`.

## Dedicated proof

Workflow : `Data Ingestion Lot 8 Controlled Massive Gate`.

Le gate doit exécuter :

1. la régression Lot 7 à 1 000 annonces ;
2. le test Lot 8 contrôlé.

Le test Lot 8 couvre :

- 2 500 annonces Mubawab en 5 batchs de 500 ;
- ré-ingestion idempotente des 2 500 annonces ;
- purge des 2 500 lignes `portal` sans supprimer les witnesses directs/partenaires ;
- arrêt après un batch puis reprise via `next_batch` ;
- rollback complet après une erreur au milieu d'un batch ;
- refus d'un chemin SQLite non isolé.

## Closure rule

Lot 8 ne sera CLOSED qu'après une preuve GREEN du workflow dédié sur le HEAD exact et vérification que :

- les batchs restent idempotents ;
- le checkpoint reprend sans doublon ;
- le kill-switch arrête entre deux batchs ;
- le rollback restaure l'état pré-batch ;
- la purge portail préserve `agency_direct` / `partner_feed` ;
- aucune base historique ou production n'est touchée.

## Next exact

Attendre la preuve CI du workflow `Data Ingestion Lot 8 Controlled Massive Gate`, inspecter ses deux steps de test, puis seulement décider si le Lot 8 peut être CLOSED sur ce scope isolé.
