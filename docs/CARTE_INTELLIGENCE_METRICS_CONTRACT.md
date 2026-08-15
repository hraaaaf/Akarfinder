# Carte intelligence marché — C2 Metrics Contract

## Statut

**PREPARED / NOT CLOSED** tant que C1 n’a pas livré de géométrie quartier certifiée avec surface `area_km2`.

Ce contrat traduit le référentiel visuel canonique Carte en métriques calculables sans réinventer les fondations P1C déjà mergées.

## 1. Mode Prix

Métrique principale : `median_price_per_m2_mad`.

Source existante : `odm_neighborhood_offer_shadow_segment_v1.median_price_per_m2_mad`.

Règles :
- vente et location restent segmentées ;
- aucune moyenne naïve ;
- aucune imputation de prix manquant ;
- sample size et niveau de fiabilité restent disponibles ;
- un prix `insufficient` ne devient pas une vérité publique par simple rendu cartographique.

## 2. Mode Annonces

Métrique principale : `listing_count`.

Source existante : couche P1C.1 Offre quartier Shadow.

Sémantique publique tant que la représentativité d’acquisition n’est pas certifiée : **nombre d’annonces observées par AkarFinder**, et non taille totale du marché.

## 3. Mode Densité

Métrique :

`observed_listing_density_per_km2 = listing_count / area_km2`

Préconditions obligatoires :
- géométrie `Polygon` ou `MultiPolygon` C1 certifiée ;
- `area_km2 > 0` calculée depuis cette même géométrie ;
- aucune surface de bounding box ;
- aucune surface estimée à partir d’un rayon/point ;
- même scope transactionnel que le volume affiché.

Si `area_km2` n’est pas certifiée, la densité est `NULL` et le mode échoue fermé pour cette zone.

## 4. Confiance des données

La fiche quartier doit distinguer :
- **fiabilité statistique** : `insufficient / limited / moderate / strong`, issue du moteur P1C.2 ;
- **représentativité d’acquisition** : certifiée ou non, issue de P1C.3/P1C.4 ;
- **taille d’échantillon** : toujours visible lorsque pertinente.

`moderate` ou `strong` ne signifie pas automatiquement « marché représentatif ».

## 5. Intensité heat map

Chaque mode dispose de sa propre échelle. Les valeurs de modes différents ne partagent jamais une même normalisation.

La classification des couleurs sera définie en C3 et devra :
- être déterministe et versionnée ;
- exposer les bornes de légende utilisées ;
- conserver `NULL` comme absence de donnée, pas comme zéro ;
- ne pas transformer un échantillon insuffisant en valeur fiable.

## 6. Contrat du mockup

Les trois tabs sont réels et indépendants :
- `Prix` → médiane DH/m² ;
- `Densité` → annonces observées/km² ;
- `Annonces` → nombre d’annonces observées.

Le clic quartier doit transmettre la même zone canonique à la fiche et au CTA Search.

Les valeurs numériques du mockup ne sont jamais hardcodées.

## 7. Handoff C1 → C2

C1 doit livrer, pour chaque quartier activable :
- identifiant canonique ;
- géométrie Polygon/MultiPolygon ;
- provenance/licence/attribution ;
- statut de revue ;
- **surface géodésique certifiée `area_km2`**.

Sans ces cinq preuves, C2 Densité reste bloqué pour la zone concernée.
