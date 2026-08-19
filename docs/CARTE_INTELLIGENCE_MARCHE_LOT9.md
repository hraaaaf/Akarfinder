# Carte intelligence marché — Lot 9 : modes automatiques

Statut : **EN COURS**  
Date : 2026-08-18  
Base certifiée : `c14ae0b2cff512aa819ef3fb0a58927e7092daab`  
Branche : `agent/carte-intelligence-lot9-market-modes`

## Goal

Transformer le shell multi-villes certifié au Lot 8 en lecture marché automatique selon trois modes : **Prix / Densité / Annonces**, sans saisir de KPI manuellement et sans créer une seconde vérité parallèle à Search.

## Architecture verrouillée

Le moteur doit réutiliser la chaîne observée déjà prouvée à Rabat :

`geo_resolution_events -> thin_index_search_documents -> display eligibility -> dédoublonnage -> fraîcheur -> agrégation par city + district -> Carte`

Les champs `city`, `district`, `normalized_price_mad`, `normalized_surface_m2` et `normalized_price_m2` restent les données atomiques. Les KPI quartier sont dérivés à la lecture.

### Prix

- médiane de `normalized_price_m2` ;
- fallback calculé `normalized_price_mad / normalized_surface_m2` seulement lorsque les deux valeurs sont strictement positives ;
- affichage uniquement lorsque le niveau de fiabilité est suffisant ;
- jamais de fallback ville présenté comme prix exact de quartier.

### Annonces

- comptage des documents immobiliers affichables après résolution quartier ;
- dédoublonnage canonique avant agrégation ;
- séparation Vente / Location ;
- fraîcheur et version de snapshot conservées.

### Densité

- `annonces / km²` ;
- calcul seulement lorsque la surface provient d'une géométrie ou zone analytique admissible et explicitement tracée ;
- sinon `Données insuffisantes` ;
- aucun cercle, rayon arbitraire ou surface inventée.

## Goal visuel

Référence : mockup canonique utilisateur **AkarFinder — Carte intelligence marché**.

Lot 9 doit ajouter les trois modes réels sans encore réaliser la heatmap polygonale finale du Lot 10 :

- tabs `Prix | Densité | Annonces` ;
- mode mémorisé dans l'URL ;
- même caméra et même quartier lors du changement ;
- repères quartier et fiche compacte reflètent la métrique active ;
- états neutres explicites lorsque la donnée manque ;
- aucune régression de la composition Lot 8.

## Baseline avant

Baseline réelle : Lot 8 mergé, captures exact-head sur 390×844, 430×932, 768×900 et 1280×900. Le screenshot Casablanca Maârif 390×844 du Lot 8 sert de référence directe avant Lot 9.

## Succès

1. un moteur d'agrégation commun aux villes phares existe ;
2. il réutilise la vérité Geo/Search observée ;
3. Prix et Annonces sont calculés automatiquement par quartier ;
4. Densité reste fail-closed sans aire admissible ;
5. Rabat conserve son expérience certifiée et son moteur existant reste compatible ;
6. les trois modes sont adressables dans l'URL ;
7. le changement de mode ne perd ni ville ni quartier ;
8. mobile 390/430 et tablette/desktop 768/1280 restent sans overlap ;
9. tests moteur/API/navigation + TypeScript/build + audits Map passent ;
10. score visuel de la couche Lot 9 >= 9,8/10 avant fermeture.

## Preuve attendue

- tests unitaires sur médiane, dédoublonnage, fail-closed densité et échelle ;
- test API sur modes et paramètres invalides ;
- capture after aux mêmes quatre viewports ;
- comparaison baseline Lot 8 / mockup / after Lot 9 ;
- CI exact-head.

## Hors scope Lot 9

- généralisation des polygones et heatmap complète : Lot 10 ;
- fiche quartier intelligence complète, tendances historiques et certification finale : Lot 11 ;
- aucun déploiement Vercel sans autorisation explicite.
