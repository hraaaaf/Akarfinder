# Vivre Ici — Stadium pass LOT 02 — Stade Larbi Zaouli

Date: 2026-09-19
Branch: `feat/vivre-ici-stadiums-lot-02`
Base: reconciled district branch `feat/vivre-ici-district-reconciliation`

## Result

**RETAIN — Stade Larbi Zaouli → canonical Hay Mohammadi.**

The district dependency is deliberate: Hay Mohammadi was promoted as a map-eligible canonical district only after the district-reconciliation evidence pass. This stadium lot therefore does not invent or duplicate a parent identity.

## Evidence

1. CAF stadium page explicitly says Stade Larbi Zaouli is in Hay Mohammadi, Casablanca.
2. CAF competition article independently repeats the Hay Mohammadi attachment.
3. Mapcarta / OpenStreetMap identifies the stadium footprint at **33.59738, -7.54650** (OSM way 38751488).
4. Wikidata corroborates the stadium identity and a nearby coordinate.

Point used by AkarFinder: **33.59738, -7.54650** with `verified_landmark_point` precision.

## AkarFinder notoriety score — 96/100

- Public visibility: **20/20** — major Casablanca football venue and CAF competition stadium.
- Orientation value: **20/20** — large fixed urban facility, excellent map landmark.
- Local anchoring: **20/20** — CAF explicitly names Hay Mohammadi twice; canonical parent is independently reconciled.
- Visual singularity: **18/20** — recognizable oval stadium footprint / stands; less architecturally singular than Mohammed V.
- Source reliability: **18/20** — CAF + independent OSM-backed point + Wikidata corroboration; no single official operator page with precise GPS used.

Total: **96/100**.

## Visibility / collision

`minZoom=13.4`, `retainPriority=true`. Existing Vivre Ici priority/collision machinery remains authoritative. No bespoke rendering bypass is introduced.

## Mini-illustration target

Semi-figurative simplified Larbi Zaouli stadium: elongated oval bowl, open central pitch, segmented grandstand rhythm and restrained floodlight silhouettes. No club crest, no text, no generic football-ball pictogram, no photorealism. Preserve the existing AkarFinder landmark palette, stroke weight and small-marker legibility.

## Guardrails

- 0 Supabase write
- 0 business-data mutation
- 0 ranking change
- 0 merge
- 0 deploy
