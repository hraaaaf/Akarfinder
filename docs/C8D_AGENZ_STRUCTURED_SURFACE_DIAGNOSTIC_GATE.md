# C8D — Agenz structured surface diagnostic gate

Goal: determine whether the remaining Agenz × Diour Jamaa surface failures can be resolved from page-scoped structured JSON tied to the target listing ID, without using whole-body text as evidence.

Allowed output per seed:

- target listing ID derived from canonical URL ;
- count of JSON / JSON-LD / `__NEXT_DATA__` script blocks ;
- count of parseable JSON blocks ;
- count of structured objects whose identifier matches the target listing ID ;
- unique numeric surface-like candidates found inside those target-ID objects ;
- unique numeric surface-like candidates found anywhere in structured JSON, diagnostic only.

Forbidden:

- raw HTML or raw JSON persistence ;
- DB writes ;
- public activation ;
- using recommendation/body surface values as target-listing evidence ;
- price/m² publication from this diagnostic.

Success criterion: a bounded live artifact proves whether target-ID structured objects expose a unique defensible surface for any of the unresolved pages while `productionWriteCount=0` and `rawHtmlPersisted=false` remain verified.
