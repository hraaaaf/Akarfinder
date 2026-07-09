# PRICE-POSITION-REFERENCE-V2

## 1. Objectif
Créer une couche de repère prix prudente qui aide à situer un bien sans présenter de vérité de marché.

## 2. Pourquoi repère indicatif ≠ prix de marché
Le repère est une aide à la lecture, pas une certification. Il reste dépendant du contexte, de la source et de la fraîcheur des données.

## 3. Conditions d'affichage
- bien supporté: appartement ou villa uniquement
- ville connue
- prix public affiché disponible
- surface disponible
- repère interne disponible
- résultat public non Gateway externe, ou explicitement autorisé par policy

## 4. Labels publics autorisés
- Repère prix indicatif
- Positionnement indicatif bas
- Positionnement indicatif proche
- Positionnement indicatif haut
- Écart indicatif important
- À confirmer avec la source originale
- Données indicatives, non officielles

## 5. Labels interdits
- Prix réel
- Prix officiel
- Prix de marché
- Sous le marché
- Au-dessus du marché
- Bon plan
- Trop cher
- Bonne affaire
- Arnaque
- Annonce fiable
- Annonce vérifiée

## 6. Données internes
Les repères internes peuvent servir au calcul, mais ne sortent jamais tels quels dans l'UI publique.

## 7. Données jamais exposées
- value_low
- value_median
- value_high
- evidence_ref
- source_registry
- confidence brute
- raw benchmark

## 8. Gateway policy
Pas d'enrichissement par défaut sur les résultats externes. Aucune modification de Gateway, Serper ou cache.

## 9. Tests / scans
- préconditions d'affichage
- affichage uniquement sur appartement/villa
- absence des labels interdits
- absence de fuite de dataset
- absence de branchement Gateway / OpenSERP dans cette couche

## 10. Limites V2
Cette V2 aide à comparer. Elle ne certifie rien, ne garantit rien et ne remplace pas la vérification de la source originale.

## 11. Prochaines étapes
Conserver ce repère comme bloc indicatif dormant. Ne pas passer en production sans GO explicite.
