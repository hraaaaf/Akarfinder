# LOT B3.4.4 — Dedup & Change Detection

## Objective

Classify each canonical partner row without publishing or automatically merging it.

## Decision model

- `invalid`: canonical validation failed.
- `new_property`: no plausible property candidate.
- `new_offer`: same property, distinct commercial offer.
- `update_offer`: same stable partner reference with a material change.
- `duplicate`: same reference/content or same property/offer fingerprint.
- `manual_review`: multiple plausible properties make the match ambiguous.

## Identity layers

Property fingerprint uses normalized city, neighborhood, property type, surface rounded to 5 m² and bedroom count.

Offer fingerprint extends property identity with transaction, stable partner reference and price rounded to 1,000 MAD.

Stable partner reference takes priority for detecting updates. It never authorizes publication.

## Change detection

Material changes are currently bounded to price, public description, condition, bedrooms and bathrooms. Media change handling remains outside this lot.

## Safety

Every result carries `publication_eligible=false`. B3.4.4 creates no property, offer, listing, cluster or search mutation. Ambiguity is sent to manual review rather than silently merged.
