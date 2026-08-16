# ANNOUNCEMENT-PAGE-ULTRA-PREMIUM — ANN-L5 Provider Bake-off

**Lot : ANN-L5 — Geo Foundation**  
**Date de vérification documentaire : 2026-08-16**  
**Statut : EN COURS — métriques live exact-head à injecter après certification**

## Objectif

Comparer les options de fondation géographique sans confondre :

1. **service public de démonstration / communautaire** ;
2. **provider commercial credentialed** ;
3. **moteur open source auto-hébergé**.

Aucun endpoint public communautaire n'est autorisé comme dépendance production par défaut dans ANN-L5.

## Bake-off live exact-head

Le workflow `Announcement Page L5 Geo Foundation` exécute les contrats statiques et TypeScript à chaque PR/push pertinent. Le benchmark réseau live est volontairement isolé à une branche de certification pointant sur **le même SHA que le head final** :

`agent/announcement-page-l5-geo-certification`

Le live est borné :

- 4 villes : Rabat, Casablanca, Marrakech, Tanger ;
- 8 POI OpenStreetMap réels par ville ;
- **32 points minimum** ;
- **>= 4 catégories différentes par ville** ;
- au plus une requête Overpass réussie par ville ;
- fallback entre deux instances publiques globales documentées par OSM si la première refuse la requête ;
- 1 matrice OSRM par ville ;
- latence observée et connectivité routée enregistrées dans l'artefact CI ;
- seuil de sortie : 32 points minimum et ratio de paires routables >= 75 %.

Cette séparation évite de transformer un service public communautaire en dépendance de CI à chaque commit. Les métriques live ne sont jamais codées en dur dans ce document : elles proviennent uniquement de l'artefact du SHA certifié.

## Contrat de fraîcheur et cache ANN-L5

- toute preuve provider doit porter `fetchedAt`, `expiresAt`, `providerId` et une attribution non vide ;
- une preuve future, expirée, sans `expiresAt` ou dont `expiresAt - fetchedAt > 24 h` est invalide et provoque un fail-closed / failover ;
- le cache runtime `ephemeral` est plafonné à **86 400 secondes (24 h)** ;
- `no_store` impose un TTL de `0` ;
- une persistance n'est possible que sous une policy explicitement `provider_defined` compatible avec les droits du fournisseur ;
- ces plafonds AkarFinder n'élargissent jamais les droits contractuels d'un provider : une règle fournisseur plus stricte reste prioritaire.

## Candidats et contraintes documentées

| Candidat | Rôle | Auth / coût | Cache / stockage | Attribution / affichage | Décision ANN-L5 |
|---|---|---|---|---|---|
| OpenStreetMap + Overpass public | POI benchmark | service public communautaire ; pas de clé | ne pas traiter comme stockage/serveur production ; politique instance à respecter | attribution OSM requise pour les données réutilisées | **BENCHMARK ONLY** |
| OSRM demo `router.project-osrm.org` | routing benchmark | démo publique du projet OSRM | aucune dépendance production/SLA supposée | données OSM + moteur OSRM à attribuer selon intégration | **BENCHMARK ONLY** |
| OSRM auto-hébergé | routing | open source ; coût infra/opérations | contrôle AkarFinder | attribution OSM requise pour les données | **CANDIDAT PROD** |
| Overpass / stack OSM auto-hébergée ou provider OSM commercial | POI | infra ou contrat fournisseur | contrôle selon hébergement/contrat | attribution OSM/ODbL selon données et rendu | **CANDIDAT PROD** |
| Mapbox Search / Directions / Isochrone | POI/geocoding/routing/isochrone | token requis ; facturation par requête/usage | geocoding temporaire non stockable ; stockage permanent soumis au mode/contrat ; cache selon produit | contraintes d'attribution et, pour certains résultats de navigation/isochrone, affichage avec carte Mapbox | **CANDIDAT CREDENTIALLED, NON BENCHMARKÉ LIVE SANS SECRET** |
| Google Places / Routes | POI/routing | clé + billing ; pay-as-you-go par SKU | la plupart des contenus ne doivent pas être mis en cache hors exceptions documentées | attribution Google ; contraintes de rendu sur carte Google pour certains résultats | **CANDIDAT CREDENTIALLED, NON BENCHMARKÉ LIVE SANS SECRET** |
| Mapillary | street imagery | API/app credentials selon intégration | à traiter selon API/terms ; ANN-L7 portera la stratégie cache | images partagées sous CC BY-SA avec attribution ; libellé `Vue de rue à proximité` obligatoire côté produit | **CANDIDAT ANN-L7, PAS DE FAUX TEST SANS TOKEN** |
| Nominatim public OSMF | geocoding ponctuel | public, capacité limitée | requêtes répétées à mettre en cache ; bulk fortement contraint | attribution OSM ; service doit rester interchangeable | **NON RETENU POUR PIPELINE PROD** |

