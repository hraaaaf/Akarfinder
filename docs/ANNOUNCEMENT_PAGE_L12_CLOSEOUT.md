# ANN-L12 — Mon Projet personnalisé — Closeout

## Statut

**CLOSED sous réserve du merge documentaire de ce closeout.**

## Runtime certifié

- PR runtime : **#784**
- exact head certifié : `ce3de79624bcb9399f4a74badcb61657a37ad239`
- merge runtime (squash) : `71cbb81cfab9524adbd1720eb99713ac88545ff3`
- gate dédié : `Announcement Page L12 Mon Projet Personalise`
- run exact-head : **`32055350357` — SUCCESS**
- artefact : **`9296337960`**
- digest : **`sha256:d5acf9028fd499ab83bb998d12068cb1a19cda8043d8565787bab2c7e483b015`**

## Preuve fonctionnelle

- **41/41 tests PASS** sur profil, destinations, Property Fit, routage personnel et continuité ;
- TypeScript : **SUCCESS** ;
- production build : **SUCCESS** ;
- `project_id` conservé de `/search` vers les fiches internes uniquement ;
- lecture du projet owner-scoped ;
- aucune personnalisation sans projet explicite ;
- destinations stockées dans `DynamicSearchProfileV2.location.anchors`, sans profil parallèle ;
- Property Fit déterministe : inconnu non compté, mismatch explicite, score global seulement avec au moins deux dimensions évaluables ;
- trajets marche/voiture uniquement depuis une origine `ExactGeoTruth` avec preuve `RoutingProvider` fraîche ; sinon aucune minute inventée.

## Preuve visuelle

Rapport : `ANNOUNCEMENT_PAGE_L12_MON_PROJET_VISUAL_V3_RESPONSIVE_TARGET`.

- scénarios : **6** ;
- captures : **6/6** ;
- findings : **0** ;
- HTTP inattendu : **0** ;
- console errors : **0** ;
- overflow : **0** ;
- H1 : **1** ;
- main : **1** ;
- une seule carte Mon Projet visible par viewport ;
- desktop 1280 : Mon Projet dans le rail droit sous Pro / conversion ;
- mobile/tablette : Mon Projet dans le flux et pas de rail desktop visible ;
- sans projet : carte absente.

Revue humaine finale :

- mobile : **9,3/10** ;
- desktop : **9,5/10**.

L13 reste responsable de la convergence globale de toute la fiche vers **≥ 9,5/10** sur le target canonique.

## Target visuel canonique

Référence normative : `docs/ANNOUNCEMENT_PAGE_CANONICAL_VISUAL_TARGET.md`.

Desktop :

`Pro / conversion → Mon Projet → Marché & comparables`

Mobile/tablette : personnalisation compacte dans le flux, sans collision avec le dock.

## Progression

- avant L12 : **89 / 100 %** ;
- crédit L12 : **+5 %** ;
- après closeout documentaire et merge : **94 / 100 %** ;
- prochain lot : **ANN-L13 — Certification 10/10 — 6 %**.

Aucun déploiement Vercel n’a été effectué.
