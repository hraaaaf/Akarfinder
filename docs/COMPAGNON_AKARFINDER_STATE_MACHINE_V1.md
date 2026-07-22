# Compagnon AkarFinder — State Machine V1 — #19F

The Compagnon is not a free-form chatbot. It is a deterministic orchestration layer over SearchProfile V2, Neighborhood Intelligence V2 and Property Fit V1.

Canonical states:

`ENTRY → OBJECTIF → USAGE → LOCALISATION → BUDGET → TYPE → CONTRAINTES_ABSOLUES → PREFERENCES → PRIORISATION → COMPROMIS → PROFIL_RECAP → RECHERCHE → TRI_PAR_ELIMINATION → AFFINAGE → NOUVELLE_RECHERCHE`

`NOUVELLE_RECHERCHE` loops back to `RECHERCHE`.

## Rules

- Each state accepts a defined structured event set only.
- Each answer either mutates SearchProfile deterministically or records search/elimination state.
- Profile recap cannot launch search until minimum readiness is satisfied.
- Trade-off answers modify tolerances/preferences rather than hidden persona presets.
- Neighborhood candidates consume only evidence-backed Neighborhood Intelligence scores. Missing evidence does not eliminate a neighborhood.
- Property results are evaluated by Property Fit, with hard mismatches explicitly eliminated.
- Refinement updates SearchProfile and starts a new deterministic search cycle.
- The transition API is stateless; account continuity/persistence belongs to #19H.

No LLM output is required to determine state, profile mutation, elimination or ranking. A future conversational surface may phrase questions naturally, but the state machine remains the source of truth.
