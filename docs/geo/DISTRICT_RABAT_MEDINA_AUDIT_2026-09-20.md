# AkarFinder — District-first audit — Rabat / Médina

Date: 2026-09-20
Status: VERIFIED_FOR_CANONICAL_PROMOTION — registry mutation intentionally deferred until a byte-complete safe patch is available.

## Decision

`Médina` is a distinct Rabat neighborhood identity and must not be collapsed into `Hassan` or `Kasbah des Oudayas`.

## Evidence

1. Office National Marocain du Tourisme (primary tourism authority): its official medina guide has a dedicated `Médina de Rabat` section and describes the medina through its fortified streets, souks, Rue Souika and Rue des Consuls.
2. UNESCO World Heritage: Rabat is inscribed as `Rabat, Modern Capital and Historic City: a Shared Heritage`; the historic city component supports the old-city identity while not authorizing a merge with the modern Hassan district.
3. SMEPS Rabat city guide: explicitly calls it `Le quartier de la Médina`, describes Bab El Had and Bab El Alou as entrances, and states that the Kasbah des Oudayas walls protect/border it to the west. This is strong evidence that Médina and Oudayas are adjacent/distinct identities.
4. Independent Rabat neighborhood guide: maps Médina, Oudayas and Hassan separately; describes Médina as bounded by the Almohad walls, the Kasbah, Bouregreg and Andalusian wall.
5. Postal evidence: Rabat 10030 separately contains `Ancienne Médina`, `Medina`, `Quartier Ancienne Medina`, Mellah, Souika and `Quartier Kasbat Oudaya`, reinforcing a distinct Medina address identity while showing Oudayas as separately named.

## Canonical proposal

- id: `district_rabat_medina`
- slug: `medina`
- canonical_name: `Médina`
- aliases: `Medina`, `Ancienne Médina`, `Ancienne Medina`, `Médina de Rabat`
- city_slug: `rabat`
- validation_status: `validated`
- seo_eligible: `false`
- map_eligible: `true`

## Fail-closed distinctions

- `Médina` ≠ `Hassan`: Hassan is the modern/administrative district and remains its own canonical entity.
- `Médina` ≠ `Kasbah des Oudayas`: the Kasbah is adjacent and independently named; do not use it as a Medina alias.
- `Mellah`, `Souika`, `Sidi Fateh` are sub-area/address labels in the 10030 postal sector; this audit does not promote them as separate canonical districts.

## Mutation guardrail

The canonical registry is not rewritten from a truncated connector read. Promotion is therefore certified in documentation only in this lot, pending a byte-complete safe insertion plus regression test.

0 Supabase. 0 ranking. 0 landmark. 0 merge. 0 deploy.
