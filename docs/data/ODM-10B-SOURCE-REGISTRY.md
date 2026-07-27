# ODM-10B — Source Registry Prioritization

Status: governed baseline

## Doctrine

AkarFinder separates five independent decisions for every source:

1. discovery rights;
2. detail-page fetching;
3. factual extraction and storage;
4. content reuse;
5. public display.

A permissive or partially permissive `robots.txt` is a technical signal only. It is never treated as a licence, contractual permission or transfer of intellectual-property rights.

No source may bypass CAPTCHA, login, access controls, rate limits, explicit robots restrictions or contractual restrictions.

## Current corpus concentration

| Source | Current representations | Current posture |
|---|---:|---|
| avito.ma | 23,925 | Public-index discovery only; legal review required |
| mubawab.ma | 10,693 | Partnership required; internal signals only |
| daragadir.com | 6,533 | Public sitemap only; permission outreach |
| agenz.ma | 4,490 | Public-index discovery only |
| promoimmomarrakech.com | 3,005 | Public sitemap only; priority partnership outreach |
| limmobiliersansfrontieres.com | 1,386 | Public sitemap only; diversification candidate |
| mouldar.com | 1,299 | Public-index discovery only |
| masaken.ma | 1,210 | Public-index discovery only |
| atlasimmobilier.com | 788 | Public sitemap; written permission required |
| aykana.ma | 628 | Public sitemap only; secondary candidate |

## Current legal-policy findings

### Mubawab

The current published terms restrict automated extraction, reuse of site content and creation of a competing database without authorization. The registry therefore forbids content reuse and places all expansion behind a written partnership or licence.

### Avito

The current `robots.txt` declares a sitemap and blocks several technical routes. No written authorization for direct extraction or republication is recorded. Direct crawling therefore remains disabled pending legal review.

### Atlas Immobilier

A public properties sitemap is already observed, but the publisher's legal notice prohibits reproduction or publication of its content without prior written permission. This is a strong partnership candidate, not an automatically authorized scraping source.

### Smaller agency sites

Promo Immo Marrakech, Dar Agadir, L’Immobilier Sans Frontières and Aykana expose public discovery surfaces, but no explicit automated reuse licence is recorded. They remain sitemap-discovery and permission-outreach candidates.

## Prioritized ODM-10C actions

The ranking is an action ranking, not a scraping authorization ranking.

1. **Promo Immo Marrakech — partnership/feed outreach**
   - 3,005 existing representations;
   - strong structured fields visible on public pages;
   - useful Marrakech depth;
   - request a bounded feed, attribution and freshness agreement.

2. **Dar Agadir — partnership/feed outreach**
   - 6,533 existing representations;
   - strongest current source for Agadir;
   - request written sitemap/detail ingestion permission and a freshness channel.

3. **Atlas Immobilier — written permission outreach**
   - strong governance/contact clarity;
   - Essaouira diversification;
   - public sitemap but explicit reproduction restriction.

4. **L’Immobilier Sans Frontières — diversification outreach**
   - useful Rabat–Salé depth;
   - seek partner feed or explicit permission before detail ingestion.

5. **Aykana — secondary diversification outreach**
   - smaller volume;
   - potentially useful Casablanca–Rabat coverage;
   - activate only after written permission or partner feed.

## Sources not selected for direct ODM-10C acquisition

- **Mubawab:** large volume, but current terms make authorization the blocking dependency.
- **Avito:** very large public-index volume, but direct-fetch and reuse rights are not established.
- **Agenz, Moul Dar, Masaken:** policy evidence remains insufficient for activation.

These sources can continue contributing public-index discovery and internal market signals within the existing doctrine, but not unrestricted content republication.

## Exit criteria for ODM-10B

- canonical service-role-only registry exists;
- every registered source has separate discovery/fetch/reuse/display policies;
- no source is considered authorized merely because of robots or sitemap availability;
- evidence URLs and review dates are stored;
- the five next actions are explicit;
- overdue policy reviews can be detected automatically.

## Next lot

ODM-10C should begin with outreach and partner-feed preparation for the five selected sources. Direct network activation remains source-specific and requires the registry to show an appropriate authorization state first.
