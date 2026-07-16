# AkarFinder Market Index Foundation

**Mission:** AKARFINDER-MARKET-INDEX-FOUNDATION-1
**Status:** `FOUNDATION_IMPLEMENTED_NOT_ACTIVATED`
**Scope:** internal domain/data foundation only. No public UI change, no Production write, no automatic
matching. See `docs/MARKET_INDEX_EXISTING_MODEL_AUDIT.md` for the full existing-model audit this design
is based on.

## Compatibility-first decision (mission section 7)

| Mission concept | Existing table | Decision |
|---|---|---|
| `PropertyCluster` | `property_listings` (partial) | **Reused** for the 1:1 legacy case via a new minimal `property_clusters` table (id + origin + legacy FK) — see "why a new table" below. `property_listings` itself is not modified beyond nothing (zero columns added to it). |
| `SourceOffer` | `listing_sources` (partial — see audit finding) | **Extended additively** with nullable columns (`source_offer_key`, `origin_type`, `compliance_status`, `content_fingerprint`, `ingestion_run_id`, `displayed_price`, `price_currency`, `price_period`, `price_status`). No new physical "source offer" table. |
| `Observation` | `listing_observation_history` (different subject, no FK, 0 rows, Search-Gateway-scoped) | **New table** `source_offer_observations` — no existing table can serve as an append-only per-`listing_sources`-row time series without conflating two different subjects. |
| `DiscoveryCandidate` | none | **New table** `discovery_candidates` — nothing pre-admission exists today; OpenSERP results go straight to `property_listings`/`listing_sources` once classified. |

**Why `property_clusters` is a new table, not a reuse of `property_listings.id`:** the audit found that
`property_listings.duplicate_group_id` already groups distinct properties together via a hard-block-free,
transitively-chained heuristic (14 groups, largest one demonstrably wrong — see audit finding). Reusing
`property_listings.id` directly as the cluster key would either (a) silently inherit that heuristic's
false merges as if they were validated clusters, or (b) require repurposing the legacy primary key for a
different, stricter concept mid-lifecycle. A future genuine multi-source cluster (2+ `SourceOffer`s with
no single backing legacy row) also has no natural home in `property_listings.id`. A minimal new table
with its own id space and a nullable, unique `legacy_property_listing_id` FK cleanly represents both the
`legacy_one_to_one_projection` case (every existing row gets exactly one cluster) and any future
`manual_review`/`explicit_partner_identifier`/`deterministic_same_source_identifier` case, without
touching or trusting `duplicate_group_id`.

## 13 architecture questions (mission section 23)

**1. `property_listings` représente-t-elle déjà `PropertyCluster` ?**
Structurally yes for the common case (1 row = 1 displayed property = what a cluster should represent),
but its own `duplicate_group_id` field cannot be trusted as validated cluster membership (audit finding:
demonstrated false merges via a hard-block-free legacy heuristic). The new `property_clusters` table
gives every existing row its own clean 1:1 cluster (`legacy_one_to_one_projection`), ignoring
`duplicate_group_id` entirely.

**2. `listing_sources` représente-t-elle déjà `SourceOffer` ?**
Partially — same FK shape, same "who published this, at which URL, when" role. But some existing
multi-row groups under one `property_listing_id` are demonstrably *different* properties, not multiple
publications of the same one (audit finding, `property_listing_id=134/129/315/44`). Extended additively
rather than trusted as-is for multi-source grouping.

**3. Une nouvelle table `SourceOffer` est-elle réellement nécessaire ?**
No. `listing_sources` already has the right grain (one row per source×URL) and the right FK
(`property_listing_id`). Additive nullable columns suffice.

**4. Une nouvelle table `PropertyCluster` est-elle réellement nécessaire ?**
Yes — see "why a new table" above. The functional gap is real: no existing column/table can hold a
cluster identity independent of the compromised `duplicate_group_id` heuristic or of a single legacy row.

**5. Comment une offre OpenSERP est-elle représentée ?**
Today: a `listing_sources` row with `source_name` matching a known domain, and `field_confidence`
(on the *parent* `property_listings` row) carrying `provider="openserp"`, `publication_lane=
"external_web_result"`. Going forward: the same `listing_sources` row additionally carries
`origin_type="persisted_openserp"` directly (source-level, not cluster-level — see question 9). It is
never `partner_result`; `deriveSourceDisplayPolicy`/`derivePersistedExternalDisplayPolicy` (`lib/listings/
map-db-listing.ts`) already enforce this at read time and are unchanged by this mission.

