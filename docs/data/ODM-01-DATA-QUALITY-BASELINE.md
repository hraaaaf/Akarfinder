# ODM-01 — DATA Quality Baseline + Recovery Map

Status: IN PROGRESS

Scope: read-only measurement of the canonical Thin Index/Search projection after all publication gates. No Production deployment, no Vercel configuration change, no provider gate bypass.

## Verified canonical baseline — 2026-07-25

- GitHub `main` HEAD at measurement start: `b465a657b7434197b1b5767d6734bb162d7b6f8d`
- `source_offer_seeds`: 55,925 rows / 55,925 distinct canonical URLs
- `thin_index_search_documents`: 55,925 rows / 55,925 distinct canonical URLs
- duplicate canonical URLs in Thin Index: 0
- latest Thin Index projection: `2026-07-25T12:43:31.466+00:00`
- rejected/unclassified seed URLs: 0
- rejected/unclassified URLs published in Thin Index: 0

## Provider mix

| Provider | Distinct searchable representations |
|---|---:|
| `commoncrawl_cdx` | 42,543 |
| `public_sitemap` | 11,423 |
| `serper_search` | 1,959 |
| **Total** | **55,925** |

## Freshness mix

| Freshness state | Count |
|---|---:|
| `fresh_confirmed` | 2,197 |
| `seed_only` | 53,728 |
| **Total** | **55,925** |

## Thin Index field coverage

| Field | Present | Coverage |
|---|---:|---:|
| title | 2,009 | 3.59% |
| snippet | 2,009 | 3.59% |
| query_text | 2,009 | 3.59% |
| city | 2,009 | 3.59% |
| property_type | 2,009 | 3.59% |
| intent | 2,009 | 3.59% |

The 55,925 gate is therefore a volume success, but most records remain thin `seed_only` representations. Quality recovery must now prioritize deterministic, source-preserving enrichment rather than further blind acquisition.

## Recovery map

1. **Freshness** — prioritize domains and URL families with the highest `seed_only` volume and recent public evidence.
2. **Deterministic URL recovery** — extract city, transaction intent and property type from source-specific canonical URL patterns only when confidence is explicit.
3. **Text recovery** — populate title/snippet/query text only from approved public observations already stored with provenance.
4. **Price/surface recovery** — recover numeric values only from deterministic structured evidence; never infer missing values as zero.
5. **Normalization V2** — normalize city, district, property type and intent while preserving raw source values and provenance.
6. **Quality tiers** — assign tiers from measurable completeness, freshness and provenance; `seed_only` remains visibly distinct internally.
7. **Deduplication/clustering** — cluster representations conservatively; never collapse solely on approximate address or price.
8. **Thin Index rebuild** — project only rows passing canonical publication gates; rejected/unclassified rows remain excluded.

## Next measurable gate

Produce a domain-level recovery matrix containing:

- distinct URLs by source domain and provider;
- freshness coverage;
- title/city/type/intent coverage;
- deterministic recovery opportunity counts;
- duplicate/canonicalization anomalies;
- priority score based on free yield, freshness and confidence.

The companion SQL is stored in `scripts/data/odm_01_quality_baseline.sql`.