# Vivre Ici — Landmark Themes

## Contract

Landmark themes are an editorial layer on top of the verified territory registry.

- `category` remains the stable technical classification.
- `themeTags` is editorial and may contain more than one theme.
- Themes never alter GPS, district parentage, business ranking, Supabase data, or map truth.
- A landmark can be visible under one theme at low zoom and gain secondary thematic context deeper in the UI.

## Canonical themes

`stadiums`, `parks-gardens`, `historic-monuments`, `stations-hubs`,
`squares-esplanades`, `shopping-centers`, `iconic-cafes`, `education`,
`museums-culture`, `beaches-corniches`, `lighthouses-forts-ramparts`,
`religious`, `business-towers`, `healthcare`, `major-roads`,
`other-local-anchor`.

## Diversity policy

At low zoom, prefer at most one visible landmark from the same theme inside a district.
A second same-theme landmark is eligible only if it has materially higher value, sufficient
screen-space separation, and passes deterministic collision rules.

Landmark Factory should prefer a missing theme when two candidates have similar evidence
quality and map value.

## Implementation

- Typed taxonomy: `lib/geo/territory-dictionary.ts`
- Resolver + labels + explicit overrides: `lib/geo/territory-landmark-themes.ts`
- Contract tests: `scripts/scrapers/__tests__/territory-landmark-themes.test.ts`

Runtime integration:
- below local zoom 14.5, selection keeps at most one visible landmark per theme and district;
- candidates are already ordered by retainPriority then importance, so the stronger landmark wins the theme slot;
- from zoom 14.5 upward, the theme quota is released and the existing deterministic collision engine decides whether multiple same-theme landmarks can coexist;
- GPS coordinates are never changed to satisfy thematic diversity.
