# LOT B3.4.5 — Quarantine Persistence & Review Queue

## Objective

Persist every partner-row analysis as immutable evidence and route actionable cases to a controlled internal review queue.

## Existing model reused

B3.4.5 extends the B3.4.1 tables. It does not create a parallel feed or listing model.

```text
partner_feed_import_rows
→ immutable partner_feed_row_snapshots
→ partner_feed_review_queue
→ immutable partner_feed_review_events
```

## Snapshot contract

Each snapshot retains:

- raw payload;
- canonical Property Schema payload;
- validation summary;
- B3.4.4 dedup decision;
- property and offer fingerprints;
- confidence;
- an explicit `publication_eligible=false` invariant.

Snapshots are append-only. Updates and deletes are rejected by a database trigger.

## Review queue

Statuses:

- `pending`;
- `in_review`;
- `accepted`;
- `rejected`;
- `merged`.

`merged` only means that the review outcome was reconciled with an existing internal property/offer identity. It does not mean publication.

Priority:

- invalid row: critical;
- ambiguous property match: high;
- material offer update: high;
- quality warnings: normal;
- exact duplicate: closed without actionable review.

## Audit history

Every status transition is stored in `partner_feed_review_events` with actor, reason, evidence and timestamp. Events are append-only.

## Access

- authenticated organization members: read their organization’s snapshots, queue and events;
- service role: persistence and controlled state transitions;
- public/anon: no access.

## Non-effects

- no property creation;
- no offer creation;
- no listing mutation;
- no automatic clustering;
- no Search or Ranking mutation;
- no publication;
- no real partner data required for the lot.
