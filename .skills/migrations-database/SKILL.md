# Migrations & Database Review

## Purpose
Garantir que le schéma PostgreSQL, les migrations et bulk writes sont cohérents, performants, réversibles et sans drift caché.

## When it applies
`supabase/migrations/**`, tables/views/functions/triggers, indexes, contraintes, RLS/grants, transactions, data backfills ou mass writes.

## Required inspection
Historique migrations, schéma cible, dépendances fonctions/triggers, RLS, locks, index plans si pertinent, volume, transaction boundaries, idempotence/re-run et rollback.

## Mandatory evidence
Migration versionnée ; tests PostgreSQL/migration/schema drift existants ; avant/après pour data writes ; contraintes/index ; transaction/rollback ; impact performance/lock ; exact-head gates.

## Blockers
DDL hors migration ; drift non expliqué ; destructive change sans plan ; bulk write non borné ; rollback absent ; trigger order non vérifié ; RLS/grant regressif ; index/constraint incohérent.

## PASS / FAIL criteria
PASS si migration déterministe, compatible, testée, rollbackable selon risque et sans drift inattendu. Sinon `CHANGES_REQUIRED`.

## Forbidden shortcuts
Pas de SQL prod ad hoc comme source de vérité ; pas de migration réécrite après application ; pas de write massif pour “voir” ; pas de SQLite substitué à PostgreSQL quand le comportement PG importe.

## Required final report
SHA, migrations, objets touchés, locks/perf, tests PG/drift, before/after si data, rollback et verdict.
