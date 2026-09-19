# Vivre Ici — Landmark Factory — 2026-09-20 00h

## Result

Priority target: **Hay Mohammadi**, a newly reconciled canonical map district with zero landmarks on the reconciliation base.

### RETAIN — Immeuble Nid d’Abeille

Canonical parent: `district_casablanca_hay_mohammadi`.

Verified point: **33.58321, -7.56426** (OSM way 307309389; independent local place index resolves the same named historic site at HCMP+792).

Evidence:
1. **Agence Urbaine de Casablanca — Plan d’aménagement de Hay Mohammadi** explicitly lists the 1953 `Immeubles Nid d’Abeille` among the arrondissement’s most notable architectural heritage and identifies the Carrières Centrales / Hay Mohammadi context.
2. **Mapcarta / OpenStreetMap** maps the named apartment building at 33.58321,-7.56426 and places it next to Sport Center Hay Mohammadi, Hay Mohammadi Market and Kissariat Hay Mohammadi.
3. Independent Moroccan/architectural reporting (Médias24; Le360/Casamémoire testimony) confirms Nid d’Abeille as one of the emblematic AT-BAT modernist housing blocks of Hay Mohammadi.

Sources:
- https://auc.ma/wp-content/uploads/2020/05/rapp-just-hay-moh001.pdf
- https://mapcarta.com/W307309389
- https://medias24.com/2024/04/08/le-casablanca-improbable-de-karim-rouissi-1-2/
- https://fr.le360.ma/culture/casa-des-sites-une-memoire-ep6-lepopee-de-hay-mohammadi-de-la-carriere-centrale-a-lutopie-urbaine_YO4HOG55YVDJ5MSZUCT22ER7CY/

### Severe AkarFinder score — 92/100
- Public visibility: 17/20
- Orientation value: 17/20
- Local anchoring: 20/20
- Visual singularity: 20/20
- Source reliability: 18/20

Decision: **verified and retained as the next registry candidate**. It is stronger as a territorial/visual landmark than the generic Carrières Centrales tram stop.

### REJECT / HOLD candidates
- **Carrières Centrales tram station** — real, well-localized and useful, but too generic visually for the current illustration doctrine; score estimated 82/100. Keep as navigation infrastructure, not a priority illustrated landmark.
- **Sémiramis** — historically strong and visually distinctive, but the automated search did not return a sufficiently unambiguous exact map point; HOLD until point-level verification.
- **Centre socio-éducatif Mouahiddine** — official Hay Mohammadi address but weak public notoriety/orientation value; reject for this lot.

## Map behavior target

For Nid d’Abeille: `minZoom=13.8`, `retainPriority=false`; collision engine remains authoritative. This deliberately lets higher-priority Hay Mohammadi landmarks such as Larbi Zaouli retain precedence once that dependent stadium lot is integrated.

## Mini-illustration target

Semi-figurative simplified elevation inspired by the honeycomb facade: stacked rectangular cells, alternating recessed patio voids and projecting slab rhythm, warm concrete mass, no text/logo, no generic building pictogram, no photorealism. Preserve AkarFinder landmark stroke weight and small-scale readability.

## Guardrails

- 0 Supabase write
- 0 business-data mutation
- 0 ranking change
- 0 merge
- 0 deploy

## Integration note

This run certifies the landmark evidence and target. The production registry is deliberately not mutated in this commit because the current connector exposes whole-file replacement only and the registry is a large shared file; a blind replacement from truncated retrieval would violate the no-regression rule. The safe next integration step is a narrow registry patch once an exact non-truncated edit path is available, followed by tests/CI.