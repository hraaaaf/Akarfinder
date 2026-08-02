// UX preview deployment trigger after PR #234: 2026-08-02
import type { Metadata } from "next";
import { SearchFilteredGalleryV2 } from "@/components/ux/SearchFilteredGalleryV2";
import { searchListings } from "@/lib/search";
import { buildSearchPageQuery } from "@/lib/search/search-page-query";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AkarFinder — Filtres SERP V2", robots: { index: false, follow: false } };

export default async function FiltersV2Page({ searchParams }: { searchParams?: Promise<Record<string,string|string[]|undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const query = buildSearchPageQuery(params);
  const result = await searchListings({ ...query, limit: query.limit ?? 30 });
  return <SearchFilteredGalleryV2 listings={result.listings} total={result.total} />;
}
