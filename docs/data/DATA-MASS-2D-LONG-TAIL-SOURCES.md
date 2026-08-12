# DATA MASS-2D — Long-Tail Source Policy Review

**Statut : ACTIVE — certification required**  
**Branche : `data/mass-2d-long-tail-sources`**  
**Prédécesseur : MASS-2C merge `bc88c15fbc78d2c7ad4bf03faac6eab48d408e4f`**

## Résultat de revue

- cohorte certifiée MASS-2A : **51 domaines, rangs 51→101** ;
- **9 `PERMISSION_REQUIRED`** ;
- **42 `HOLD`** ;
- **9 `CANONICAL_LINK_ONLY_CANDIDATE`, 0 approuvé** ;
- rendement historique figé : **2 028 URL-représentations / 1 889 signaux immobilier Maroc / 96 structures détail** ;
- production Registry au préflight : **0/51** ;
- **0 acquisition directe autorisée** ;
- **0 photo/description complète autorisée** ;
- **0 permission inférée / 0 activation publique / 0 Registry write**.

`HOLD` ne signifie pas interdit. Il signifie que la preuve publique de réutilisation n'est pas suffisamment résolue pour sortir du fail-closed.

## Preuves restrictives résolues

`damaneimmo.ma`, `rabat.repimmo.com`, `castleagency.ma`, `agencekna.com`, `sogarab.ma`, `loco.ma`, `immo.hespress.com`, `ma.green-acres.com`, `pap.fr`.

Leur documentation publique revendique les droits sur les contenus et/ou interdit extraction, reproduction, redistribution ou exploitation sans autorisation. L'attribution et un lien canonique ne neutralisent pas ces restrictions.

## Doctrine

- acquisition directe et indexation publique minimale = axes séparés ;
- attribution `Source : X` + lien canonique obligatoires pour toute représentation tierce future ;
- attribution ≠ permission ;
- robots/sitemap ≠ permission ;
- pas de photos ni descriptions complètes par défaut ;
- tout candidat canonical-link reste non activable avant baseline transverse ou permission explicite.

## Gate

Le workflow `DATA MASS-2D Long-Tail Source Review` doit prouver :
- rangs 51→101 et scores MASS-1 immuables ;
- predecessor MASS-2C exact ;
- distribution **9/42** ;
- rendements **2028/1889/96** ;
- tests + TypeScript + build ;
- audit Registry production read-only ;
- Registry **0/51** sinon fail closed ;
- 0 source/detail fetch, 0 write, 0 ingestion, 0 activation, 0 permission inférée.

MASS-2D ne devient CLOSED qu'après CI exact-head, artefact, merge et contrôle post-merge SHA/tree.
