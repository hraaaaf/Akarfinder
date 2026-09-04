import { extractListingRefs } from "./discovery.js";

export type CatalogOverlapSurface = {
  id: string;
  base_url: string;
  pages: number;
};

export type CatalogOverlapSurfaceResult = {
  id: string;
  pages_requested: number;
  refs_discovered: number;
  unique_ids: number;
  already_known_ids: number;
  new_ids: number;
  overlap_ratio: number;
};

export type CatalogOverlapProbeResult = {
  surfaces: CatalogOverlapSurfaceResult[];
  total_unique_ids: number;
  total_already_known_ids: number;
  total_new_ids: number;
  cross_surface_duplicates: number;
};

export const DEFAULT_NATIONAL_OVERLAP_SURFACES: CatalogOverlapSurface[] = [
  { id: "cc-all-sale", base_url: "https://www.mubawab.ma/fr/cc/immobilier-a-vendre", pages: 2 },
  { id: "cc-all-rent", base_url: "https://www.mubawab.ma/fr/cc/immobilier-a-louer", pages: 2 },
  { id: "sc-apartment-sale", base_url: "https://www.mubawab.ma/fr/sc/appartements-a-vendre", pages: 2 },
  { id: "sc-office-sale", base_url: "https://www.mubawab.ma/fr/sc/bureaux-et-commerces-a-vendre", pages: 2 },
  { id: "sc-office-rent", base_url: "https://www.mubawab.ma/fr/sc/bureaux-et-commerces-a-louer", pages: 2 },
  { id: "sc-commercial-rent", base_url: "https://www.mubawab.ma/fr/sc/locaux-a-louer", pages: 2 },
];

export function paginatedCatalogUrl(baseUrl: string, page: number): string {
  if (!Number.isInteger(page) || page < 1) throw new Error(`lot9_catalog_overlap_invalid_page:${page}`);
  return page === 1 ? baseUrl : `${baseUrl}:p:${page}`;
}

export async function probeCatalogOverlap(input: {
  knownSourceIds: Iterable<string>;
  fetchPage: (url: string) => Promise<string>;
  surfaces?: CatalogOverlapSurface[];
}): Promise<CatalogOverlapProbeResult> {
  const known = new Set(input.knownSourceIds);
  const surfaces = input.surfaces ?? DEFAULT_NATIONAL_OVERLAP_SURFACES;
  const globalProbeIds = new Set<string>();
  const results: CatalogOverlapSurfaceResult[] = [];
  let crossSurfaceDuplicates = 0;

  for (const surface of surfaces) {
    if (!Number.isInteger(surface.pages) || surface.pages < 1 || surface.pages > 3) {
      throw new Error(`lot9_catalog_overlap_invalid_pages:${surface.id}:${surface.pages}`);
    }

    const surfaceIds = new Set<string>();
    let refsDiscovered = 0;

    for (let page = 1; page <= surface.pages; page++) {
      const url = paginatedCatalogUrl(surface.base_url, page);
      const html = await input.fetchPage(url);
      const refs = extractListingRefs(html, url);
      refsDiscovered += refs.length;
      for (const ref of refs) surfaceIds.add(ref.source_id);
    }

    let alreadyKnown = 0;
    let newIds = 0;
    for (const id of surfaceIds) {
      if (known.has(id)) alreadyKnown += 1;
      else newIds += 1;
      if (globalProbeIds.has(id)) crossSurfaceDuplicates += 1;
      else globalProbeIds.add(id);
    }

    results.push({
      id: surface.id,
      pages_requested: surface.pages,
      refs_discovered: refsDiscovered,
      unique_ids: surfaceIds.size,
      already_known_ids: alreadyKnown,
      new_ids: newIds,
      overlap_ratio: surfaceIds.size === 0 ? 0 : alreadyKnown / surfaceIds.size,
    });
  }

  let totalAlreadyKnown = 0;
  let totalNew = 0;
  for (const id of globalProbeIds) {
    if (known.has(id)) totalAlreadyKnown += 1;
    else totalNew += 1;
  }

  return {
    surfaces: results,
    total_unique_ids: globalProbeIds.size,
    total_already_known_ids: totalAlreadyKnown,
    total_new_ids: totalNew,
    cross_surface_duplicates: crossSurfaceDuplicates,
  };
}
