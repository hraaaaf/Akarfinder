# Vivre Ici — Landmark Factory LOT 05 — Bouskoura

Date: 2026-09-20

## Existing registry check

Bouskoura currently has one canonical verified landmark in the runtime registry: **Forêt de Bouskoura** (96/100). It is not duplicated.

## Candidates audited

### RETAIN — Casa Green Golf Club — 93/100

- Public visibility: **18/20**
- Orientation value: **19/20**
- Local anchoring: **19/20**
- Visual singularity: **18/20**
- Source reliability: **19/20**

**Total: 93/100.**

Primary / institutional evidence:
- Fédération Royale Marocaine de Golf: Casa Green Golf is in the centre of Green Town and adjacent to the Bouskoura forest; address Casa Green Town – Route de Sidi Messaoud.
- ONMT golf brochure independently describes Casa Green Golf at Casa Green Town, at the edge of the Bouskoura forest.
- CDG Développement confirms Casa Green Town is at the entrance to Bouskoura Ville Verte and is centred around an 18-hole golf course.

Geolocation corroboration:
- OSM/Mapcarta footprint: **33.48904, -7.59036** (OSM way 466538204).
- Independent golf mapping: 33.490405, -7.598898. The OSM course footprint point is retained because it directly identifies the named course geometry.

Runtime target:
- parent: `district_casablanca_bouskoura`
- slug: `casa-green-golf`
- point: `33.48904, -7.59036`
- precision: `verified_landmark_point`
- visibility: `minZoom=13.7`, `retainPriority=true`
- category: `other`

Illustration target: semi-figurative golf amphitheatre with two sweeping fairway ribbons, a small lake edge, bunker cuts and the low modern clubhouse silhouette; recognizable through landscape geometry, **no generic golf-ball/flag pictogram**, no logo, no photorealism.

### REJECT — Gare de Bouskoura — 78/100

Useful orientation value, but current accessible evidence is mostly directory/Waze-level and the available address labelling (`CENTRE NOUACEUR`) creates avoidable territorial ambiguity for this strict pass. Below the quality bar for a new illustrated landmark.

### HOLD — Bouskoura Park

Primary site and independent 2026 press confirm the project in Bouskoura Ville Verte, opposite Casa Green Golf. However the resort is newly launched / under development; it is not yet a stable public landmark. Do not add now.

## Collision / progressive appearance

Casa Green Golf uses the existing landmark collision engine. `minZoom=13.7`, retained priority because its 93 score and large footprint make it a strong orientation landmark. No bespoke renderer or ranking change.

## Registry integration status

The candidate is fully certified in this lot, but **runtime registry mutation is intentionally deferred in this commit**: the current base registry contains duplicated blocks and the connector requires full-file replacement. A blind replacement would risk amplifying or deleting unrelated entries. Integration must be a narrow, byte-complete patch after registry deduplication / safe edit path is available.

## Guardrails

0 Supabase; 0 business-data mutation; 0 ranking change; 0 merge; 0 deploy.
