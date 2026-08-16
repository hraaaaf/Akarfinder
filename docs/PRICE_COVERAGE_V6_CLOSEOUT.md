# SEARCH Price Coverage — v6 closeout

Date : 2026-08-16
Statut : **CLOSED avec incident de garde documenté et corrigé**

## Résultat

Le lot a confirmé un réservoir paginé substantiel de prix fiables puis a exécuté un bounded write de 100 prix Mubawab, avant durcissement du garde production.

### Audit paginé read-only

- PR #699 mergée : `64c8facdcece5f7956ac709fcc43ddf95de84d89`.
- Run `31919440782` : certify SUCCESS + 8/8 shards production read-only SUCCESS.
- 960 candidats : 480 Mubawab + 480 Masaken.
- 412 prix fiables = 42,92 %.
- Mubawab : 137/480 = 28,54 %.
- Masaken : 275/480 = 57,29 %.
- 58 échecs Masaken observés comme HTTP 410 stale/deleted.
- Aucun write dans ce run.

### Bounded write v6

- PR #701 mergée : `a7597bf29eb5ee521dce42407db80a7c983a7681`.
- Run manuel `31921208732` sur `main` : SUCCESS.
- Canary read-only : `snapshot_candidates=960`, `reliable=100`, `written=0`.
- Les 100 premières preuves fiables du canary provenaient de Mubawab ; la boucle s'est arrêtée au plafond avant d'atteindre Masaken.
- Le job `production-bounded-write` a ensuite été exécuté alors que l'intention opérationnelle était read-only.
- Résultat réel : `reliable=100`, `written=100`, tous Mubawab ; 0 write Masaken.
- Chaque write a été live-revalidé, identity-proven, limité à `normalized_price_mad IS NULL`, et seule la colonne `normalized_price_mad` a été mutée.

## Incident de garde

Le garde initial utilisait un input booléen `execute_write` et une condition GitHub Actions `inputs.execute_write == true`. Le run `31921208732` démontre que ce mécanisme n'a pas empêché l'exécution du job write dans le scénario read-only attendu.

La cause précise de cette divergence d'input n'est pas affirmée sans preuve supplémentaire. Le correctif ne dépend donc plus de ce comportement ambigu.

## Correctif de sécurité

- PR #704 mergée : `311e6088b491e7b4f83166d70a6a7dba45bc7de0`.
- CI hotfix : run `31922093413` — certify SUCCESS ; jobs production SKIPPED sur PR.
- L'input booléen est remplacé par une phrase exacte : `WRITE_100_RELIABLE_PRICES`.
- Le job write exige `github.event.inputs.write_confirmation == 'WRITE_100_RELIABLE_PRICES'`.
- Le script exige indépendamment `PRICE_COVERAGE_V6_WRITE_CONFIRMATION=WRITE_100_RELIABLE_PRICES` avant tout write.
- Test ciblé fail-closed : `undefined`, `READ_ONLY`, `true` et une phrase quasi identique avec espace final sont refusés ; seule la phrase exacte passe.

## Impact production observé

Snapshot Supabase après l'incident :
- total LISTING : **15 546** ;
- prix non-null : **2 936** ;
- couverture observée : **18,89 %** ;
- Mubawab : **294 / 1 375 = 21,38 %** ;
- Masaken : **210 / 754 = 27,85 %**.

Le total de listings ayant évolué en parallèle, aucune variation globale supplémentaire n'est attribuée aux 100 writes au-delà des **100 écritures directement prouvées par le log du run**.

## Décision sur le rollback

Aucun rollback n'est appliqué. Les 100 prix écrits ont été revalidés en live avec identité prouvée et garde `IS NULL`. Les supprimer créerait une régression de données fiable sans bénéfice de sûreté.

## Garde futur

Tout nouveau bounded write v6 doit rester :
- manuel via `workflow_dispatch` ;
- précédé d'un canary read-only ;
- limité à 100 writes ;
- live-revalidé par ligne ;
- protégé par la phrase exacte `WRITE_100_RELIABLE_PRICES` au niveau workflow **et** script.
