# LOT B3.4.3 — Canonical Mapping & Validation

## Audit verdict

AkarFinder already has a canonical listing identity. B3.4.3 must reuse it rather than create a parallel agency schema.

### Canonical layers retained

1. `lib/property-schema/core.ts` defines Property Schema V1.
2. `lib/seller/seller-property-draft.ts` maps seller declarations into canonical `declared_facts` paths and computes structural completeness.
3. `lib/seller/readiness.ts` defines the user-facing **Annonce prête** score, including useful information and photo quantity/quality.
4. `owner_listing_representations` projects approved owner drafts into Search with quality, lifecycle and display eligibility.

### Legacy elements not retained as source of truth

`scripts/import-partner-csv.ts` has useful historical parsing and PII guards, but owns a separate listing type, a separate completeness score and a direct publication path. It remains legacy and is not the B3.4 source of truth.

## B3.4.3 decision

Partner CSV/XLSX rows are adapters into the existing identity:

```text
partner columns
→ alias mapping
→ Property Schema V1 declared_facts
→ seller structural completeness
→ Annonce prête quality standard
→ row-level issues
→ quarantine
```

No partner row becomes public in this lot.

## Canonical identity shared by owner, agency and promoter

Core fields use the same paths:

- `classification.property_type`
- `offer.transaction_type`
- `location.country`
- `location.city`
- `location.neighborhood`
- `surfaces.surface_total_m2`
- `offer.price_amount`
- `layout.bedrooms_count`
- `layout.bathrooms_count`
- `condition.condition`
- `description.public_text`

Photos remain governed metadata, not fabricated facts:

- `photo_count`
- `accepted_photo_count`

## Validation levels

- `blocking`: stable partner reference, sale/rent transaction, city, property type and surface.
- `warning`: price, neighborhood, useful description, at least three photos and at least three conforming photos.
- `info`: optional context such as condition.

Rows are classified `invalid`, `warning` or `valid`; all remain `publication_eligible=false`.

## Quality standard

The same `calculateSellerReadiness()` function used by `/vendre` calculates partner listing readiness. B3.4.3 does not introduce a second score.

## Non-effects

- no real partner import;
- no listing/search/ranking mutation;
- no image download;
- no publication;
- no automatic verification claim;
- no alteration of the owner listing contract.
