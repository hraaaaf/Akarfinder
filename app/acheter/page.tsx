import { redirect } from "next/navigation";
import { searchListings } from "@/lib/search";
import { IntentHubV2 } from "@/components/intent/IntentHubV2";
import { LegacyIntentHashRedirect } from "@/components/intent/LegacyIntentHashRedirect";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Acheter au Maroc — AkarFinder",
  description:
    "Commencez votre recherche d'achat au Maroc puis affinez-la dans le moteur AkarFinder avec des niveaux d'information et des sources explicites.",
};

export default async function AcheterPage({
  searchParams,
}: {
  searchParams: Promise<{ property_type?: string }>;
}) {
  const params = await searchParams;

  if (params.property_type) {
    const target = new URLSearchParams({ transaction_type: "buy" });
    if (params.property_type !== "__search_all__") target.set("property_type", params.property_type);
    redirect(`/search?${target.toString()}`);
  }

  const searchResult = await searchListings({ transaction_type: "buy", limit: 6 }).catch(() => ({
    listings: [],
    total: 0,
  }));

  return (
    <>
      <LegacyIntentHashRedirect intent="buy" />
      <IntentHubV2
        intent="buy"
        listings={searchResult.listings}
        totalListings={searchResult.total > 0 ? searchResult.total : null}
      />
    </>
  );
}
