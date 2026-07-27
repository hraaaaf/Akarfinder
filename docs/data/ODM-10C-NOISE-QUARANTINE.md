# ODM-10C — Vertical Noise Quarantine

## Verdict

`PRODUCTION_APPLIED_TRUTHFUL_CORPUS_REBASE`

ODM-10A counted 55,946 public Thin Index representations. ODM-10C found that the Avito lane had admitted large quantities of non-real-estate URLs from Common Crawl, including vehicles, electronics, gaming, fashion and services.

Those records are useful discovery evidence, but they are not valid AkarFinder real-estate results.

## Production result

Canonical Supabase project: `kusfiyimwvxblvsrhaes`.

| Metric | Count |
|---|---:|
| Total retained Thin Index documents | 55,946 |
| Quarantined non-real-estate documents | 22,586 |
| Publicly eligible real-estate representations | 33,360 |
| Honest gap to 40,000 | 6,640 |
| Honest gap to 100,000 | 66,640 |

No source row or Thin Index document was deleted.

## Classification doctrine

- Dedicated real-estate domains are classified `real_estate_likely` by domain.
- Avito is treated as a mixed vertical marketplace.
- Only explicit real-estate category slugs are allowlisted.
- Every other Avito category is classified `non_real_estate` and assigned the existing canonical `ineligible` display state.
- Quarantined rows retain URL, provenance, freshness and source metadata for audit and future rule corrections.

## Current Avito allowlist

- `appartements`
- `locations_de_vacances`
- `terrains_et_fermes`
- `villas_et_riads`
- `local`
- `bureaux`
- `autre_immobilier`
- `maisons`
- `colocations`
- `maisons_et_villas`
- `chambre`

## Safety properties

- reversible classification;
- no deletion;
- service-role-only rule registry and report RPC;
- no new network acquisition;
- no change to Source Registry permissions;
- no bypass, CAPTCHA solving, login bypass, stealth or proxy evasion.

## Consequence

ODM-09E proved that the cursor contract could traverse every publicly eligible row at that time. ODM-10C changes the eligible corpus by removing false-positive verticals. The production traversal must therefore be recertified against the corrected corpus, and its historical 40,000 minimum must not be claimed until at least 6,640 additional genuine real-estate representations are acquired.
