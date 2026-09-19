# AkarFinder — Legacy district reconciliation backlog

Date: 2026-09-19  
Branch: `feat/vivre-ici-district-reconciliation`

## Rule

This file is an audit/backlog, not geographic truth. `geo-entity-registry.ts` remains the only canonical identity source. A legacy-only label can be promoted only after territorial evidence is sufficient. Road corridors and ambiguous commercial labels remain fail-closed.

Statuses:
- `VALIDATE_CANDIDATE`: strong evidence that the label is a real local neighborhood/sector; still requires the canonical promotion step.
- `AMBIGUOUS`: real usage exists, but the exact entity/boundary/relationship is not safe enough yet.
- `AXIS_NOT_DISTRICT`: a road/corridor label, not safe as a canonical neighborhood.
- `PENDING`: not enough evidence in this pass.

## Rabat — 5 legacy-only

| Legacy label | Status | Note |
|---|---|---|
| Les Orangers | VALIDATE_CANDIDATE | Public sources identify Quartier les Orangers in Rabat. |
| Aviation | VALIDATE_CANDIDATE | Public sources identify Aviation/Hay Zahwa as a Rabat neighborhood. |
| Akkari | VALIDATE_CANDIDATE | Consistent public neighborhood naming. |
| Yacoub El Mansour | VALIDATE_CANDIDATE | Strong public neighborhood/arrondissement usage; canonical entity must represent the neighborhood level explicitly. |
| Medina | VALIDATE_CANDIDATE | Historic medina is consistently treated as a Rabat neighborhood/old town. |

## Casablanca — 12 legacy-only

| Legacy label | Status |
|---|---|
| Gauthier | VALIDATE_CANDIDATE |
| Anfa | AMBIGUOUS |
| Californie | VALIDATE_CANDIDATE |
| Sidi Maarouf | VALIDATE_CANDIDATE |
| Oasis | VALIDATE_CANDIDATE |
| Palmier | VALIDATE_CANDIDATE |
| CIL | VALIDATE_CANDIDATE |
| Beauséjour | VALIDATE_CANDIDATE |
| Derb Ghallef | VALIDATE_CANDIDATE |
| Belvédère | VALIDATE_CANDIDATE |
| Ain Sebaa | AMBIGUOUS |
| Roches Noires | VALIDATE_CANDIDATE |

`Anfa` and `Ain Sebaa` remain ambiguous because the names are also used for larger administrative/geographic units; canonical neighborhood scope must be fixed before promotion.

## Marrakech — 8 legacy-only

| Legacy label | Status |
|---|---|
| Palmeraie | AMBIGUOUS |
| Targa | VALIDATE_CANDIDATE |
| Route de Fès | AXIS_NOT_DISTRICT |
| Majorelle | AMBIGUOUS |
| Agdal | VALIDATE_CANDIDATE |
| Mhamid | VALIDATE_CANDIDATE |
| Massira | VALIDATE_CANDIDATE |
| Medina | VALIDATE_CANDIDATE |

`Route de Fès` is explicitly an axis/corridor label. `Palmeraie` and `Majorelle` need boundary/entity disambiguation before canonicalization.

## Agadir — 7 legacy-only

| Legacy label | Status | Note |
|---|---|---|
| Haut Founty | VALIDATE_CANDIDATE | Moroccan price reference explicitly lists HAUT FOUNTY. |
| Hay Mohammadi | VALIDATE_CANDIDATE | Common district usage; boundary proof still needed at promotion. |
| Dakhla | VALIDATE_CANDIDATE | Moroccan price reference explicitly lists HAY DAKHLA. |
| Sonaba | ALIAS_REVIEW | Official-style price reference groups FOUNTY (SONABA); do not create a duplicate before deciding alias/sector relation to Founty. |
| Charaf | VALIDATE_CANDIDATE | Strong local neighborhood usage; boundary proof still needed. |
| Cité Suisse | VALIDATE_CANDIDATE | Moroccan price reference explicitly lists CITE SUISSE. |
| Bensergao | AMBIGUOUS | The name is also an urban district/large sector; canonical neighborhood scope must be fixed. |

## Tanger — 8 legacy-only

| Legacy label | Status |
|---|---|
| Iberia | VALIDATE_CANDIDATE |
| Nejma | PENDING |
| Centre-ville | AMBIGUOUS |
| Californie | VALIDATE_CANDIDATE |
| Val Fleuri | VALIDATE_CANDIDATE |
| Moujahidine | PENDING |
| Boubana | VALIDATE_CANDIDATE |
| Achakar | AMBIGUOUS |

`Centre-ville` must be reconciled against canonical `Ville Nouvelle` before creating a second entity. `Achakar` can denote a broader coastal sector; fail closed.

## Fès — 7 legacy-only

| Legacy label | Status |
|---|---|
| Agdal | PENDING |
| Saiss | AMBIGUOUS |
| Narjis | VALIDATE_CANDIDATE |
| Atlas | VALIDATE_CANDIDATE |
| Route d'Imouzzer | AXIS_NOT_DISTRICT |
| Medina | ALIAS_REVIEW |
| Champs de Course | VALIDATE_CANDIDATE |

`Medina` must reconcile to existing canonical `Fès el-Bali` rather than create a duplicate unless evidence proves a distinct intended entity. `Saiss` is too broad without scope clarification. `Route d'Imouzzer` is an axis.

## Pass-1 tally

- VALIDATE_CANDIDATE: **31**
- ALIAS_REVIEW: **2**
- AMBIGUOUS: **8**
- AXIS_NOT_DISTRICT: **2**
- PENDING: **4**
- Total: **47**

## Safe next exact

1. Promote nothing automatically.
2. Start canonical promotion with the strongest candidates backed by authoritative/independent evidence.
3. Resolve alias cases first: `Agadir Sonaba ↔ Founty`, `Fès Medina ↔ Fès el-Bali`, and `Tanger Centre-ville ↔ Ville Nouvelle`.
4. Keep axes out of the neighborhood registry.
5. For each promoted entity, add regression tests proving one canonical identity and alias resolution.


## Promotion pass 2 — Casablanca / Hay Mohammadi — 2026-09-19

Promoted canonical entity: `district_casablanca_hay_mohammadi`.

Evidence:
- Casablanca City official Hay Mohammadi portal defines Hay Mohammadi as an industrial/residential neighborhood in north-east Casablanca and as an arrondissement in the Aïn Sebaâ–Hay Mohammadi prefecture.
- Casablanca City publishes the arrondissement limits (Aïn Sebaâ north/east, Roches Noires west, Sidi Moumen south), removing the previous scope ambiguity for the map identity.
- CAF explicitly places Stade Larbi Zaouli in Hay Mohammadi.
- Google Maps places Stade Larbi Zaouli on Boulevard de la Grande Ceinture; Casablanca City lists an arrondissement annex on the same boulevard in Hay Mohammadi.

Decision: **VALIDATED / map eligible**, SEO remains disabled. Alias `Hay Al Mohammadi` is accepted. This promotion is intentionally narrow: it unlocks territorial map attachment without changing SEO or ingestion/business data.

Guardrails: 0 Supabase, 0 ranking, 0 deploy, 0 merge.
