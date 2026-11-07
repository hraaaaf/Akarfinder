# AkarParser V2 — Offline Recovery Pilot (Q1E)

**Status:** implemented as an isolated, read-only recovery tool. **Not** activated in production. No scraping, remote requests, Supabase/Neon writes, Vercel deployment or publication.

## Goal / success / proof

- **Goal:** transform *real stored raw payloads or structured records* into provenance-backed JSON ready for internal AkarFinder ingestion, without counting URL-only candidates as listings.
- **Success:** valid per-row JSON, deterministic reruns, source SHA unchanged, explicit missing values, no false `active`, `sale`, `Morocco`, observation dates, or publication permissions; exact duplicate observations diverted to a separate file.
- **Proof:** standard-library regression suite and source-preserving test, hashes of inputs/outputs in manifest, manual annotation of a real stratified sample before bulk qualification.

## Invocation (Python 3.11+, standard library)

```bash
python scripts/acquisition/akarparser_v2.py --input /private/lake.sqlite --table source_offer_observations --out /private/q1e-batch1
python scripts/acquisition/akarparser_v2.py --input /private/neon-snapshot.sqlite --table property_listings --out /private/q1e-neon-canary --limit 1000
python -m unittest discover -v -s scripts/acquisition/__tests__ -p 'test_akarparser_v2.py'
```

The SQLite reader **automatically LEFT JOINs** `property_listings` to `listing_sources` if both tables exist and expected link columns are present, preserving identity and `first_seen_at`. SQLite sources use `mode=ro` plus `query_only`. A live nonempty `-wal` blocks execution: use a read-only closed snapshot. JSON/JSONL/CSV inputs are supported. Inputs remain unchanged. Output directory must be empty or absent.

## Private outputs

- `records.jsonl.gz`: one JSON envelope per line with source identity state, extracted facts, field-level provenance, status, and an optional `canonical_property_v1` projection. **Ready for internal processing, not automatically ready for publication.**
- `quarantine.jsonl.gz`: identity/currency conflicts.
- `duplicates.jsonl.gz`: additional observations sharing explicit `(source_domain, source_offer_key, first_observed_at)`; retained for auditing, not silently merged.
- `errors.jsonl.gz`: row ordinal + error code, no raw data.
- `private_identity_registry.sqlite`: on-disk exact-key index; avoids O(N²) pairwise comparisons.
- `manifest.json`: source SHA-256, output SHA-256, counts, immutable-source verification, version and generation timestamp.

Statuses: `candidate_url`, `partial`, `complete_candidate`, `ready_internal`, `quarantine`. `ready_internal` requires title, city, property type, transaction, MAD price, surface, **explicit source ID and a real source observation timestamp**. Even `ready_internal` has `publication_allowed=false` and `offer_status=unknown`. Missing country remains `null`. `created_at`/`updated_at` in the internal canonical projection derive **only** from a real `observed_at`; they never silently represent an ingestion run time. Unknown currency is not converted to MAD. Missing values remain null, not zero.

Extractor handles common source column aliases, JSON payloads, HTML title/meta, JSON-LD, nested offer price, textual price and surface evidence, room counts, secondary surfaces, coordinates (including negative longitude), selected amenities, media links. Image/media rights are **unknown**, caching/download disabled; no external assets are fetched. Descriptions/evidence redact common emails and phone numbers. This is **not exhaustive PII de-identification**; keep outputs private. Values and source IDs originating solely in URL patterns are `url_candidate`, not verified.

## Offline canary — remaining Q1E gate

A **real 1,000-row stratified canary** must be run on private structured snapshot/observations, **not the 327,514 URL-only candidate keys**. Pick rows across sources and tiers: complete and incomplete data; sources Mubawab, Avito, Agenz and other providers; records with and without IDs/timestamps; and conflicting source IDs. Export only into a private location. Run this program in read-only mode, then manually review **at least 100 sampled records** with underlying evidence; measure per-field precision and coverage before/after. Proposed threshold: **≥98% precision on annotated non-null price, area and property type**, with zero unproved `active`/rights/publication claims, zero change to source file, zero false exact merges. If below threshold, fix, re-test, and do not scale.

A full offline classification on the **95,825 historical Akaar/Domio URL candidates** was run twice as a safety control: all 95,825 remained `candidate_url`, 0 `ready_internal`, 0 parse errors. Both records ZIP-stream SHA-256 values: `786fdde05917b85361eeb8968bac5f104e2720776580cad40f6c5f72d5c81066`. This confirms **no URL-only inflation**, not extraction quality on structured real estate listings.

## Limitations / next lot

This pilot's exact de-dup is by source ID + source observation timestamp. Cross-source physical-property similarity needs a **separate blocked and audited stage**; never run global O(N²) dedup functions on 327k rows and never automatically merge properties solely because price/surface/city match. `raw_listings` in Neon Recovery contained **0 rows** in the 07 Nov 2026 audit; the 151,900 already structured rows require local export/snapshot for a real execution of this script. The original strict 9,990 historical detailed observations and gap of 190,010 remain unchanged until the real canary and union proof.

See `docs/M250K_RECOVERY_AND_ACQUISITION_2026-11-07.md` in the separate data-recovery Draft PR #1176. **Do not merge or deploy Vercel without explicit permission.**
