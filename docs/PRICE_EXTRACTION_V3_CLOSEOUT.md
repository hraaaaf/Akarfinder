# SEARCH Price Extraction v3 — Closeout

**Date :** 2026-08-15  
**Statut :** CLOSED techniquement via PR #649 ; closeout documentaire de synchronisation live.

## Résultat vérifié

- PR technique **#649 ✅ MERGED**.
- Merge : `95132b751d0000be140d84fcfbf1f17ad84a2a5e`.
- Head technique : `ce13b5326cf82cdcfdf7323e3044d48ccd7e05f4`.
- Snapshot enregistré dans #649 : **2 690 / 15 438 = 17,42 %**.
- Snapshot live observé après merge : **2 694 / 15 438 = 17,45 %**.
- Baseline avant chantier prix : **915 / 15 438 = 5,93 %**.
- Couverture multipliée par environ **2,94×** par rapport à cette baseline.

## DarAgadir

- **1 660** représentations publiques avec prix au snapshot live vérifié.
- **0** URL short-stay publiée avec prix.
- La garde short-stay reste fail-closed.

## Sources maintenues en HOLD

- **PromoImmo** : aucune extraction jugée suffisamment fiable ; aucun prix inventé.
- **Avito** : HTTP 403 ; aucun bypass anti-bot/login/captcha/API privée.

## Garde-fous v3

L’extraction v3 ne complète un prix manquant que si la même URL publique porte :

1. un montant explicite DH/MAD ;
2. une surface explicite ;
3. une intention vente/location déterminable ;
4. aucun signal short-stay ;
5. un ratio montant/surface dans les garde-fous empiriques du lot ;
6. `normalized_price_mad IS NULL` avant write.

Aucun prix existant n’est écrasé.

## Drift 2 690 → 2 694

Le live dépasse de **4** le snapshot enregistré dans #649. Ce closeout consigne cette différence sans lui attribuer de causalité non prouvée.

## Suite

**Price Extraction v4** doit traiter les annonces encore sans prix **source par source**, en conservant les mêmes principes : extraction explicite, pas d’inférence faible, pas de bypass, canary borné avant toute écriture importante et validation QA après mutation.
