# Carte des quartiers premium — Lot 8 extension aux cinq autres villes

Statut : **FERMÉ — CERTIFIÉ 9,8/10**  
Date : 2026-08-18  
Branche : `agent/carte-quartiers-premium-lot8-rollout-multivilles`  
HEAD code certifié : `5efcbc8c0105eff168d4271f6f6b749b8fd92471`

## Goal

Étendre l’expérience premium validée sur Rabat à Casablanca, Marrakech, Tanger, Agadir et Fès sans inventer de géométrie, de métriques ou de provider, tout en conservant une page finale réellement fidèle au mockup V2 validé.

## Résultat validé

- les cinq villes utilisent les contrats communs du Lot 7 ;
- les villes sans provider restent fail-closed ;
- Rabat reste l’unique provider `rabat-market-intelligence` ;
- Casablanca reste explicitement OSM `shadow`/canary ;
- Map → Search conserve `city + district` ;
- desktop : toolbar premium unique, six villes phares, carte dominante et fiche quartier ;
- mobile sélectionné : viewport carte `min(100vw, 430px)` réellement map-first ;
- fiche compacte placée sous le carré, sans masquer MapLibre ;
- fiche compacte mesurée à **216 px** sur 390/430, sous le gate de 230 px ;
- aucun KPI Densité / Volume n’est inventé avant les lots dédiés ;
- build, Geo/Search/Map, responsive, a11y et UI globale sont verts.

## Preuves exactes

- baseline pré-Lot-8 depuis `9b753afd9260891b82fd1ccbdb2d6d1b49b48816` sur 390×844, 430×932, 768×900, 1280×900 ;
- `Carte Lot 8 Casablanca Visual After` run `32191926598` : **success** ;
- artefact Casablanca After `9344552509`, digest `sha256:0fabc5dcd9b0623a24cad3a61b311b0e5dd230637656dfd4ec45f36f51b74508` ;
- `Carte Lot 8 Multi-city Browser` run `32191926748` : **success** ;
- artefact multi-villes `9344551199`, digest `sha256:d888aba6e9a81ab88760e53183a0d04021e83dc8efbc5f007c3a8b26f3753af6` ;
- `P1A.6 Responsive Hardening` `32191926534` : **success** ;
- `P1B.1 AkarFinder Map Visual Layer` `32191926502` : **success** ;
- `Phase 1 P1 Geo Productization Gate` `32191926590` : **success** ;
- `Phase 1 Final Design Accessibility Gate` `32191926642` : **success** ;
- `Carte C7 Final Certification` `32191926545` : **success** ;
- `UI All Pages Certification` `32191926506` : **success** ;
- P0/P1/P2 et UX contracts : **success** ;
- audit humain baseline / mockup V2 / after : **9,8/10 pour la structure Lot 8**.

## Readiness par ville

| Ville | Explore canonique | Géométrie dédiée prouvée | Intelligence marché dédiée | Décision Lot 8 |
|---|---:|---:|---:|---|
| Casablanca | Oui | Oui, OSM shadow/canary | Non | Territorial expérimental + générique |
| Marrakech | Oui | Non certifiée | Non | Fail-closed |
| Tanger | Oui | Non certifiée | Non | Fail-closed |
| Agadir | Oui | Non certifiée | Non | Fail-closed |
| Fès | Oui | Non certifiée | Non | Fail-closed |

## Référence visuelle et corrections retenues

Le mockup V2 Rabat reste la référence : grande carte dominante, surfaces blanches, bleu marine/électrique, bordures fines, ombres légères, contrôles compacts et une seule couche d’interaction primaire.

Corrections validées :

1. suppression de l’empilement mobile/tablette ;
2. vrai viewport carte quasi carré sur mobile ;
3. fiche quartier compacte sous la carte ;
4. toolbar desktop rapprochée du shell premium Rabat ;
5. audits durcis pour exiger de vraies tuiles OpenFreeMap rendues avant capture ;
6. fiche mobile ramenée de 264 px à 216 px sans supprimer le CTA Search ni les informations essentielles.

## Gate Lot 8 — résultat

1. Rabat seul provider intelligence marché : ✅
2. Casablanca shadow/canary conservé : ✅
3. aucune activation fictive Marrakech/Tanger/Agadir/Fès : ✅
4. before + after mêmes viewports : ✅
5. 10 captures multi-villes avec fonds réellement rendus : ✅
6. overlap mobile/tablette absent : ✅
7. score structure >= 9,8/10 : ✅ **9,8/10**
8. exact-head Map/Search/Geo/UX/TS/build/a11y : ✅
9. roadmap canonique mise à jour : ✅

## Suite

Le Lot 8 ferme la **structure premium multi-villes**. La cible globale 10/10 de la Carte intelligence marché reste à atteindre avec les Lots 9 à 11 :

- Lot 9 : Prix / Densité / Volume d’annonces ;
- Lot 10 : heatmap + intensités + quartiers ;
- Lot 11 : fiche quartier intelligence + certification finale.

Aucun déploiement Vercel sans autorisation explicite.
