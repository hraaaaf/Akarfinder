import type { Metadata } from "next";
import { SearchCardsGalleryV2 } from "@/components/ux/SearchCardsGalleryV2";
import { searchListings } from "@/lib/search";
import { buildSearchPageQuery } from "@/lib/search/search-page-query";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AkarFinder — Cartes SERP V2", robots: { index: false, follow: false } };

export default async function CardsV2Page({ searchParams }: { searchParams?: Promise<Record<string,string|string[]|undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const query = buildSearchPageQuery(params);
  const result = await searchListings({ ...query, limit: query.limit ?? 30 });
  return <SearchCardsGalleryV2 listings={result.listings} total={result.total} />;
}