## Sources officielles vérifiées

- Overpass API / instances publiques et politique d'usage : https://wiki.openstreetmap.org/wiki/Overpass_API
- Nominatim public OSMF : https://operations.osmfoundation.org/policies/nominatim/
- OSRM backend / serveur de démo : https://github.com/Project-OSRM/osrm-backend
- OSRM HTTP API : https://project-osrm.org/docs/v5.24.0/api/
- Mapbox Geocoding : https://docs.mapbox.com/api/search/geocoding/
- Mapbox Directions : https://docs.mapbox.com/api/navigation/directions/
- Mapbox Isochrone : https://docs.mapbox.com/api/navigation/isochrone/
- Mapbox pricing model : https://docs.mapbox.com/accounts/guides/pricing/
- Google Maps Platform pricing : https://developers.google.com/maps/billing-and-pricing/pricing
- Google Places policies : https://developers.google.com/maps/documentation/places/web-service/policies
- Google Routes policies : https://developers.google.com/maps/documentation/routes/policies
- Mapillary API : https://help.mapillary.com/hc/en-us/articles/360010234680-Accessing-imagery-and-data-through-the-Mapillary-API
- Mapillary imagery licence/attribution : https://help.mapillary.com/hc/en-us/articles/115001770409-CC-BY-SA-license-for-open-data

## Décision d'architecture ANN-L5

1. **Provider-neutral obligatoire** : aucun nom fournisseur dans la surface React de la fiche.
2. **Sélection runtime réversible** : ordre piloté par `AKAR_GEO_NEARBY_PROVIDERS`, `AKAR_GEO_ROUTING_PROVIDERS`, `AKAR_GEO_ISOCHRONE_PROVIDERS`, `AKAR_GEO_STREET_IMAGERY_PROVIDERS`.
3. **Fail-closed** : preuve sans attribution, future, sans `expiresAt`, expirée ou dont le TTL dépasse 24 h = inutilisable ; panne provider = failover ordonné ; tous les providers indisponibles = état explicite `unavailable`.
4. **Cache** : `ephemeral <= 24 h`, `no_store = 0`, persistance uniquement sous policy `provider_defined` valide et jamais au-delà des droits fournisseur.
5. **Routing / isochrone** : origine typée `ExactGeoTruth` uniquement.
6. **Public OSM/OSRM** : utilisés pour le bake-off borné, jamais considérés comme SLA de production.
7. **Production** : préférer un adapter OSM/self-hosted ou credentialed dont les droits de cache/rendu sont compatibles avec la fiche AkarFinder. La décision finale de provider concret ne doit pas être simulée en l'absence de credentials et de mesure live.

## Human gate restant avant CLOSED

Aucun human gate produit n'est requis. Le lot reste techniquement ouvert jusqu'à :

- gate statique du head final vert ;
- branche de certification créée sur ce SHA exact ;
- live bake-off vert et artefact >= 32 points inspecté ;
- métriques live reportées dans le closeout ;
- merge runtime + closeout canonique + progression 42/100.
