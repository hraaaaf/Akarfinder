# Coverage primitives

- `coverage-gap-auditor.ts`: deterministic measurement of announced inventory versus unique listing URLs.
- `adaptive-partition-enumerator.ts`: source-agnostic breadth-first subdivision of segments proven to be capped and incomplete.

Source-specific URL/filter semantics stay in source adapters; coverage primitives perform no network access.
