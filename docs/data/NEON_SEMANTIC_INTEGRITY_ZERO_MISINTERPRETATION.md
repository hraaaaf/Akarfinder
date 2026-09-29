# Neon Semantic Integrity — Zero Misinterpretation Contract

Status: ACTIVE AUDIT / NO PRODUCTION DATA WRITE YET

## Goal

**0 announcement misinterpreted in the certified/public corpus.**

This does not mean every source row must have every field populated. It means:
- no field may be presented as known when evidence is contradictory or ambiguous;
- ambiguous or unproven values remain null/unknown/quarantined;
- a row cannot be certified if any strong semantic contradiction remains.

## Success criteria

A listing is semantically certified only if all applicable gates pass:

1. **Transaction**
   - stored value belongs to the allowed enum;
   - no title+URL evidence jointly contradicts the stored transaction.

2. **Property type**
   - stored value belongs to the allowed enum;
   - no title+URL evidence jointly identifies a different type;
   - explicitly accepted equivalences remain allowed (studio⊂apartment, villa/house, riad/house-villa).

3. **Geography**
   - city is canonicalized through the existing validated geo registry when a registry match exists;
   - case/accent aliases must not fragment search results;
   - unresolved cities remain as raw values until a validated registry identity exists.

4. **Price**
   - missing price stays unknown unless explicit evidence supports a unique value;
   - ancillary amounts, unit prices, old prices, ranges, subsidies, deposits and charges cannot be promoted as listing price;
   - obviously implausible values are uncertified;
   - existing non-NULL values are not automatically trusted.

5. **Surface**
   - impossible / grossly implausible values are uncertified;
   - land and built-property thresholds are intentionally different;
   - hectares/unit conversions require explicit evidence.

6. **Rooms / bedrooms / bathrooms**
   - impossible counts are uncertified;
   - rooms and bedrooms stay semantically distinct.

7. **Publication**
   - any row with a strong semantic integrity conflict fails closed from public Search.

## Verified baseline — 2026-09-29

Corpus total: **151,900**

### Price
- `price_mad IS NULL`: **95,626**
- of those without description snippet: **86,098**
- strict first-pass candidate recovery: **238**
- ambiguous principal price candidates: **2**
- monetary evidence rejected / wrong intent: **932**
- no usable stored explicit currency+amount evidence: **94,454**

Historical structured price parser bug reproduced:
- it removed every non-digit character from a complete price block;
- unrelated digits could be concatenated into the price;
- Masaken strict comparable sample: **25/40 mismatches**;
- **23/25** exactly match `stored = "2" + explicit_amount`.

### Strong semantic flags

Read-only corpus audit found:
- strong transaction contradictions (title + URL agree against DB): **178**
- title-only broad type discrepancies: **5,512** (audit signal, NOT auto-fix proof)
- high-confidence type contradictions require title + URL agreement and are handled by the deterministic dry-run
- suspicious surfaces under current physical bounds: **321**
- suspicious bedrooms: **5**
- suspicious rooms: **0**
- suspicious bathrooms: **0**
- suspicious prices under current extreme bounds: **434**
- city case/format collision groups: **30**

### Current public subset

Current policy-compliant public subset checked: **36**
Strong semantic-integrity flags among these rows: **0**

## Code guard

`lib/listings/public-listing-access.ts` now contains a fail-closed semantic integrity guard.

A future row is suppressed from public Search when it has, among other strong signals:
- invalid transaction/property enum;
- title+URL transaction contradiction;
- title+URL property-type contradiction;
- grossly impossible surface/counts;
- extreme price contradictions.

This gate does not repair data. It prevents uncertain data from being presented as truth.

## Deterministic remediation

`scripts/data/neon-semantic-remediation-dry-run.sql`

Automatic correction is eligible only when two persisted signals agree:
- title evidence;
- canonical listing URL evidence.

Current verified source concentration:
- transaction contradictions: Agenz is the dominant source;
- high-confidence type contradictions are concentrated in Mubawab, Domio, MarocImmo and Sarout.

No production write is authorized by this document.

## City handling

The existing canonical geo registry is the source of truth:
`lib/geo/geo-entity-registry.ts`.

Neon read-model changes:
- returned city names are canonicalized through that registry;
- city filters accept canonical aliases case-insensitively.

This prevents `Casablanca` vs `casablanca`, `Fès` vs `Fes`, `Salé` vs `Sale`, etc. from fragmenting Search while DB remediation is still pending.

## Remaining path to Goal

1. Make PR #1104 green.
2. Certify the semantic fail-closed guard.
3. Export exact deterministic transaction/type correction candidates.
4. Build field-specific recovery audits for price, surface and room counts.
5. Re-enrich rows that lack enough evidence; never infer absent values.
6. Prepare bounded, reversible Neon migrations.
7. Human gate before production DB writes.
8. Re-run full-corpus audit after each migration.
9. Goal is reached only when:
   - strong integrity conflicts in the certified/public corpus = **0**;
   - every non-certified row is explicitly unknown/quarantined rather than misrepresented;
   - public Search regression tests remain green.
