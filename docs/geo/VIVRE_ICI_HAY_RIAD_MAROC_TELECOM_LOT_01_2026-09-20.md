# Vivre Ici — Hay Riad / Tour Maroc Telecom — LOT 01

Date: 2026-09-20

## Result
**RETAIN — Tour Maroc Telecom → Hay Riad — 97/100.**

The existing registry already contains Place Mahaj Riad, so it is not duplicated.

## Evidence
- Primary: Maroc Telecom's own public privacy/contact material gives `Avenue Annakhil, Hay Riad, Rabat` for Itissalat Al-Maghrib.
- Independent: Le360's inauguration report explicitly places the new Maroc Telecom tower in quartier Hay Riad and describes its distinctive architecture.
- Geolocation: OSM-backed Mapcarta identifies `way 280583428` at **33.95818, -6.87134** on Avenue Annakhil.

Sources:
- https://www.iam.ma/fr/groupe-maroc-telecom/politique-de-protection-de-la-vie-priv%C3%A9e
- https://fr.le360.ma/economie/inauguration-en-grande-pompe-de-la-tour-maroc-telecom-1025/
- https://mapcarta.com/fr/W280583428

## AkarFinder notoriety score — 97/100
- Public visibility: 20/20
- Orientation value: 20/20
- Local anchoring: 20/20
- Visual singularity: 20/20
- Source reliability: 17/20

## Rejected / not promoted
- **Bank Al-Maghrib Hay Riad**: real and well-addressed, but less visually singular and weaker as a public orientation landmark than the tower.
- Generic ministry/administration buildings around Avenue Annakhil: rejected as visually weak / redundant for this pass.

## Map behavior
- Point: **33.95818, -6.87134** (`verified_landmark_point`).
- Proposed visibility: `minZoom=13.3`, `retainPriority=true`; existing collision logic remains authoritative.

## Mini-illustration target
Semi-figurative simplified **two shifted glass prisms** rising from a low dark base, with the characteristic long upper cantilever / antenna silhouette. Preserve the existing AkarFinder stroke/palette language. No corporate logo, no text, no generic skyscraper pictogram, no photorealism.

## Runtime status
The canonical runtime registry was inspected and Mahaj Riad was detected. This run does **not** rewrite the runtime file because the connector returns the large file truncated; replacing it from incomplete bytes would create an unacceptable regression risk. The candidate is certified and ready for a narrow safe insertion once byte-complete editing is available.

## Guardrails
0 Supabase; 0 business-data mutation; 0 ranking; 0 merge; 0 deploy.
