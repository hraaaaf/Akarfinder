# SEARCH — Prix indicatifs à vérifier sur la source

Date : 2026-08-15

## Objectif

Afficher un prix textuel plausible lorsque le prix fiable est absent, sans promouvoir ce montant au rang de donnée certifiée et sans l'utiliser dans les filtres ou le ranking.

## Baseline fiable inchangée

- Représentations publiques : **15 438**.
- Prix fiables (`normalized_price_mad`) : **2 703**.
- Couverture fiable : **17,51 %**.
- Ce lot ne modifie pas `normalized_price_mad` et ne doit pas être compté dans cette couverture.

## Audit des sources précédemment HOLD

Sur les représentations publiques `LISTING` éligibles sans prix fiable :

- `agenz.ma` : **79** lignes contenant un token monétaire DH/MAD dans le texte indexé.
- `promoimmomarrakech.com` : **0** ligne avec token monétaire exploitable dans l'index courant.
- `avito.ma` : **0** ligne avec token monétaire exploitable dans l'index courant.
- `daragadir.com` résiduel : **0** ligne avec token monétaire exploitable dans l'index courant.

Qualification stricte Agenz :

- **44** représentations avec exactement un montant plausible après exclusions ;
- **3** représentations avec plusieurs montants plausibles rejetées ;
- le reste des 79 occurrences est rejeté par les garde-fous ou ne produit pas un montant plausible unique.

## Règles d'affichage

Le prix indicatif est dérivé uniquement à l'affichage depuis `title` + `snippet` déjà indexés :

1. source strictement `agenz.ma` ;
2. prix fiable absent ;
3. exactement un montant DH/MAD plausible ;
4. vente < 10 000 DH rejetée ;
5. location < 1 000 DH rejetée ;
6. montant > 500 000 000 DH rejeté ;
7. contexte prix/m² rejeté ;
8. courte durée / par nuit / par jour rejetée ;
9. plusieurs montants plausibles = rejet fail-closed.

Affichage : **« Prix indicatif · à vérifier sur la source »**.
Le CTA vers la source originale reste présent sur la carte.

## Séparation de confiance

- `normalized_price_mad` reste l'unique prix fiable utilisé par les filtres et le ranking.
- Aucun champ DB de prix indicatif n'est créé.
- Aucune écriture DATA n'est effectuée dans ce lot.
- Le nombre de prix indicatifs est une métrique séparée et ne doit jamais être additionné à la couverture fiable de 17,51 %.

## Tests

Gate dédiée :

- montant Agenz unique accepté ;
- multi-montants rejetés ;
- prix/m² rejeté ;
- courte durée rejetée ;
- sources non-Agenz rejetées ;
- planchers vente/location testés ;
- TypeScript `--noEmit` obligatoire.
