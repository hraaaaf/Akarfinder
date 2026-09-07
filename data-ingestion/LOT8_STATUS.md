# Lot 8 Status

**Status: ✅ CLOSED — controlled massive ingestion proof GREEN**

## Goal

Rendre possible une ingestion large depuis un dataset validé avec contrôle opérationnel, reprise, rollback et purge, sans toucher à la production pendant la preuve.

## Safety boundary

Cette implémentation Lot 8 reste volontairement limitée à une SQLite isolée située sous le répertoire temporaire de l'OS.

Interdictions inchangées :

- jamais écrire dans `scripts/scrapers/output/akarfinder.db` ;
- jamais utiliser Supabase production ;
- aucun déploiement Vercel ;
- aucun write production ;
- aucun merge automatique.

`ControlledSqliteBatchIngestor` refuse explicitement un chemin SQLite situé hors du répertoire temporaire de l'OS.

## Implémentation

Fichier : `data-ingestion/controlled-ingestion.ts`.

Capacités prouvées :

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

## Dedicated proof — GREEN

Workflow : `Data Ingestion Lot 8 Controlled Massive Gate`.

- run : `33879281908` ;
- conclusion : `SUCCESS` ;
- HEAD exact : `979c7f57e46f5eb39c6d0a552fe78b635185e634` ;
- job : `controlled-massive` ;
- job id : `101043688350`.

### Regression Lot 7

`data-ingestion-lot7-sandbox-1000.test.ts`

- 1 000 listings ;
- pass : 1 ;
- fail : 0 ;
- conclusion : GREEN.

### Lot 8 controlled massive proof

`data-ingestion-lot8-controlled-massive.test.ts`

- tests : 4 ;
- pass : 4 ;
- fail : 0 ;
- cancelled : 0 ;
- skipped : 0.

Cas prouvés :

1. ingestion de 2 500 annonces Mubawab en batchs, idempotence et purge portal sélective ;
2. arrêt propre entre batchs puis reprise depuis le checkpoint retourné ;
3. rollback complet du batch courant après erreur au milieu du batch ;
4. refus de tout chemin SQLite hors du répertoire temporaire de l'OS.

La purge `portal` préserve les witnesses directs/partenaires.

## Closure decision

Les critères de fermeture du Lot 8 sont satisfaits sur le scope isolé :

- batchs idempotents : ✅ ;
- checkpoint/reprise sans doublon : ✅ ;
- kill-switch entre batchs : ✅ ;
- rollback pré-batch : ✅ ;
- purge portail sans suppression `agency_direct` / `partner_feed` : ✅ ;
- aucune base historique ou production touchée : ✅ ;
- régression Lot 7 : ✅.

**Lot 8 est CLOSED sur le scope sandbox / ingestion contrôlée.**

Cela n'autorise ni write production, ni merge, ni déploiement Vercel.

## Next exact

Passer au **Lot 9 — Industrialisation multi-source** : prouver qu'une seconde source peut produire le même `CanonicalListing` et traverser le pipeline existant sans modification structurelle du cœur canonique.
