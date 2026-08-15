# SEARCH Price Extraction v4 — Closeout

**Date :** 2026-08-15  
**Statut :** CLOSED techniquement et appliqué en production.

## Résultat vérifié

- PR technique **#656 ✅ MERGED**.
- Merge : `a16143a15fcce7357835a4c769548dfa78ed2f1a`.
- Head certifié : `0842bb027394abd8a7d4b4707282e7ace5da3fce`.
- Gate dédiée `31896985271` : **SUCCESS**.
- Snapshot avant apply : **2 694 / 15 438 = 17,45 %**.
- Snapshot après apply : **2 703 / 15 438 = 17,51 %**.
- Gain v4 strict : **+9 prix**.

## Cohorte appliquée

- Masaken : **+2**.
- Mouldar : **+3**.
- Mubawab : **+4**.
- Total : **9/9** lignes auditées puis appliquées.

Chaque ligne était encore `LISTING`, publiquement éligible et `normalized_price_mad IS NULL` juste avant l’écriture.

## Garde-fous conservés

- aucun fetch tiers dans ce lot ;
- aucune inférence faible ;
- aucun prix/m² converti en prix total ;
- short-stay rejeté ;
- prix sur demande rejeté ;
- sources/provider/freshness bornés ;
- écriture uniquement sur les IDs audités et uniquement si le prix était encore NULL.

## Sources maintenues en HOLD

- **Agenz** : snippets/fiches pouvant mélanger prix du bien, prix de projet « à partir de » et annonces voisines ; pas de règle générique assez sûre.
- **PromoImmo** : aucun signal suffisamment fiable.
- **Avito** : HTTP 403 ; aucun bypass.
- **DarAgadir résiduel** : les lignes restantes sortent des garde-fous sûrs ou relèvent du short-stay.

## État production post-v4

- Couverture prix globale : **17,51 %**.
- DarAgadir : **1 660 avec prix / 3 798 sans prix**.
- Masaken : **111 avec prix / 643 sans prix**.
- Mouldar : **91 avec prix / 1 198 sans prix**.
- Mubawab : **160 avec prix / 1 215 sans prix**.

## Suite

Le prochain levier ne doit pas élargir artificiellement les regex textuelles. Il faut qualifier, source par source, les voies de détail public ou nouvelles sources observables qui apportent des prix explicites sans contamination ni bypass.