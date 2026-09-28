# Neon Price Recovery Audit — 2026-09-28

Status: READ-ONLY AUDIT — no Neon write performed.

## Goal

Explain why `property_listings.price_mad` is NULL and identify the subset that can be recovered deterministically without overwriting existing prices or inventing values.

## Certified baseline

Neon corpus:
- total listings: **151,900**
- priced listings: **56,274**
- missing price: **95,626**

Price-source status:
- `price_status=not_disclosed`: **95,593**
- missing price status: **33**
- missing `price_mad` while `listing_sources.displayed_price` is populated: **0**

This proves Neon is not dropping an already-materialized `displayed_price`. The issue is upstream evidence capture / normalization.

## Root cause

### 1. Thin recovery waves without descriptive evidence

Among the 95,626 missing-price rows:
- no `description_snippet`: **86,098 (90.0%)**
- snippet present: **9,528**

Largest affected waves:
- `clean-corpus-v4.11-wave3`: **68,018 missing / 68,018 with no snippet**
- `clean-corpus-v4.11-wave12-major-portals`: **7,207 missing / 7,207 with no snippet**
- `clean-corpus-v4.11-wave13-strict-route`: **1,961 missing / 1,961 with no snippet**
- `clean-corpus-v4.11-wave9-new-sources`: **1,287 missing / 1,287 with no snippet**
- `clean-corpus-v4.11-wave5`: **1,158 missing / 1,158 with no snippet**
- `clean-corpus-v4.11-wave4b`: **1,126 missing / 1,126 with no snippet**

These rows were recovered as thin route/index records. The price was generally never captured into the recovery corpus.

### 2. Explicit prices exist in surviving text but were not normalized

Verified examples with `price_mad=NULL`:
- Agenz: `Prix ... 1 600 000 dirhams`
- Agenz: `Prix 800 000 DHS`
- Avito: `Prix de vente 3 800 000 Dhs`
- Mubawab: `Prix attractif de 1450000 Dhs`
- Mouldar: `Prix 850 000 Dirhams`
- PromoImmo Marrakech: `PRIX DE VENTE : 5 000 000 DH`

Therefore `not_disclosed` is not a trustworthy semantic label for every NULL price.

## Conservative dry-run classification

The current strict read-only parser:
- requires explicit MAD / DH / DHS / dirham evidence;
- matches the listing transaction intent;
- rejects deposits, charges, agency fees, old prices, starting prices and price/m²;
- never touches a non-NULL price.

Result over all **95,626** NULL-price listings:
- **238** — `recoverable_explicit`
- **2** — `ambiguous_multiple_principal`
- **932** — monetary evidence exists but is rejected / ancillary / wrong-intent
- **94,454** — no usable explicit currency+amount evidence in the stored title/snippet

The buckets sum exactly to **95,626**.

Top sources for currently recoverable explicit prices:
- marocimmo.com: **93**
- sarout.ma: **64**
- daragadir.com: **28**
- promoimmomarrakech.com: **27**
- mubawab.ma: **9**
- agenz.ma: **6**
- avito.ma: **6**
- masaken.ma: **2**
- domio.ma: **1**
- mouldar.com: **1**
- sarouty.ma: **1**

## Conclusion

The dominant problem is **missing acquisition evidence**, not only parser weakness.

A regex-only repair can safely recover a first tranche of about **238** rows from currently stored evidence. It cannot solve the remaining ~94k rows because most never retained a usable snippet/detail payload.

## Safe next sequence

1. Keep this lot read-only.
2. Materialize the 238 candidates into an audit artifact, not into `property_listings`.
3. Review the 2 ambiguous cases and a deterministic sample of the 238.
4. Build a source-by-source re-enrichment plan for the 86,098 no-snippet rows using already-authorized/public evidence paths.
5. Only after candidate certification, prepare a bounded Neon write migration with rollback evidence.
6. Recompute price coverage and Search filter coverage after recovery.

## Canonical audit

Reusable SQL:
`scripts/data/neon-price-recovery-audit.sql`
