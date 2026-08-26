# Doubtful price policy

## Goal
Preserve an indexed price even when economic evidence is ambiguous or untrusted, while making its lower confidence explicit to users and ranking.

## Serving contract
- Trusted economic price: displayed normally; normal quality/ranking; price/m² may be derived.
- Doubtful price: displayed with `Prix à vérifier`; effective quality score is reduced by 10 points; search relevance is reduced by 0.08; price/m² is never exposed or derived.
- Missing price: remains missing.
- Reliable market analytics must use trusted economic state and must not treat `price_to_verify` values as trusted observations.

## Persistence
`odm_apply_trusted_price_reconciliation_v1()` no longer nulls doubtful prices. It retains the amount, clears derived price/m², and marks `recovery_confidence = economic_v2_price_to_verify`.

## UI
External indexed result cards show the amount when available. `price_to_verify` results carry a discreet `Prix à vérifier` badge beside the amount.

## Ranking
`search_thin_index_v3()` keeps its existing return contract. Doubtful prices are encoded through `display_eligibility_reason += |price_to_verify`, receive a 10-point effective quality penalty, and a 0.08 relevance penalty.
