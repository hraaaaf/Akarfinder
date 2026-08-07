# ODM A5.4 — Final Recovery to 15,540

## Scope

A5.4 activates the exact remaining A3/A4 recovery inventory after A5.1–A5.3.

- current public depth: **10,483**;
- remaining activation-ready candidates: **5,057**;
- DarAgadir: **4,066**;
- Promo Immo Marrakech: **991**;
- target public depth: **15,540**.

## Safety contract

A5.4 uses only A3 freshness-qualified and A4 activation-ready rows. It excludes every seed already activated by A5.1, A5.2 or A5.3.

The activation:

- creates a complete snapshot before mutation;
- uses only normalized city, type and intent to compose a generic AkarFinder title;
- exposes no source snippet, description, price, surface or imagery;
- performs no detail-page fetch;
- does not alter source seeds or discovery evidence;
- requires exactly +5,057 visible rows;
- provides an exact −5,057 rollback;
- stops if the public baseline is not exactly 10,483;
- stops if the final public depth is not exactly 15,540.

## Production sequence

1. prepare exactly 5,057 rows;
2. activate 10,483 → 15,540;
3. verify source split and zero restricted content;
4. rollback 15,540 → 10,483;
5. recreate the same deterministic batch;
6. reactivate 10,483 → 15,540;
7. merge only after all CI workflows pass.

## Recovery boundary

A5.4 completes only the validated recovery lane for DarAgadir and Promo Immo Marrakech. It does not certify the remaining blocked, stale, policy-limited or dimension-incomplete inventory from A2.

After A5.4, the recovery phase reaches its validated potential of **15,540 public representations**. The remaining gap to 40,000 is **24,460** and requires new compliant acquisition, freshness and policy work.
