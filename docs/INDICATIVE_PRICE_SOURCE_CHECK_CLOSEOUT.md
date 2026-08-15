# SEARCH — Prix indicatifs à vérifier sur la source — closeout

Date : 2026-08-15

## Statut

✅ CLOSED techniquement et mergé via PR #661.

- Head exact certifié : `5a0529ecb3b2a36a0fb4d215098d5a87c55750a2`.
- Gate dédiée : run `31898270967` — `certify` SUCCESS.
- Test ciblé `scripts/scrapers/__tests__/indicative-price-source-check.test.ts` : SUCCESS.
- TypeScript `npx tsc --noEmit` : SUCCESS.
- Merge `main` : `92ca4adbfbe571e52f9a627f0fd7ef92ebb14fd4`.

## Comportement livré

- Le prix fiable reste prioritaire.
- Fallback indicatif limité à Agenz lorsqu’aucun prix fiable n’est disponible.
- Libellé public : `Prix indicatif · à vérifier sur la source`.
- Prix/m², courte durée, multi-montants et valeurs hors bornes restent rejetés.
- Un titre explicitement `à vendre` peut corriger le type uniquement pour le fallback indicatif ; il ne réécrit pas la donnée canonique.
- Aucun write DB.
- Aucun changement des filtres, du ranking ou de la métrique de couverture fiable.

## Audit production read-only de référence

- Couverture prix fiable : **2 703 / 15 438 = 17,51 %**.
- Agenz sans prix fiable avec token DH/MAD : **79**.
- Cohorte stricte à montant unique plausible : **44**.
- Multi-montants rejetés : **3**.
- QA finale : **36 locations** entre 1 000 et 50 000 DH, médiane 8 000 DH ; **8 ventes** entre 1 000 000 et 9 000 000 DH, médiane 3 235 000 DH.
- PromoImmo / Avito / DarAgadir résiduel : **0 token monétaire exploitable** dans l’index courant pour ce fallback.

## Invariant de vérité

Les montants indicatifs améliorent l’information affichée mais **ne comptent pas comme prix fiables**. La couverture fiable reste donc **17,51 %** sur le snapshot de référence du lot.

## Suite

Poursuivre l’acquisition de prix fiables source par source. Ne jamais promouvoir un montant indicatif vers le champ fiable sans preuve source suffisamment forte et garde-fous dédiés.
