# SEARCH_GATEWAY_MULTISOURCE_SERP — Documentation

Version: SEARCH-GATEWAY-MULTISOURCE-SERP-1A
Date: 2026-07-02

---

## 1. Overview

The Search Gateway is AkarFinder's second layer for indexing real estate listings from multiple sources via Search APIs.

### Two-Layer Architecture

**Layer A: Data Engine**
- Internal structured data from sources like Mubawab
- Reliable, deduplicated, enriched
- Small volume (currently ~134 listings)
- Full property details available

**Layer B: Search Gateway**
- External results from public Search API indices (Serper, etc.)
- "Thin" results: title + snippet + source link
- No direct crawler access (respect robots.txt, 403s, etc.)
- Broader coverage, lower certainty
- **This layer is the Search Gateway**

---

## 2. Why Search Gateway?

Direct crawling is blocked on most platforms:
- **Avito**: Returns 403 Forbidden for non-browser requests
- **Sarouty**: Platform architecture incompatible with automated indexing
- **Yakeey**: Challenge detection on category pages
- **Agenz**: Policy review required
- **Logic-Immo**: Platform restrictions

Solution: Use Search API indices (e.g., Serper.dev) that already index these sites legally.

---

## 3. Configured Sources

| Source | Mode | Query Type | Notes |
|---|---|---|---|
| **Avito** | search_api_only | `site:avito.ma [query]` | Market signal only, thin results |
| **Sarouty** | search_api_only | `site:sarouty.ma [query]` | Independent aggregator |
| **Yakeey** | search_api_only | `site:yakeey.com [query]` | Challenge platform |
| **Agenz** | search_api_only | `site:agenz.ma [query]` | Policy review pending |
| **Logic-Immo** | search_api_only | `site:logic-immo.ma [query]` | Real estate platform |
| **Mubawab** | db_primary_search_api_complement | Search API for gaps | DB data takes priority |

---

## 4. Query Builder

```typescript
buildSearchGatewayQueries({
  q: "appartement",
  city: "Casablanca",
  property_type: "Apartment",
  sources: ["avito", "sarouty"],
  max_results_per_source: 3
})
```

Returns one query per source:

```
site:avito.ma appartement Casablanca
site:sarouty.ma appartement Casablanca
```

---

## 5. API Endpoint

```
GET /api/search/gateway
  ?q=appartement
  &city=Casablanca
  &property_type=Apartment
  &sources=avito,sarouty,yakeey
```

**Response if provider not configured:**

```json
{
  "ok": false,
  "degraded": true,
  "reason": "provider_not_configured",
  "sources_queried": ["avito", "sarouty", ...],
  "results_count": 0,
  "results": []
}
```

**Response if provider active:**

```json
{
  "ok": true,
  "degraded": false,
  "provider": "serper",
  "sources_queried": ["avito", "sarouty"],
  "results_count": 5,
  "results": [
    {
      "id": "gateway_avito_abc123",
      "title": "2-Room Apartment, Casablanca",
      "snippet": "Located in Maarif...",
      "original_url": "https://avito.ma/listings/...",
      "source_id": "avito",
      "source_name": "Avito",
      "search_result_display_mode": "thin_indexed_result",
      "can_show_contact": false,
      "can_show_gallery": false,
      "primary_cta": "view_original",
      "primary_cta_label": "Voir sur Avito",
      ...
    }
  ]
}
```

---

## 6. Safety Guarantees

✅ **No direct crawling** — Search API only
✅ **No 403/captcha bypass** — Respect platform blocks
✅ **No contact/WhatsApp** — Redirect to original source only
✅ **No gallery exposure** — Snippet + title only
✅ **No image cache** — Link to original or provider proxy only
✅ **No API key exposed** — SEARCH_API_KEY never in response
✅ **No database writes** — Results are temporary, never persisted
✅ **No Data Engine corruption** — Independent layers

---

