# AkarFinder Product Experience — P4 Search + Carte

Date : 2026-08-21
Base : `main@9a1f4f696a2c5673978df556fae75c8a8afa7045`
Statut : **CERTIFIED — MERGED**

## Goal

Transformer Search + Carte en expérience immobilière territoriale AkarFinder, et non en simple carte générique de type Maps.

## Ce que P4 touche

- composition visuelle Search / Carte ;
- rendu cartographique et hiérarchie des informations territoriales ;
- proportions responsive 390×844 / 430×932 / 768×900 / 1280×900 ;
- desktop : carte dominante + rail de décision ;
- tablette/mobile : map-first + sheet persistante ;
- filtres, compteur, résultats et lentilles existantes ;
- traitement visuel MapLibre AkarFinder ;
- non-régression de la session P2.

## Ce que P4 ne touche pas

- ranking ;
- données et métriques sources ;
- DB / API métier ;
- ingestion / scrapers ;
- logo / branding ;
- règles de précision géographique ;
- déploiement Vercel.

## Références externes croisées avant mockup

1. Redfin — la carte immobilière reste liée à la recherche, aux listings et au contexte de zone ; elle n'est pas une surface cartographique isolée.
2. Mapbox — le fond cartographique immobilier doit être stylé pour le cas d'usage et laisser les couches métier / la marque dominer visuellement.
3. Material Design — une bottom sheet persistante peut garder la carte interactive sur mobile et se transformer en panneau latéral sur grand écran.

Implication AkarFinder : fond calme, données immobilières au premier plan ; desktop ≈ 60 % carte / 40 % contenu ; mobile/tablette map-first avec sheet persistante.

## BEFORE

La BEFORE Search / Carte réutilise la certification P2, car aucune modification runtime Search / Carte n'a été introduite entre P2 et la base P4.

- run P2 : `32417603234` — SUCCESS ;
- artifact : `9424543505` ;
- 12/12 captures ;
- 0 finding ;
- Search / Carte certifiées en 390 / 430 / 768 / 1280.

Finding visuel confirmé : la vue Rabat `RabatMarketIntelligenceExperience` chargeait le style OpenFreeMap mais n'appliquait pas `applyAkarFinderBasemapTreatment`, contrairement au renderer générique / Search. Le rendu restait donc trop proche d'un basemap standard.

## Mockup haute fidélité approuvé

Mockup préparé sur les quatre viewports exacts :

- 390×844 : carte dominante + sheet persistante ~208 px ;
- 430×932 : carte dominante + sheet persistante ~220 px ;
- 768×900 : carte + sheet persistante ~304 px ;
- 1280×900 : split ≈ 60/40 carte / rail de décision.

Principes :

- `Vue marché AkarFinder` ;
- fond cartographique atténué ;
- panneaux compacts, jamais de grande carte d'erreur au centre ;
- information truth-safe ;
- bottom sheet mobile / rail latéral desktop ;
- attribution cartographique conservée ;
- aucune valeur ou géométrie inventée dans le mockup.

Human gate du mockup : **APPROUVÉ par l'utilisateur le 2026-08-21**.

## Implémentation certifiée

- `SearchMapPanel` : canvas territorial plus calme, en-tête et intelligence compacte ;
- Search split : map-first sous 1024 px, rail résultats avec chevauchement de sheet ; 60/40 au desktop ;
- Carte : `P4MapDecisionRail`, bottom sheet responsive puis rail droit desktop ;
- Rabat : traitement MapLibre AkarFinder réellement appliqué à chaque `style.load` ;
- fail-closed central retiré visuellement du canvas P4, mais le contrat truth-safe reste visible dans le rail ;
- rich zone sheet conserve la priorité lorsque l'utilisateur sélectionne une zone ;
- aucune mutation de donnée, ranking ou navigation métier.

## Certification finale

Workflow `Product Experience P4 Search Map` :

- run final : `32466458488` — **SUCCESS** ;
- artifact AFTER : `9440932346` ;
- HEAD certifié avant merge : `33ef34355ae2222e192d87dc491c8c6cca033950` ;
- 8/8 captures exactes Search / Carte ;
- 0 finding ;
- test territorial P4 vert ;
- régression navigation P2 verte ;
- TypeScript vert ;
- build production vert ;
- MapLibre réel sur les quatre viewports ;
- desktop Search et Carte ≈ 60/40 ;
- sheets Carte : 208 / 220 / 304 px ;
- aucun overflow horizontal ;
- header exact-white et logo canonique préservés ;
- inspection BEFORE → mockup → AFTER effectuée ;
- score UX/UI final : **9,4/10** ;
- human gate final : **APPROUVÉ par l'utilisateur le 2026-08-21** ;
- aucun déploiement Vercel.

## Merge

- PR : `#833` — **MERGED** ;
- méthode : squash ;
- commit `main` : `df014a47ec04ec811eb60146ccf475dadc41cba5` ;
- `main` vérifié sur ce commit après merge.

## Succès final

Les 12 critères P4 sont prouvés. Le lot P4 est fermé. Le prochain chantier cartographique peut utiliser l'AFTER P4 comme BEFORE canonique.
