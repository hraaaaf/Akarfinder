# Mohammedia Centre — Product Geography Evidence

Status: **DISCOVERY / FAIL-CLOSED**  
Canonical AkarFinder neighborhood: **Centre**  
Canonical aliases: **Centre-ville**, **Centre ville**

## National rollout state

The certified national rollout plan marks Mohammedia as `CANONICAL_MATCHED`:
- 5 discovery candidates routed to Mohammedia;
- 1 canonical neighborhood;
- 1 exact same-city discovery match;
- 0 unresolved canonical neighborhoods.

The exact same-city OSM candidate is node `8391222407`, `place=neighbourhood`, name `Centre`, contained in Mohammedia admin-level-8 relation `2523547`.

## Public product-taxonomy evidence — observed 2026-09-22

Yakeey exposes a dedicated Mohammedia **Centre Ville** price-reference page:
https://yakeey.com/fr-ma/referentiel-de-prix-immobilier/mohammedia/centre-ville

Yakeey listings explicitly expose `Ville: Mohammédia` and `Quartier: Centre Ville`:
https://yakeey.com/fr-ma/acheter-appartement-mohammedia-centre-ville-CA139485

Public Google Maps results also expose addresses described as `En Plein Centre Ville - Mohammedia`. This is orientation/taxonomy evidence only.

## Generic-name collision guardrail

`Centre` / `Centre Ville` is intrinsically generic. The national crosswalk already finds same-name labels in Oujda, El Jadida and Casablanca. Therefore:
- city containment is mandatory;
- a same-name object outside Mohammedia is irrelevant to this canonical neighborhood;
- a same-name relation inside Mohammedia is still not automatically the product boundary.

## Probe

The dedicated workflow scopes first to a Mohammedia geographic window, then searches aliases:
- Centre
- Centre Ville
- Centre-ville
- Centre-Ville

It emits exact anchors and exact boundary relations, plus a fail-closed verdict:
`DISCOVERY_PROBE_ONLY / promotion.allowed=false / NO_PRODUCT_BOUNDARY_CLAIM`.

## Next gate

If a defensible same-city relation exists, materialize it as **SHADOW reference-only** and validate topology/provenance. Product-boundary promotion still requires independent modern real-estate corroboration.
