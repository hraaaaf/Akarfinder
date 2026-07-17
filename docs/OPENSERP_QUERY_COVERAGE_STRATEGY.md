# OpenSERP Query Coverage Strategy

**Mission:** AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 (section 10-11)

## Geography

- **Tier 1 (15 cities, mission-specified verbatim):** Casablanca, Rabat, Salé, Témara, Marrakech,
  Tanger, Agadir, Fès, Meknès, Kénitra, El Jadida, Oujda, Tétouan, Nador, Mohammedia.
- **Tier 2 (1 city):** Essaouira — the only city name recognized anywhere else in AkarFinder's
  codebase (`lib/search/city-coords.ts`) that isn't already in Tier 1. Deliberately not expanded
  further: no other city name is "recognized by AkarFinder's taxonomy" without inventing one.
- **Tier 3 (districts, 6 cities, 65 districts):** Casablanca (17), Rabat (10), Marrakech (11),
  Agadir (9), Tanger (10), Fès (8) — reused verbatim from `lib/geo/district-dictionary.ts`
  (`LISTING-DISTRICT-RECOVERY-1`), the only district-level data this project has ever vetted.
  Salé, Témara, Meknès, Kénitra appear in the mission's own Tier-3 target list but have **no**
  district data anywhere in the codebase — rather than invent neighborhood names, Tier 3 for
  those 4 cities is absent, not fabricated.

## Property types (12, per section 10.B)

appartement, studio, villa, maison, terrain, riad, bureau, local commercial, magasin, ferme,
immeuble, duplex. Used as query text labels; the *extracted*, DB-facing `property_type` on an
admitted candidate still only ever takes one of the 7 pre-existing categories
(apartment/villa/studio/house/land/office/commercial) or `null` — riad/magasin/ferme/immeuble/
duplex never become a new, unsupported DB category (see `classify.ts`'s `toPropertyType()`,
unchanged).

## Languages

French (all queries) and Arabic (city-level queries only, Tier 1/2). Arabic city and property-type
names (`national-geography.ts`'s `CITY_ARABIC_NAMES`/`PROPERTY_TYPE_ARABIC_NAMES`) are standard,
factual vocabulary — not invented. An earlier version of the generator mixed French property-type
words with Arabic transaction words and Arabic city names in the same query (e.g.
`"terrain كراء مراكش"`); a live smoke test during this mission showed this hybrid phrasing returns
zero relevant results. Fixed before any Production query ran: Arabic queries are now fully Arabic.

## Source-specific (domain-targeted) queries

`"<type> <transaction> <city> site:<domain>"`, generated only for domains already
`approved_discovery`/`partner`/`authorized_static` in the source domain registry (section 12) — a
result from an unreviewed domain can never enter the universe as a first-class target.

## Universe size

2,718 deduplicated queries (`data/openserp/query-universe-v1.json`): 720 Tier-1 city-level (FR+AR),
48 Tier-2, 1,560 Tier-3 district-level (FR only), 390 Tier-4 domain-targeted. This is a rotation
**pool**, not a per-run execution plan — a single 30-minute run only executes 4-24 of them (see the
budget policy in `docs/OPENSERP_AUTOMATED_INGESTION_ARCHITECTURE.md`).

## Rotation priority (implemented in `query-rotation-planner.ts`)

1. Never-executed queries.
2. Among never-executed queries: higher priority-tier number (more specific — district/domain-
   targeted) over Tier 1 city-only, based on this mission's own empirical finding that generic
   city-only queries returned 0 admitted candidates across 236 raw results in live testing.
3. Learned `discovery_yield` (exponential moving average of accepted-candidate count per query)
   once any query has run at least once — this eventually dominates the tier heuristic above.
4. Under-covered cities, then under-covered districts.
5. Staleness (queries not run recently get a small tiebreak boost).

## Deduplication

Every query has a deterministic `query_id` (`sha256` of city+district+transaction+property_type+
language+target_domain, truncated) and `query_hash` (`sha256` of the normalized rendered query
text) — regenerating the universe file never orphans rotation state, and the same normalized text
never appears twice in the universe (deduplicated at generation time).
