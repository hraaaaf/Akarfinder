# Carte C1A — Qualification des sources de géométrie

Date : 2026-08-15

Référentiel cible : `docs/CARTE_INTELLIGENCE_MARCHE_TARGET.md`.

## Objectif

Qualifier les sources qui pourront produire les zones visibles dans le mockup canonique avant toute création de polygone. C1A n’active aucune géométrie et n’autorise aucun choroplèthe.

## Doctrine fail-closed

Une zone Carte n’est publiable que si la chaîne suivante est prouvée :

`source primaire → type territorial exact → géométrie ou règle de délimitation reproductible → binding canonique → topologie → aire km² → publication canary`.

Interdictions :

- un point lat/lng ne devient jamais un polygone ;
- `map_eligible=true` ne vaut jamais preuve de géométrie ;
- un arrondissement ne peut pas être renommé en quartier ;
- aucune forme dessinée librement pour ressembler au mockup ;
- aucune zone issue d’une copie secondaire ne devient publique sans recoupement primaire.

## Sources qualifiées

### S1 — ANCFCC / DGI — Référentiel des valeurs vénales

URL primaire : `https://www.ancfcc.gov.ma/TestGVV_Principal`

Statut C1A : **PRIMARY_CANDIDATE — QUALIFIED FOR ZONING CONCEPT, GEOMETRY EXTRACTION NOT YET QUALIFIED**.

Faits vérifiés sur la source officielle :

- publication conjointe ANCFCC/DGI de prix de référence par zone et type de bien ;
- référentiel basé sur un découpage administratif ;
- présence annoncée d’un **Atlas de zoning** couvrant ressort urbain, périphérique et rural ;
- une zone est définie comme un territoire géographique délimité avec cohérence de prix et homogénéité de types de biens ;
- une zone peut aussi être linéaire lorsqu’elle correspond à un boulevard/avenue/rue.

Usage autorisé dans C1 : **chercher/exploiter les limites de zoning comme géométrie de marché si la carte/description officielle exacte est accessible et reproductible**.

Usage interdit : utiliser directement les valeurs fiscales ANCFCC comme notre `price_median_mad_m2`. Les valeurs officielles sont indicatives pour des droits/taxes et ne constituent pas une évaluation directe d’un bien. Nos métriques de marché restent issues de la couche AkarFinder certifiée.

Blocage actuel : le lien public de consultation détaillée renvoie actuellement une page indisponible dans notre environnement de vérification. Aucun polygone n’est donc extrait dans C1A.

### S2 — Agence Urbaine de Rabat-Salé — Géoportail

URL primaire : `https://aurs.org.ma/fr/lese-services/geoportail/`
Géoportail annoncé : `https://geoportail.aurs.org.ma`

Statut C1A : **PRIMARY_CANDIDATE — QUALIFIED FOR PLANNING/CONTAINER GEOMETRY, SUB-NEIGHBORHOOD EXTRACTION NOT YET QUALIFIED**.

Faits vérifiés sur la source officielle :

- mise en ligne de plans d’aménagement homologués de Rabat ;
- le plan de l’arrondissement **Agdal Ryad** est explicitement publié ;
- plans Hassan, Yaacoub Al Mansour, Youssoufia et Akrach également annoncés ;
- plateforme annoncée interactive avec interrogation de base et **interopérabilité des données**.

Usage autorisé : contrôler les enveloppes et documents d’urbanisme officiels ; rechercher un service interopérable exploitable pour les limites.

Limite importante : le plan **Agdal Ryad** ne prouve pas à lui seul deux polygones distincts `Agdal` et `Hay Riad`. Il s’agit d’abord d’une enveloppe de plan/arrondissement. Toute sous-zone doit avoir une preuve distincte.

Blocage actuel : le Géoportail direct expire lors de l’accès automatisé depuis notre environnement. Aucun WMS/WFS/GeoJSON n’est donc encore certifié.

### S3 — OpenStreetMap — limites administratives

Statut C1A : **SECONDARY_GEOMETRY_CONTEXT ONLY**.

Usage autorisé :

- validation d’enveloppes administratives ;
- réseau routier pour matérialiser une limite textuellement décrite par une source primaire ;
- contrôle de topologie/proximité.

Usage interdit : transformer l’arrondissement `Agdal-Ryad` en deux quartiers arbitraires `Agdal` et `Hay Riad`.

### S4 — Copies secondaires / anciens PDF du référentiel Rabat

Statut C1A : **DISCOVERY_ONLY**.

Des copies historiques découvertes hors domaine officiel suggèrent un zoning plus fin pour Rabat, y compris des zones nommées Agdal/Ryad/Souissi. Elles peuvent guider la recherche du document officiel, jamais servir de source finale de géométrie.

### S5 — données actuelles AkarFinder `lib/map/neighborhood-data.ts`

Statut C1A : **REJECTED_AS_POLYGON_EVIDENCE**.

Elles fournissent des repères lat/lng et des métadonnées de quartier. Elles restent utiles pour le centrage et la continuité de navigation, mais ne contiennent aucune limite polygonale.

## Matrice des quatre zones du mockup

| Zone mockup | Entité actuelle | État géométrique C1A | Source candidate | Verdict |
|---|---|---|---|---|
| Agdal | `Rabat / Agdal` validée, map eligible | point uniquement | ANCFCC zoning + AURS Agdal-Ryad | **BLOCKED — polygon source required** |
| Hay Riad | `Rabat / Hay Riad` validée, map eligible | point uniquement | ANCFCC zoning + AURS Agdal-Ryad | **BLOCKED — polygon source required** |
| Souissi | `Rabat / Souissi` validée, map eligible=false | aucune géométrie publique | ANCFCC zoning + source urbanisme officielle à confirmer | **BLOCKED — geometry + map eligibility review** |
| Rabat Centre | aucune entité canonique portant exactement ce nom | aucune | ANCFCC/AURS à qualifier | **BLOCKED — canonical definition required** |

## Décision C1A

Aucune des quatre zones du mockup n’est aujourd’hui autorisée comme heat-map polygon public.

Le chemin recommandé est :

1. obtenir le zoning officiel Rabat depuis ANCFCC/DGI ou un export interopérable AURS ;
2. vérifier s’il fournit des zones réellement distinctes couvrant Agdal, Hay Riad, Souissi et une zone centre défendable ;
3. si les limites sont décrites textuellement mais pas téléchargeables, construire un extracteur **déterministe** à partir des voies officielles + réseau routier OSM, puis faire une revue humaine/topologique ;
4. ne créer les bindings Registry qu’après cette preuve ;
5. calculer l’aire km² seulement après certification du polygone.

## Gate de sortie C1A

C1A peut être déclaré CLOSED quand :

- chaque source primaire est classée avec son rôle exact ;
- les raccourcis interdits sont machine-gardés ;
- les quatre zones cible ont un verdict explicite ;
- aucune géométrie n’a été inventée ou activée ;
- C1B possède une prochaine action exacte : **acquisition/extraction du zoning primaire Rabat**.