## 7. Limitations (V0)

This version is intentionally limited:

- **No UI integration yet** — /search does not display gateway results
- **No ranking** — Results are in query order only
- **No dedupe against DB** — Possible overlap with Data Engine results
- **No Images API** — Thumbnails not yet integrated
- **No source trust score** — All sources treated equally
- **No click tracking** — No analytics on which sources users select
- **No opt-out API** — Sources cannot request removal
- **No advanced filters** — Only basic q + city + property_type

---

## 8. Environment Variables

```bash
SEARCH_API_ENDPOINT=https://google.serper.dev/search
SEARCH_API_KEY=***hidden***
SEARCH_GATEWAY_THUMBNAILS_ENABLED=false
SEARCH_GATEWAY_THUMBNAILS_RISK_ACCEPTED=false
```

The route returns `degraded=true` if `SEARCH_API_KEY` is not set.

---

## 9. Files Created

```
lib/search-gateway/
  ├── search-gateway-types.ts         (Type definitions)
  ├── search-gateway-sources.ts       (Source configuration)
  ├── search-gateway-query-builder.ts (Query generation)
  ├── search-gateway-normalizer.ts    (Result normalization)
  ├── search-gateway-dedupe.ts        (Deduplication)
  └── search-gateway-policy.ts        (Reserved for future)

app/api/search/gateway/
  └── route.ts                        (API endpoint)

scripts/scrapers/__tests__/
  └── search-gateway-multisource-serp.test.ts (Tests)
```

---

## 10. Test Coverage

21 tests covering:

- Source configuration
- Query builder (site:domain, limits, empty input)
- Normalizer (title/URL validation, domain checks, safety guardrails)
- Dedupe (URL + title matching)
- Security (no secrets exposed)

Run with:

```bash
npm test
npm run build
```

---

## 11. UI Integration (V1 — COMPLETED)

**SEARCH-GATEWAY-MULTISOURCE-SERP-UI-INTEGRATION-1** ✅

✅ **ExternalIndexedResultCard** component created
- Displays: title, snippet, source, CTA
- Always redirects to original source
- No contact, WhatsApp, gallery, forms
- Fallback visual if no thumbnail

✅ **ExternalIndexedResultsSection** component created
- Section header: "Résultats issus d'un index de recherche"
- Sub-text: "Aperçus limités avec source visible."
- Grid layout (1 col mobile, 2 col tablet, 3 col desktop)
- Respects `can_show_thumbnail` and displays fallback

✅ **Integration into `/search`**
- Results gateway loaded in parallel with DB listings
- Displayed AFTER Data Engine results
- Feature flag: `NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED=true`
- Provider degradation handled silently

✅ **Thumbnails (simple version)**
- No Images API called
- Respects `can_show_thumbnail` from normalizer
- No cache, download, or rehost

✅ **Security**
- SEARCH_API_KEY never exposed client-side
- Route API handles provider configuration
- Aucun contact/WhatsApp/galerie
- Attribution label present

## 12. Next Mission Recommended

**SEARCH-GATEWAY-MULTISOURCE-SERP-IMAGES-1** OR **SEARCH-GATEWAY-RANKING-1**

Options:
1. **Images Integration** — Call Images API, add thumbnails, respect TOS
2. **Ranking Tuning** — Score sources, demote duplicates, A/B test visibility

**Why?** UI complete. Next phase unlocks visual richness (images) or conversion optimization (ranking).

---

## 12. Monitoring

Future: Track these KPIs

- Search Gateway queries attempted per day
- Results returned vs. queries
- Sources performing (CTR by source)
- Dedupe effectiveness (% duplicates filtered)
- Time to respond (route latency)
- Provider errors / degradation incidents

---

## References

- `/lib/search/search-result-display-model.ts` — Result display policy
- `/docs/ROADMAP.md` — Google-like First strategy
- `/docs/SESSION.md` — Implementation history
