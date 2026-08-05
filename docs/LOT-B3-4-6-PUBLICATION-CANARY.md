# LOT B3.4.6 — Publication Canary

## Purpose

Prepare a reversible partner-feed publication boundary without publishing any listing.

## Mandatory gates

A batch can only become eligible after all of the following are proven:

- partner feed source is active;
- rights are attested;
- row review is accepted or merged;
- dedup decision is `new_property`, `new_offer`, or `update_offer`;
- dry-run is complete;
- batch is within the configured canary limit;
- a named approver and approval timestamp exist.

## Canary progression

The schema supports a limit from 1 to 500 items. The intended rollout is 50, then 200, then 500 after explicit certification. This lot creates no real batch and performs no listing mutation.

## Rollback

Every executed item must carry a rollback payload before a batch may be rolled back. Rollback is batch-scoped, audited, and idempotent.

## Non-effects

- no insert or update in public listing/property tables;
- no SERP, ranking, search, or index change;
- no automatic publication;
- no synthetic partner data;
- authenticated organization members have read-only visibility;
- only `service_role` may create or transition batches.

## Activation dependency

The first real canary remains blocked until a verified agency or promoter supplies real listings and explicitly attests its rights.
