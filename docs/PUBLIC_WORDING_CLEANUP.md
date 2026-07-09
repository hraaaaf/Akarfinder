# PUBLIC_WORDING_CLEANUP

## 1. Objectif
Neutraliser les formulations publiques trop affirmatives ou contradictoires avant les prochaines features sensibles autour du prix et de la référence.

## 2. Wordings nettoyés
- `Score de fiabilité`
- `Annonce fiable`
- `Annonce vérifiée`
- `Sous le marché`
- `Au-dessus du marché`
- `Score fictif`

## 3. Remplacements choisis
- `Niveau d'information`
- `Informations disponibles`
- `À confirmer sur la source originale`
- `Repère indicatif bas`
- `Repère indicatif haut`
- `Repère fictif`

## 4. Doctrine publique AkarFinder
AkarFinder aide à chercher, comparer et vérifier sur la source originale. AkarFinder ne certifie pas, ne garantit pas et ne juge pas.

## 5. Cas `/pro`
La page Pro parle désormais de niveau d'information et non de score de fiabilité.

## 6. Cas package-score
Les signaux de fiabilité affichés publiquement ont été rewordés en niveau d'information ou informations à compléter.

## 7. Cas demo
Les labels de position de prix en démo utilisent désormais des repères indicatifs.

## 8. Tests et scans
- Tests unitaires dédiés `public-wording`
- Tests existants de package score mis à jour
- Scan exact des formulations interdites dans `app`, `components`, `lib`

## 9. Limites restantes
Le produit garde certains signaux de comparaison ou de score internes. Ils restent indicatifs et ne certifient rien.

## 10. Prochaines étapes
Continuer à nettoyer les formulations publiques autour des comparaisons prix et des signaux d'information si de nouvelles surfaces les exposent.
