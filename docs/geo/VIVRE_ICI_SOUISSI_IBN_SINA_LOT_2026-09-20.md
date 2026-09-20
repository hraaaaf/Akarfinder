# Vivre Ici — Souissi / Forêt Urbaine Ibn Sina — 2026-09-20

## Result
**RETAIN — Forêt Urbaine Ibn Sina (Forêt Hilton) → Souissi.**

Souissi is prioritized because its registry currently exposes Mega Mall as its only verified landmark in the inspected reconciliation baseline. Mega Mall is not duplicated.

## Evidence
1. Visit Rabat explicitly identifies Forêt Urbaine Ibn Sina / Forêt Hilton on Avenue Imam Malik, **quartier Souissi**, and describes a >60 ha urban forest.
2. Rabat Ville Verte independently documents the same Forêt Urbaine Ibn Sina / Hilton and its >60 ha footprint and public amenities.
3. Rabat Région Aménagement / Rabat Invest public procurement documentation describes the forest as a 56.5 ha Rabat urban forest with substantial public use.
4. OSM-backed Mapcarta identifies the park footprint (way 1278748285) centered around **33.98674, -6.84324**; a separate academic field-study point within the forest is 33.988120,-6.841816.

Verified map point retained: **33.98674, -6.84324**, precision `verified_landmark_point`.

## AkarFinder notoriety score — 94/100
- Public visibility: **19/20** — major 60 ha urban forest, heavily used public recreation space.
- Orientation value: **20/20** — large fixed green mass and locally familiar “Forêt Hilton” reference.
- Local anchoring: **20/20** — Visit Rabat explicitly says quartier Souissi; independent sources corroborate the same place.
- Visual singularity: **17/20** — strong wooded/lake identity but less architecturally unique than a monument.
- Source reliability: **18/20** — official tourism + city green-space/public-project material + OSM-backed geometry.

Total: **94/100**.

## Candidate filter
- **Forêt Urbaine Ibn Sina** — RETAIN 94/100.
- **Royal Golf Dar Es Salam** — HOLD for this lot: high notoriety, but Visit Rabat’s address is “Route des Zaers Souissi” while the golf is a very large peri-urban estate; do not collapse a road/address label into the canonical Souissi polygon without a stronger boundary proof.
- **Patinoire Mega Mall** — REJECT as separate landmark: nested inside already-registered Mega Mall, therefore duplicate spatial/product value.

## Illustration target
Semi-figurative simplified wooded canopy mass with a recognizable winding running path and small water/lake opening; a few tall eucalyptus/pine silhouettes create the local identity. No generic tree pictogram, no text, no photorealism. Preserve AkarFinder’s existing landmark palette, stroke weight and small-marker legibility.

## Zoom / collision
Target visibility: `minZoom=13.7`, `retainPriority=true`. Existing Vivre Ici collision/priority engine remains authoritative; no bespoke rendering bypass.

## Runtime integration status
The evidence lot is certified, but the large runtime registry is **not rewritten in this commit** because the connector timed out while requesting the required tail range. A full-file replacement without a verified byte-complete read is prohibited. This prevents accidental registry truncation. Integrate the entry only via a safe narrow/full-content patch on a later pass.

## Guardrails
- 0 Supabase
- 0 business-data mutation
- 0 ranking change
- 0 merge
- 0 deploy
