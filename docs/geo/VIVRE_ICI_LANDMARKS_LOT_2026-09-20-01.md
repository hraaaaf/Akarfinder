# Vivre Ici — Landmark Factory — LOT 2026-09-20-01

## Result

Priority district: **Casablanca / Hay Mohammadi** (newly canonical, still under-rich).

### RETAIN — Anciens Abattoirs de Casablanca

The Agence Urbaine de Casablanca's Hay Mohammadi planning document identifies **Les Anciens Abattoirs** among the arrondissement's most significant architectural works and records their heritage inscription. Visit Casablanca independently describes the complex as one of the city's important landmarks, explicitly in Hay Mohammadi. Recent 2026 reporting confirms the municipal rehabilitation program and the site's continuing patrimonial role.

Point for implementation: **33.5910, -7.5786** (tram/station point immediately serving the site). This is acceptable as an orientation point but remains deliberately described as the access/landmark point rather than a fabricated building centroid.

AkarFinder notoriety score: **96/100**
- public visibility: 19/20
- orientation value: 20/20
- local anchoring: 20/20
- visual singularity: 19/20
- source reliability: 18/20

Visibility target: `minZoom=13.4`, `retainPriority=true`; existing collision engine remains authoritative.

Illustration target: simplified semi-figurative industrial heritage gateway/hall, neo-Moorish/Art-Deco massing, monumental portal and long low industrial volume; no text, no logo, no generic factory pictogram, no photorealism.

### REJECT / HOLD

- **Cinéma Saâda**: strong cultural memory and explicit Hay Mohammadi address, but exact mapped building point is not yet supported by two sufficiently strong independent sources. HOLD.
- **Carrières Centrales tram station**: excellent orientation and verified locality, but visually generic as a landmark illustration; REJECT for this lot.
- **Sémiramis**: architectural importance is strong, but exact point remains insufficiently locked. HOLD.

## Implementation safety

No runtime registry mutation in this lot: the shared registry is large and connector reads of the early range are still truncated. A whole-file replacement without byte-complete source would violate fail-closed discipline. The retained candidate is therefore certified in docs and ready for a narrow registry patch once a safe edit path is available.

Guardrails: 0 Supabase, 0 business-data mutation, 0 ranking, 0 merge, 0 deploy.
