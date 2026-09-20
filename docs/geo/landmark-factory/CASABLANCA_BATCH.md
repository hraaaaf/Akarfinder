# Casablanca Landmark Factory batch manifest

Status: authoring manifest only. No network call at application runtime.

## Execution order
The batch runner must call `rankCityDistrictsForDiscovery("casablanca")`. This derives the order from the canonical neighborhood registry and current verified landmark counts instead of maintaining another handwritten neighborhood list.

For each district:
1. Read a committed boundary cache record if present.
2. If missing, resolve **one** district boundary deliberately and cache it.
3. Query selected POI classes for that boundary.
4. Independently re-check every returned POI with point-in-polygon.
5. Collapse same-name near duplicates.
6. Remove existing registry names/aliases.
7. Apply the heuristic shortlist only to reduce noise.
8. Human/editorial source verification produces the final AkarFinder five-dimension score. Nothing is promoted automatically.

## Public OSM service guardrail
The public Nominatim instance is **not** a bulk POI source and must not be used to systematically download Casablanca. Its policy caps heavy use, requires an identifying User-Agent/Referer and caching, and forbids systematic POI harvesting. Therefore this repository deliberately does not contain a script that loops through Casablanca against public Nominatim.

For a one-off Casablanca acquisition, use one of:
- a deliberately rate-limited/cached boundary lookup for the small canonical district set, only where permitted;
- an OSM regional extract processed locally;
- a self-hosted or commercial OSM/Nominatim provider.

Overpass may be used for selected read-only POI extraction, sequentially and conservatively, with caching; large/regular extraction should use regional extracts/self-hosting.

## Evidence outputs
When acquisition is performed, commit immutable authoring evidence under:
- `docs/geo/landmark-factory/evidence/boundaries/casablanca/`
- `docs/geo/landmark-factory/evidence/poi/casablanca/`

Each promoted landmark still needs independent primary/secondary editorial sources. OSM proves geography; it does not prove landmark importance.

## Non-goals
No Supabase writes. No listing/business mutation. No ranking changes. No production runtime dependency on Nominatim or Overpass. No automatic merge/deploy.


## Offline source selected
Geofabrik publishes a Morocco-wide `morocco-latest.osm.pbf` suitable for Osmium and related tooling. The discovery path therefore has a concrete bulk-safe source without calling Nominatim/Overpass in application runtime.

Offline extractor:
- `scripts/landmarks/extract-osm-pbf.py`
- reads a local Morocco PBF;
- limits work to a caller-supplied Casablanca bbox;
- emits only named high-signal POI nodes as JSONL;
- intentionally refuses to invent centroids for ways/relations. A later area/centroid pass must compute those from geometry.

The PBF itself is **not committed** to Git. Evidence derived from it must record the source URL/date and OSM object IDs.
