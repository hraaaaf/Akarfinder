import { redirect } from "next/navigation";

import { BuyIntentHubP1 } from "@/components/intent/BuyIntentHubP1";
import { LegacyIntentHashRedirect } from "@/components/intent/LegacyIntentHashRedirect";
import { searchListings } from "@/lib/search";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Acheter au Maroc — AkarFinder",
  description:
    "Explorez les biens à vendre au Maroc selon votre ville, votre budget et votre projet, avec des informations et des sources explicites.",
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
      <BuyIntentHubP1
        listings={searchResult.listings}
        totalListings={searchResult.total > 0 ? searchResult.total : null}
      />
    </>
  );
}