**6. Comment une offre partenaire est-elle représentée ?**
A `listing_sources` row whose `source_name` is not OpenSERP-tagged and whose (future) `origin_type` is
`partner_api`/`partner_feed`/`first_party_user`/`legacy_import`. No genuine partner listing was found in
the live searchable dataset during the prior mission's validation (`OPENSERP-PARTNER-LABEL-MISLABELING-
FIX-1`) — this remains an open observational gap, not something this foundation can close.

**7. Comment une observation est-elle créée ?**
A new `source_offer_observations` row is inserted (never updated) whenever a `SourceOffer` (`listing_
sources` row) is re-observed with a different `content_fingerprint` or `displayed_price`. Feature-flagged
off (`MARKET_INDEX_OBSERVATIONS_ENABLED=false`) — no observation is created by this mission itself; the
service layer (`lib/market-index/market-index-service.ts`) implements the idempotent creation logic and
is unit-tested, but is never invoked from production ingestion code in this mission.

**8. Comment la fraîcheur est-elle mesurée ?**
Per `SourceOffer`: `first_observed_at` / `last_observed_at` (already present on `listing_sources` as
`first_seen_at`/`last_seen_at`). Per `Observation`: `observed_at` on each row gives an exact history,
something `property_listings.updated_at` alone cannot (it only shows the *last* change, not the series).

**9. Comment évite-t-on les doublons techniques ?**
Idempotency keys (mission section 11): `DiscoveryCandidate` on `provider+query_hash+canonical_url+
discovery_window`; `SourceOffer` on `source_domain+source_offer_key` (or `source_domain+canonical_url_
hash` when no reliable source id exists); `Observation` on `source_offer_id+observed_at_bucket+content_
fingerprint`. All three are enforced by unique indexes (additive `CREATE UNIQUE INDEX`, see migration
plan) — a technical duplicate (same discovery, same offer, same exact observation) is rejected/no-op'd at
the DB layer, not "merged" by any similarity heuristic.

**10. Comment évite-t-on les faux merges ?**
By construction, not by scoring: `property_cluster_members` rows (cluster ↔ source-offer membership) are
only ever created through one of four explicit `origin_type` values (`manual_review`,
`explicit_partner_identifier`, `deterministic_same_source_identifier`, `legacy_one_to_one_projection`) —
never by a similarity score, never by the (compromised) `duplicate_group_id`, never by the just-benchmarked
rules/lexical engine (`NO_MATCHING_JUSTIFIED`). `MARKET_INDEX_CLUSTERING_ENABLED` stays structurally
`false`; the service layer's `assignSourceOfferToCluster()` refuses any origin outside the four allowed
values and refuses to attach a second `SourceOffer` to an existing multi-member cluster unless the origin
is `manual_review` or `explicit_partner_identifier` (tested — see section 19).

**11. Comment le futur writer 30 minutes utilisera-t-il cette fondation ?**
`OPENSERP-AUTOMATED-INGESTION-30MIN-1` (next-but-one mission) will insert into `discovery_candidates`
first (status `discovered`), classify/promote qualifying rows to a `listing_sources` `SourceOffer` row
(status `promoted_to_source_offer`) plus a `legacy_one_to_one_projection` `property_clusters` row, and
append a `source_offer_observations` row per (re)observation — all gated behind
`MARKET_INDEX_WRITE_ENABLED`/`MARKET_INDEX_OBSERVATIONS_ENABLED`, both `false` until that mission's own
explicit Production activation.

**12. Comment rollbacker la migration ?**
Every migration in `docs/MARKET_INDEX_MIGRATION_PLAN.md` ships an explicit rollback SQL block (`DROP
TABLE IF EXISTS …` / `DROP COLUMN IF EXISTS …` for the additive columns and new tables only — never
touching `property_listings`'/`listing_sources`' pre-existing columns or rows). Since every migration is
purely additive, rollback is always safe: dropping a new table/column cannot lose data that existed
before this mission, because none of it depends on pre-existing data being modified.

**13. Quelles tables restent source de vérité pendant la transition ?**
`property_listings` and `listing_sources` remain the **only** tables the public site reads from —
completely unchanged in this mission (zero columns removed or altered, only new nullable columns added
to `listing_sources`, which existing `select("*")`-based code ignores harmlessly). The new Market Index
tables are additive, unread by any public code path, and exist purely to prepare (not yet activate) the
next generation of the model.

## Feature flags (all false by default, mission section 14)

```
MARKET_INDEX_WRITE_ENABLED=false
MARKET_INDEX_READ_ENABLED=false
MARKET_INDEX_OBSERVATIONS_ENABLED=false
MARKET_INDEX_CLUSTERING_ENABLED=false
```

`MARKET_INDEX_CLUSTERING_ENABLED` is additionally enforced in code (`lib/market-index/market-index-
feature-flags.ts` throws if anything ever attempts to read it as `true` outside a unit test) — belt and
suspenders on top of the env default.
