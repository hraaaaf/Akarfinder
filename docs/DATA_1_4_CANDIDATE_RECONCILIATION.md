# DATA-1.4 — Candidate Reconciliation & Source Prioritization

## Objective

Reconcile the three discovery/governance universes already proven by AkarFinder:

1. B3 `reserve_unregistered_source` domains;
2. certified DATA-1.3B Common Crawl URL Index candidates;
3. existing `source_policy_registry` entries.

The output is a deterministic **review queue**, not a source authorization mechanism.

## Inputs

- DATA-1.2 B3 reserve: read-only from `public.odm_b3_discovery_expansion_audit_v1`;
- DATA-1.3B evidence: GitHub Actions artifact from run `31168075021`, certified `300/300` Parquet, `9,087` raw candidate hosts and `8,727` registered domains;
- Source Registry v2: read-only from `public.source_policy_registry`.

DATA-1.4 removes a leading `www.` during normalization. The certified `9,087` raw hosts therefore become `8,970` canonical hosts while the registered-domain universe remains `8,727`.

## Reconciliation key

Common Crawl exposes both host and registered domain. DATA-1.4 collapses Common Crawl hosts to the registered domain and maps B3/registry hosts to that registered domain when explicit Common Crawl evidence supplies the relationship.

No public-suffix guesser is introduced. When no explicit relationship exists, the normalized host remains its own reconciliation key.

## Candidate classes

Classification is deliberately conservative:

- `PRIMARY_SOURCE_CANDIDATE` — likely first-party source candidate only when a real-estate domain/name signal is combined with an explicit Morocco anchor (`.ma`, a bounded Morocco/city token, or Moroccan geography already present in Source Registry);
- `PORTAL_CANDIDATE` — known Moroccan real-estate portals, or real-estate-branded external domains that lack enough evidence to be treated as likely Moroccan first-party sources;
- `AGGREGATOR` — known meta-search families such as Mitula/Trovit/Nuroa/Properstar/Repimmo;
- `CLASSIFIED` — known broad classifieds such as Avito/MarocAnnonces/Vivastreet/OpenSooq;
- `SHORT_TERM_RENTAL` — known accommodation/short-term platforms;
- `OTHER` / `UNKNOWN` — evidence exists but is insufficient for a stronger class.

A high number of matching pages alone does **not** promote a generic domain to `PORTAL_CANDIDATE` or `PRIMARY_SOURCE_CANDIDATE`. This prevents news, automotive, tourism and other sites that merely mention property terms from dominating the review queue.

Morocco/city anchors in external domains use bounded label matching (label/prefix/suffix/hyphen segment), not arbitrary substring matching. For example, the letters `fes` inside an unrelated word do not constitute evidence for Fès.

Known portal, aggregator, classified and short-term markers always block `PRIMARY_SOURCE_CANDIDATE` classification.

These labels are **review hints**, not legal, commercial or ownership truth.

## Review score v1

`reviewPriority` is built only from observed evidence:

- Morocco relevance — 20%;
- estimated inventory — 25%;
- evidence diversity — 15%;
- freshness — 10%;
- source primarity — 30%.

The inventory score is logarithmic so very large aggregators cannot dominate the queue solely through page count. Aggregators/classifieds/short-term platforms receive lower primarity scores than possible direct agencies/promoters.

## Fail-closed rules

DATA-1.4:

- performs **zero database writes**;
- creates no Source Registry row;
- changes no existing source policy;
- assigns `effectivePolicyCandidate=null` to every reconciled candidate;
- preserves existing Source Registry policy evidence as evidence only;
- downloads no WARC/content payload;
- does not crawl candidate websites;
- does not bypass robots, noindex, login, CAPTCHA or other access controls.

A candidate must still follow the canonical gate:

`DISCOVERED → AUDITED → POLICY_ASSIGNED → ELIGIBLE → CONNECTOR_SELECTED`

## Live proof

The DATA-1.4 workflow:

1. downloads the certified DATA-1.3B artifact;
2. verifies the `300/300` Common Crawl proof and source cardinalities;
3. reads B3 reserve and Source Registry using existing GitHub Supabase secrets;
4. reconciles and ranks the domain universe;
5. writes only local CI artifacts:
   - `candidate-reconciliation.json`;
   - `candidate-reconciliation.md`;
   - `top-100.csv`;
   - `proof.json`.

The final proof must state `readOnly=true`, `writesPerformed=0`, and `effectivePoliciesAssigned=0`.

## Next gate

DATA-1.5 should inspect the highest-value unregistered candidates for technical capability (sitemap, JSON-LD, WordPress/Houzez/RealHomes, public feeds/endpoints) while keeping capability separate from permission.
