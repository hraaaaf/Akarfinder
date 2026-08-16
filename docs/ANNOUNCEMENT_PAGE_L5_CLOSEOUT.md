# ANNOUNCEMENT-PAGE-ULTRA-PREMIUM — ANN-L5 Closeout

**Lot : ANN-L5 — Geo Foundation**  
**Statut : ✅ CLOSED**  
**Date : 2026-08-16**

## Résultat

ANN-L5 ferme la fondation géographique provider-agnostic de la page annonce sans modifier l'UI publique. La géographie exacte est désormais une autorité stricte, les centroïdes restent contextuels, les providers sont abstraits, les preuves sont attribuables/fraîches et le failover reste déterministe.

## Preuve runtime

- PR runtime : **#739 ✅ MERGED** ;
- exact head certifié : `7cc3b5e2daee88adf2dfce5c0b3298554a932913` ;
- merge runtime : `b44bd5d04299a18e778f7e42251cdcb07b364a77` ;
- gate statique : run `31943466077` — **SUCCESS** ;
- certification live : run `31943502557` — **SUCCESS** ;
- tests : **139/139 PASS** ; TypeScript : **PASS** ;
- artefact : `9262665086` ;
- digest : `sha256:72268cfebb277208ff8ec7b5789ff1d9ac3df297b32a1630f929a788586cfd94`.

## Bake-off Maroc

- Rabat : 8 POI / 8 catégories / 56 sur 56 routes ;
- Casablanca : 8 / 8 / 56 sur 56 ;
- Marrakech : 8 / 8 / 56 sur 56 ;
- Tanger : 8 / 8 / 56 sur 56 ;
- total : **32/32 POI réels** ;
- routing : **224/224 paires = 100 %**.

Nominatim, Overpass public et OSRM demo sont explicitement **benchmark-only**. Les erreurs historiques HTTP 429/504 Overpass sont conservées comme signal de fragilité d'un service communautaire et justifient l'absence de dépendance production implicite.

## Invariants verrouillés

- coordonnées absentes, invalides ou hors plage → `unavailable` ;
- `geo_precision=exact` exige une source compatible exacte ;
- couples précision/source contradictoires → `precision_source_mismatch` ;
- neighborhood/city centroid → `context_only`, jamais origine exacte ;
- `RoutingProvider` et `IsochroneProvider` exigent `ExactGeoTruth` ;
- preuve provider sans attribution, future, expirée, sans expiration ou >24 h → invalide ;
- `evidence.providerId` doit correspondre au provider réellement exécuté ;
- cache `ephemeral` ≤ 86 400 s ; `no_store=0` ; persistance seulement sous policy `provider_defined` valide ;
- aucun provider concret dans React ;
- `nearby_places.time` et anciens `walking_minutes` ne sont jamais élevés au rang de preuve de routing premium.

## Ce que ANN-L5 ne prétend pas

- aucun choix Mapbox/Google/Mapillary n'est simulé sans credentials ;
- aucun endpoint public benchmark n'est déclaré production-ready ;
- aucun temps de trajet public n'est encore ajouté à la fiche ;
- aucun POI premium n'est encore branché dans l'UI.

Ces responsabilités passent à ANN-L6.

## Comptabilité

- ANN-L0 : 4 % CLOSED ;
- ANN-L1 : 7 % CLOSED ;
- ANN-L2 : 7 % CLOSED ;
- ANN-L3 : 6 % CLOSED ;
- ANN-L4 : 9 % CLOSED ;
- ANN-L5 : 9 % CLOSED.

**Progression cumulée : 42 / 100 %.**

**Prochain chemin critique : ANN-L6 — Vivre ici.**
