# ANNOUNCEMENT-PAGE-ULTRA-PREMIUM — ANN-L5 Provider Bake-off

**Lot : ANN-L5 — Geo Foundation**  
**Date de vérification documentaire : 2026-08-16**  
**Statut : ✅ CLOSED — exact-head live certifié**

## Résultat certifié

- exact head : `7cc3b5e2daee88adf2dfce5c0b3298554a932913` ;
- merge runtime : `b44bd5d04299a18e778f7e42251cdcb07b364a77` ;
- gate statique exact-head : run `31943466077` — **SUCCESS** ;
- live exact-head : run `31943502557` — **SUCCESS** ;
- tests : **139/139 PASS** ; TypeScript : **PASS** ;
- artefact : `9262665086` ;
- digest : `sha256:72268cfebb277208ff8ec7b5789ff1d9ac3df297b32a1630f929a788586cfd94` ;
- **32/32 POI réels**, 8 par ville ;
- **8 catégories par ville** ;
- **224/224 paires routables = 100 %** ;
- Rabat / Casablanca / Marrakech / Tanger : chacune 8 POI, 8 catégories, 56/56 routes.

Les tentatives précédentes ayant rencontré HTTP 429/504 Overpass restent des preuves historiques de fragilité des endpoints communautaires. Elles ne sont pas masquées et ne remettent pas en cause le run final, exécuté sur le même SHA exact que le runtime mergé.

## Objectif

Comparer les options de fondation géographique sans confondre service public de démonstration/communautaire, provider commercial credentialed et moteur open source auto-hébergé. Aucun endpoint public communautaire n'est autorisé comme dépendance production par défaut dans ANN-L5.

## Contrat de vérité, fraîcheur et cache ANN-L5

- une origine `exact` exige des coordonnées finies/in-range, `geo_precision=exact` et une source compatible (`scraped_coordinates` ou `manual_import`) ;
- un centroïde n'est accepté qu'en `context_only` avec un couple précision/source cohérent ; tout couple contradictoire est `unavailable` ;
- toute preuve provider doit porter `fetchedAt`, `expiresAt`, `providerId` et une attribution non vide ;
- le `providerId` de la preuve doit correspondre à l'adapter réellement exécuté ;
- une preuve future, expirée, sans `expiresAt` ou dont `expiresAt - fetchedAt > 24 h` est invalide ;
- le cache runtime `ephemeral` est plafonné à **86 400 secondes** ; `no_store` impose `0` ;
- une persistance n'est possible que sous une policy explicitement `provider_defined` compatible avec les droits fournisseur ;
- une règle fournisseur plus stricte reste prioritaire.

## Décision d'architecture

1. **Provider-neutral obligatoire** : aucun nom fournisseur dans la surface React de la fiche.
2. **Sélection runtime réversible** via `AKAR_GEO_*_PROVIDERS`.
3. **GeoTruth fail-closed** : aucune promotion d'un centroïde ou d'une source contradictoire vers `exact`.
4. **Preuve provider liée à l'adapter** : mismatch = `invalid_evidence` + failover.
5. **Fraîcheur fail-closed** : preuve future, expirée, sans expiration, sans attribution ou >24 h = inutilisable.
6. **Cache** : `ephemeral <= 24 h`, `no_store = 0`, persistance uniquement sous policy valide.
7. **Routing / isochrone** : origine `ExactGeoTruth` uniquement.
8. **Nominatim / Overpass / OSRM publics** : benchmark-only, jamais SLA production.
9. **Production** : choix concret volontairement laissé réversible et non simulé sans credentials/contrat compatibles.

## Limites assumées

- aucun résultat Mapbox/Google/Mapillary n'est inventé sans credentials ;
- le bake-off certifie la fondation et la faisabilité Maroc, pas un SLA de production ;
- ANN-L6 reste responsable du vrai module `Vivre ici` et de son routing produit.

**ANN-L5 est fermé techniquement. Crédit programme : +9 %, progression cumulée : 42 / 100 %. Prochain lot : ANN-L6 — Vivre ici.**
