import { searchListings } from "@/lib/search";
import { queryStats } from "@/lib/db";
import { AcheterPageShell } from "@/components/intent/AcheterPageShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Acheter au Maroc — AkarFinder",
  description:
    "Recherchez, comparez et shortlistez des biens immobiliers au Maroc avec des repères indicatifs lisibles avant de contacter.",
};

export default async function AcheterPage({
  searchParams,
}: {
  searchParams: Promise<{ property_type?: string }>;
}) {
  const params = await searchParams;
  const propertyType = params.property_type;

  const [searchResult, stats] = await Promise.all([
    searchListings({
      transaction_type: "buy",
      limit: 6,
      ...(propertyType ? { property_type: propertyType } : {}),
    }).catch(() => ({ listings: [], total: 0 })),
    queryStats().catch(() => ({
      total_listings: 0,
      avg_completeness: 0,
      duplicates_detected: 0,
      avg_reliability: 0,
    })),
  ]);

  return (
    <AcheterPageShell
      listings={searchResult.listings}
      totalListings={searchResult.total > 0 ? searchResult.total : null}
      duplicatesDetected={stats.duplicates_detected ?? 0}
      selectedPropertyType={propertyType}
    />
  );
}
