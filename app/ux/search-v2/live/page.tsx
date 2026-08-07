import type { Metadata } from "next";
import { SearchLiveV2 } from "@/components/ux/SearchLiveV2";
import { searchListings } from "@/lib/search";
import { buildSearchPageQuery } from "@/lib/search/search-page-query";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AkarFinder — SERP V2 données réelles",
  description: "Prévisualisation isolée de la SERP V2 branchée sur les données réelles AkarFinder.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchLiveV2Page({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const query = buildSearchPageQuery(params);
  const result = await searchListings({ ...query, limit: Math.min(query.limit ?? 30, 30) });

  return <SearchLiveV2 initialListings={result.listings} initialTotal={result.total} />;
}
