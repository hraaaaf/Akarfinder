# ODM-04 — Normalization V2

Status: COMPLETE — implementation merged candidate, no Production migration or Vercel deployment.

## Baseline — 2026-07-25

- Search/Thin Index representations: 55,933
- explicit city/type/intent metadata rows: 2,009
- source property types observed: appartement, terrain, villa, maison, bureau, local commercial, riad, ferme
- source intents observed: sale, rent
- city values include accent variants such as Fes/Fès, Meknes/Meknès, Kenitra/Kénitra, Sale/Salé and Tetouan/Tétouan
- ODM-03 recoverable evidence: 1,788 surfaces and 979 explicit MAD prices

## Canonical contract

Normalization never overwrites source facts. Raw fields, recovered fields and canonical fields remain separate.

Canonical fields:

- `normalized_city`
- `normalized_property_type`
- `normalized_intent`
- `normalized_price_mad`
- `normalized_surface_m2`
- `price_per_m2_mad`
- `normalization_status`
- `normalization_version`
- `normalization_evidence`

Canonical property taxonomy:

- `apartment`
- `villa`
- `house`
- `studio`
- `land`
- `office`
- `commercial`
- `riad`
- `farm`

Canonical intents:

- `sale`
- `rent`
- `new`

## Doctrine

- missing stays `NULL`, never zero or a guessed default;
- normalization is deterministic and versioned;
- aliases are explicit and bounded;
- city normalization does not infer a neighborhood;
- price stays in MAD and requires ODM-03 evidence;
- surface stays in m² and requires ODM-03 evidence;
- price/m² is calculated only when both normalized inputs exist and remain within plausible bounds;
- unsupported raw values remain unnormalized rather than forced into the nearest category;
- rejected/unclassified rows and unsupported providers remain excluded by the existing publication gates.

## Serving contract

`public.thin_index_normalized_documents_v2` exposes only canonical fields to `service_role`. It does not grant public, anonymous or authenticated direct table access. Existing Search behavior remains unchanged until a later explicit consumer activation gate.

## Certification gate

Run `scripts/data/odm_04_normalization_audit.sql` after applying ODM-03 and ODM-04 migrations to an ephemeral/staging database.

Required results:

- zero unsafe price, surface and price/m² rows;
- zero canonical values without source/recovery evidence;
- zero unexpected providers;
- zero duplicate canonical URLs;
- normalization version exactly `odm04-v2` for every projected row;
- all unsupported values remain `NULL` or `partial`, never silently coerced.

## Handoff to ODM-05

ODM-05 may create quality tiers from completeness, provenance, freshness and normalization coverage. It must not treat a normalized value as verified truth and must keep commercial status separate from data quality.
