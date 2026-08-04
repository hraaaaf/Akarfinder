# DATA P0 — Revue URL Evidence Shadow V2

**Date : 2026-08-04**  
**Statut : Shadow uniquement — aucune classification active modifiée**

## 1. Décision

Le moteur actif `refresh_odm_document_kind_classification_v1()` ne classe une ligne en `LISTING` que si elle possède simultanément :

- ville normalisée ;
- type normalisé ;
- intention normalisée ;
- prix ou surface ;
- au moins 80 caractères de titre + extrait.

Cette règle protège contre le bruit, mais elle transforme aussi des pages détail manifestes en `AMBIGUOUS` lorsque les champs structurés ne sont pas encore récupérés.

Le Shadow V2 ajoute une preuve indépendante, fondée sur :

1. une politique Source Registry `canonical_link_only` ;
2. un domaine explicitement borné ;
3. un pattern d’URL de page détail ;
4. une référence ou une structure transactionnelle forte ;
5. l’exclusion prioritaire des catégories, collections et sources `internal_signal_only`.

## 2. Sources admises dans le Shadow

| Source | Pattern retenu | Politique publique |
|---|---|---|
| Dar Agadir | `/annonces/annonces-immobilieres/<transaction>/<catégorie>/<slug>.html` | lien canonique uniquement |
| Promo Immo Marrakech | `/produit/<code>-<id>/<slug>.html` | lien canonique uniquement |
| Aykana | `/property/<slug>-ref-<id>` | lien canonique uniquement |
| L’Immobilier Sans Frontières | `/property/<bien>-<transaction>-...` avec exclusions collections | lien canonique uniquement |

## 3. Sources explicitement exclues

- `sarouty.ma` : `internal_signal_only` ;
- `soukimmobilier.com` : `internal_signal_only` ;
- `atlasimmobilier.com` : différé, car `/p/<slug>` contient aussi des réalisations passées, contenus commerciaux et pages de portefeuille ; une preuve URL seule n’est pas suffisamment précise.

## 4. Potentiel Shadow connecté

Avant déduplication :

| Source | Lignes candidates | Immédiatement display-eligible | Toujours quality-blocked |
|---|---:|---:|---:|
| Dar Agadir | 6 533 | 6 528 | 5 |
| Promo Immo Marrakech | 2 768 | 2 725 | 43 |
| L’Immobilier Sans Frontières | 1 213 | 544 | 669 |
| Aykana | 561 | 432 | 129 |

Après normalisation simple de l’URL :

| Source | URLs distinctes display-eligible | Doublons de représentation | `fresh_confirmed` |
|---|---:|---:|---:|
| Dar Agadir | 5 744 | 784 | 100 |
| Promo Immo Marrakech | 2 725 | 0 | 7 |
| L’Immobilier Sans Frontières | 487 | 57 | 70 |
| Aykana | 420 | 12 | 42 |

Le potentiel distinct total est élevé, mais la majorité reste `seed_only`. Il serait incorrect de présenter ce volume comme un stock frais.

## 5. Revue du corpus

Les échantillons connectés confirment notamment :

- des titres et URLs transactionnels explicites ;
- des identifiants stables dans les chemins Promo Immo et Aykana ;
- des pages détail `.html` sous une hiérarchie transaction/catégorie pour Dar Agadir ;
- des pages `/property/` singulières avec bien + transaction pour L’Immobilier Sans Frontières.

La revue a aussi détecté un problème séparé : des expressions comme « route de Casablanca » sont parfois interprétées comme la ville Casablanca alors que le bien se trouve à Marrakech ou Agadir. Le Shadow V2 ne corrige pas et ne réutilise pas cette géographie. La correction géographique appartient à un LOT distinct avec corpus et tests dédiés.

## 6. Gates avant Canary

- migration et chaîne SQL compilées ;
- zéro source `internal_signal_only` dans la vue Shadow ;
- déduplication par URL normalisée ;
- revue manuelle minimale de 25 URLs par source ;
- précision document-kind cible ≥ 98 % sur le corpus annoté ;
- `fresh_confirmed` et `seed_only` rapportés séparément ;
- aucune modification de `display_eligibility` dans le Shadow ;
- aucune récupération de détail, image, contact ou contenu supplémentaire ;
- Canary limité à une source et un nombre borné de lignes ;
- rollback par version de classification.

## 7. Conclusion

Le premier levier DATA n’est pas une nouvelle collecte massive. Il est la récupération prudente de pages détail déjà découvertes et actuellement bloquées par une exigence de champs trop stricte.

La prochaine étape autorisée après certification de cette PR est un Canary borné, en commençant par la source présentant le meilleur compromis entre précision URL, diversité géographique et fraîcheur confirmée. Le nombre de `LISTING` publiques net-new, après déduplication et contrôle de fraîcheur, reste la seule métrique de succès.
