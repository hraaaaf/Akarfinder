# ANN-L7 — Street Reality — Closeout

## Statut

**CLOSED** après merge runtime exact-head, certification déterministe et réconciliation documentaire.

## Runtime

- PR runtime : **#749**
- exact head certifié : `d46ba0dde69bb7c183998deb08f3ff96c4a780be`
- merge squash : `737e490efbe671920f63f1b22e2591934fc28d27`

## Preuves exact-head

Workflow dédié `Announcement Page L7 Street Reality` :

- run : `31950387903`
- conclusion : **SUCCESS**
- tests : **64/64 PASS**
- TypeScript : **PASS**
- production build : **PASS**
- Chromium ciblé : **8/8 captures, 0 finding**
- artefact : `9264498215`
- digest : `sha256:e3e160b3074d1f1ac725f87e433e721fe6227ed9e0eaf01777dce6f7e47abb00`

## Contrat livré

- `StreetRealityModel` fail-closed séparé du React ;
- origine `exact` ou `neighborhood_centroid` seulement ; city-centroid/unknown masqués ;
- seuil public explicite : **250 m exact / 600 m quartier** ;
- distance capture→point de référence réellement calculée ;
- preuve provider attribuable et fraîche, TTL ≤24 h ;
- `MapillaryStreetImageryProvider` derrière l'abstraction `StreetImageryProvider` ;
- endpoint et access token server-only, aucun `NEXT_PUBLIC_*MAPILLARY*` ;
- bbox bornée + re-filtrage Haversine côté AkarFinder ;
- asset rejeté sans coordonnée valide, auteur, viewer/thumbnail utilisable ou s'il dépasse le rayon ;
- attribution visible Mapillary + auteur de capture ;
- UI publique : **Vue de rue à proximité**, jamais présentée comme photo du logement ;
- état indisponible masqué proprement, aucun fallback inventé ;
- wiring réel `/listings/[id] → AnnouncementPageShell → PropertyDetailV2 → StreetRealitySection` ;
- fixture QA déterministe : exact / contexte quartier / fallback sans thumbnail / hidden.

## Limite externe conservée

Aucune couverture live Mapillary n'est revendiquée sans credential de certification accessible. Le connecteur GitHub n'autorise pas la lecture/liste des secrets du dépôt. L'adapter est credential-ready et le contrat API/auth a été vérifié, mais cette absence de preuve live reste explicitement une **absence de preuve**, pas un succès implicite.

Les URLs de miniatures provider restent éphémères et ne sont pas persistées par la surface UI.

## Anomalies rencontrées et corrigées

1. L'orchestrateur de test utilisait une horloge déterministe alors que l'adapter horodatait ses preuves avec l'heure système. La preuve devenait donc future et le modèle tombait correctement en `hidden`. Correction : une seule horloge propagée de l'orchestrateur au provider, au failover et au modèle.
2. Un gate transversal `P0 DATA M1-M4` a échoué au build uniquement sur le fetch Google Fonts après ses tests + TypeScript verts. Le workflow L7 exact-head a, lui, produit un production build complet vert sur le même code.

## Comptabilité

- poids ANN-L7 : **6 %**
- progression précédente : **54 %**
- progression après closeout : **60 %**
- prochain chemin critique : **ANN-L8 — Marché & comparables**
