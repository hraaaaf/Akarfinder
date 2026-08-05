# LOT B3.1 — External Tail Policy

## Objective

Create a distinct display policy for low-priority external references without treating ingestion permission as display permission.

## SERP lanes

1. primary and partner results;
2. canonical AkarFinder results;
3. `external_tail_link_only` results;
4. internal reserve, not visible.

## External-tail representation

An external-tail result may expose only:

- a generated, non-source title;
- normalized city;
- normalized property type;
- normalized intent;
- source domain;
- canonical external URL.

It must never expose source title, snippet, description, image, price or surface unless a later source-specific policy explicitly allows those fields.

## Gate separation

- `ingestion_gate`: whether the URL may be retained and used internally;
- `display_gate`: whether a minimal representation may appear in the SERP.

A source can therefore be `internal_signal_only` for ingestion while remaining `hidden` for display.

## Source policy states

- `approved_existing_link_policy`;
- `pending_review`;
- `permission_required`;
- `prohibited`;
- `blocked_freshness`;
- `blocked_policy`.

## Fail-closed contract

This lot does not activate any candidate. `serp_tail_eligible` and `publication_eligible` remain false for every URL. A later activation lot must select only candidates whose source policy is approved and whose B3 discovery decision remains valid.

Production report: `odm_b3_1_external_tail_report_v1()`.
