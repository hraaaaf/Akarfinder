# LOT B3.2 — External Tail Source Review

## Objective

Review the seven pending `internal_signal_only` sources and decide whether their B3 candidates may enter the future `external_tail` display lane.

## Decision rule

A source is not approved merely because its results would appear at the end of the SERP. Approval requires explicit evidence supporting third-party minimal link representation or written permission.

## Outcomes

| Source | Candidates | Decision |
|---|---:|---|
| 1immo | 4,814 | permission required |
| Avito | 3,815 | permission required |
| Agenz | 2,359 | permission required |
| Souk Immobilier | 2,184 | permission required |
| Mouldar | 1,259 | hidden without permission |
| Masaken | 1,255 | hidden without permission |
| Kawtar Immobilier | 135 | permission required |

## Evidence notes

- 1immo protects all site content and prohibits reproduction without prior authorization.
- Mouldar prohibits unauthorized extraction and exploitation.
- Masaken prohibits public or commercial use without written authorization.
- For Avito, Agenz, Souk Immobilier and Kawtar Immobilier, no sufficiently explicit third-party link-display permission was evidenced.

## Safety contract

- all 15,821 URLs remain preserved;
- no candidate is deleted;
- no candidate becomes SERP-tail eligible;
- no publication or ranking change;
- no source content, image, price, surface or description is reused;
- each source receives an explicit contact/permission next action.

Production report: `odm_b3_2_external_tail_source_review_report_v1()`.
