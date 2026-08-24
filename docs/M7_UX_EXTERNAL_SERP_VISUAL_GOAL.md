# M7-UX — External indexed SERP density

## Goal

Make AkarFinder external indexed results behave visually like a search engine result stream rather than a marketplace tile gallery.

## Success criteria

- The global result count remains owned by the search toolbar and is not confused with the currently loaded slice.
- External results render as one dense vertical stream.
- A missing authorized thumbnail creates no fake illustration or reserved image block.
- No indicative price is derived to fill missing source data.
- Only trusted normalized price/surface fields already present in the public result may appear.
- Source attribution is immediately visible and the original-source CTA remains clear.
- Mobile keeps the same hierarchy without a two-column card grid.

## BEFORE — verified from repository source

`ExternalIndexedResultCard.tsx` used a 2/3-column portal-card layout with a 164–196 px media block, contextual fallback artwork, derived indicative price, provenance blocks, and an AkarInfo passport. `ExternalIndexedResultsSection.tsx` used `grid-cols-2` / `lg:grid-cols-3`.

A browser screenshot could not be captured from the available execution surface in this run, so no screenshot is claimed as proof.

## Reference pattern

- Mubawab: global count followed by a long sortable result stream.
- 1immo: explicit global count plus a loaded page slice (for example `1–24 de N`).

AkarFinder intentionally stays more minimal than either source because external indexed results must not imply content rights it does not have.

## Wireframe approved for implementation

```text
SUR LE WEB                                      100 affichés

source.ma · Achat
Annonce immobilière · Casablanca
Casablanca · Appartement · 82 m² · 1 250 000 DH       Voir la source ↗
────────────────────────────────────────────────────────────────────────
source-2.ma · Achat
Annonce immobilière · Casablanca
Casablanca · Villa                                    Voir la source ↗
────────────────────────────────────────────────────────────────────────
```

If an image is genuinely authorized, it may appear as a small side thumbnail. If not, there is no image placeholder.

## Proof plan

- Targeted static regression test for density and non-invention rules.
- Next.js production build.
- AFTER screenshot on the same production-like search viewport when browser capture is available.
- No Vercel deployment without explicit authorization.
