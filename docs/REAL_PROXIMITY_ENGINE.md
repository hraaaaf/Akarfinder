REAL-PROXIMITY-ENGINE-1 — Documentation
========================================

## Architecture

### Fichiers créés

```
lib/proximity/
  proximity-types.ts          # Types unifiés (RealProximityProfile, RealPoiItem, etc.)
  neighborhood-centroids.ts   # Coordonnées GPS ~15 quartiers marocains
  proximity-confidence.ts     # Haversine, distanceToConfidence, findNearestCentroid
  proximity-format.ts         # formatWalkingLabel, minutesToQualitative, disclaimers
  proximity-engine.ts         # computeRealProximityProfile() + inferProximityInput()
```

### Fichiers modifiés

```
components/listings/ProximityBlock.tsx  # Accepte RealProximityProfile (nouveau format)
components/listings/ListingDetail.tsx   # Appelle computeRealProximityProfile()
package.json                            # Test suite étendue
```

---

## Niveaux de confiance

| Location Precision | Basis             | Confidence | Minutes affichées ? |
|--------------------|-------------------|------------|---------------------|
| exact_gps          | exact_gps         | high/med/low selon distance au centroïde | Oui si high (<500m) |
| district           | district_centroid | medium     | Non (qualitatif)    |
| city               | city_only         | low        | Non (qualitatif)    |
| unknown            | unknown           | low        | Non                 |

### Distance → confidence (GPS mode uniquement)

- < 500m du centroïde de quartier → `high` → `~X min à pied (estimation)` affiché
- 500m–2km → `medium` → labels qualitatifs
- > 2km → `low` → labels qualitatifs
- > 5km de tout centroïde → dégradation vers district ou ville

---

## Sources acceptées pour afficher des minutes

- `gps_computed` : listing avec GPS exact, distance Haversine < 500m d'un centroïde connu
- `osm_static` avec confidence `high` : héritage du dataset OSM, conservé dans ProximityBlock legacy

### Sources qui ne génèrent JAMAIS de minutes exactes

- `osm_static` en mode ville seulement (city_only)
- `osm_static` en mode quartier (district_centroid)
- `unknown`
- Tout NearbyPlace DB sans champ source (neutralisé par sanitizeNearbyPlaceTime)

---

## Labels qualitatifs (minutesToQualitative)

```
≤ 5 min  → "à proximité"
6–10 min → "dans le secteur"
11–15 min → "accessible"
> 15 min → "à vérifier"
```

---

## Wording interdit

- "vérifié"
- "certifié"
- "exact"
- "données officielles"
- "temps garanti"

---

## Disclaimer obligatoire

Toujours présent dans `profile.disclaimer` :

- Mode GPS : "Repères indicatifs à confirmer selon l'adresse exacte. Estimation basée sur localisation GPS et données cartographiques."
- Mode quartier/ville : "Repères indicatifs à confirmer selon l'adresse exacte."

---

## Données POI

Source unique : `morocco-proximity.ts` — dataset statique dérivé d'OpenStreetMap.

- Aucun appel Overpass en production
- Centroïdes de quartiers dans `neighborhood-centroids.ts` (précision ±500m)
- 15 quartiers couverts : Finance City, Maârif, Bouskoura, Hay Riad, Agdal, Hassan,
  Malabata, Ville Nouvelle (Tanger), Guéliz, Hivernage, Route Ourika,
  Founty, Talborjt, Ville Nouvelle (Fès), Fès el Bali

---

## Limites actuelles

1. Centroïdes à ±500m — précision suffisante pour estimation quartier
2. POI OSM non mis à jour en temps réel — snapshots 2023-2025
3. Pas de POI GPS individuels — distances calculées depuis le centroïde, pas le POI
4. Seulement 6 villes principales couvertes en mode "neighborhoods"

## Prochaines étapes possibles

- Importer dataset OSM Maroc complet avec coordonnées POI individuelles
- Permettre `distance_meters` réels via Haversine listing → POI
- Ajouter plus de quartiers dans `neighborhood-centroids.ts`
- Source future : `source: "overpass_live"` pour données temps réel (requiert clé)
