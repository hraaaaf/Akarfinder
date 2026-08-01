# DATA PHASE V2 — Session Record

## LOT

ODM Structured Field Recovery V1

## Scope

- inspect existing normalization path;
- identify recoverable property-type and intent evidence;
- materialize Shadow-only candidates;
- reject ambiguous evidence fail-closed;
- preserve existing normalized values;
- keep ranking and publication disabled.

## Connected preflight

- missing property type: 26,490 rows;
- missing intent: 29,249 rows;
- unique lexical type signals: approximately 6,256 rows;
- ambiguous type signals: approximately 334 rows;
- unique lexical intent signals: approximately 3,787 rows;
- ambiguous intent signals: approximately 24 rows.

## Activation

No public activation. No SERP mutation. No update to `thin_index_search_documents` in this LOT.
