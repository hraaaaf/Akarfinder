# LOT B1 — Source Freshness Engine

## Purpose

Convert Source Registry v2 policy dates and evidence dates into a deterministic, source-level freshness gate.

## Contract

- one freshness row per registered source;
- deadline = earliest of policy expiry/review deadline and evidence observation + maximum revalidation interval;
- states: `current`, `due_soon`, `overdue`, `blocked_unverified`;
- overdue or invalid sources become blocked regardless of their B2 base gate;
- transitions are written to an immutable audit table;
- no network access, listing mutation, ranking change or publication change;
- all B1 rows keep `publication_eligible=false`.

## Risk priority

Priority is derived from reuse restrictions, legal review, partnership dependency, unverified robots/terms and low policy confidence. It orders future human or automated policy reviews; it does not grant acquisition permission.

## Security

Tables and functions are service-role only, RLS enabled, and functions use `security invoker` with an empty search path.

## Completion criteria

- all Source Registry domains covered;
- zero public roles with access;
- overdue/unverified sources blocked fail-closed;
- transition journal populated on initial evaluation and future state/hash changes;
- dedicated CI gate green;
- production report `fail_closed=true`.
