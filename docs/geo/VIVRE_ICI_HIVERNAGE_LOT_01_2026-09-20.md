# Vivre Ici — Marrakech / Hivernage — LOT 01 — 2026-09-20

## Result
Priority canonical district: `marrakech/hivernage`, selected as an under-enriched canonical district after registry/backlog review.

### RETAIN — Palais des Congrès de Marrakech — 97/100
Primary/institutional evidence: Visit Marrakech MICE identifies the Palais des Congrès, its 5,600 m² program and Boulevard Mohammed VI address. CNT independently identifies it at Avenue Mohammed VI, Hivernage and documents its role since 1989. Independent venue sources also explicitly place it in Hivernage.

Verified representative point: **31.62441, -8.01354** (independent GPS corroboration around 31.62460,-8.01411). This is a building/venue point, not a fabricated doorway coordinate.

AkarFinder notoriety score:
- Public visibility: 20/20
- Orientation value: 20/20
- Local anchoring: 20/20
- Visual singularity: 18/20
- Source reliability: 19/20
- **Total: 97/100**

Map target: `minZoom=13.3`, `retainPriority=true`; existing progressive zoom/collision engine remains authoritative.

Mini-illustration target: simplified semi-figurative monumental conference-palace frontage: long ochre/cream horizontal mass, strong central portal, repeated Moroccan arcade/geometric rhythm and broad forecourt. No text, logo, generic conference pictogram or photorealism.

### RETAIN — Casino de Marrakech / Es Saadi — 94/100
Primary/operator evidence: Es Saadi states that its resort is in the heart of the Hivernage neighbourhood. The Casino's own Marrakech Poker material gives Rue Ibrahim El Mazini, Hivernage and records the casino as opened in 1952. Independent OSM-backed mapping fixes Casino de Marrakech at **31.62145, -8.00487**.

AkarFinder notoriety score:
- Public visibility: 19/20
- Orientation value: 19/20
- Local anchoring: 20/20
- Visual singularity: 18/20
- Source reliability: 18/20
- **Total: 94/100**

Map target: `minZoom=13.6`, `retainPriority=true`; existing collision engine remains authoritative.

Mini-illustration target: simplified semi-figurative mid-century Es Saadi casino frontage nested in a restrained garden silhouette, emphasizing the low elegant facade/entrance canopy rather than gambling symbols. No cards, roulette icon, logo, text or photorealism.

## Duplicate / candidate filter
- **Menara Mall**: already present in the verified landmark lineage for Hivernage; no duplicate.
- No third candidate is promoted merely to fill quota.

## Sources
- https://mice.visitmarrakech.com/listing/palais-des-congres-de-marrakech/
- https://www.cnt.ma/blog/palais-congres-marrakech-mice-excellence
- https://purelifeexperiences.com/venues/
- https://www.essaadi.com/acces-contact/
- https://marrakechpoker.com/salle/
- https://mapcarta.com/N7022500193

## Runtime insertion gate
This lot certifies the evidence and presentation targets only. The shared runtime registry is not blindly replaced: recent factory runs established that connector retrieval can be truncated and whole-file replacement is unsafe. Runtime insertion requires a byte-complete/narrow safe patch path plus regression tests.

## Guardrails
0 Supabase; 0 business-data mutation; 0 ranking; 0 merge; 0 deploy.