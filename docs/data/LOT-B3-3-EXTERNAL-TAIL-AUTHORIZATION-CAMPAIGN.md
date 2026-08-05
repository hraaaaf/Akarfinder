# LOT B3.3 — External Tail Authorization Campaign

## Objective

Operationalize written-authorization requests for the seven B3.2 sources without granting visibility or publication rights.

## Contract

- one campaign row per reviewed source;
- verified contact channel only; never invent an email address;
- request scope limited to `external_tail_link_only`;
- AkarFinder-generated title and normalized city/type/intent only;
- source domain and canonical outbound URL only;
- no source title, description, snippet, image, price, surface or contact details;
- no candidate becomes activation-review eligible without written authorization;
- no SERP, ranking or publication mutation.

## Initial campaign

| Source | Candidates | Contact channel | Initial state |
|---|---:|---|---|
| 1immo | 4,814 | verified email | draft prepared |
| Avito | 3,815 | official support portal | ready to contact |
| Agenz | 2,359 | official contact route | ready to contact |
| Souk Immobilier | 2,184 | official contact form | ready to contact |
| Mouldar | 1,259 | verified email | draft prepared |
| Masaken | 1,255 | official support/contact route | ready to contact |
| Kawtar Immobilier | 135 | verified email | draft prepared |

Total: 15,821 candidates.

## State machine

`ready_to_contact → draft_prepared → submitted → awaiting_reply → approved|declined|no_response`

`approved` is insufficient by itself: `written_authorization_received=true` is also mandatory before a separate activation-review lot.

## Certification

Production report: `odm_b3_3_external_tail_authorization_campaign_report_v1()`.
