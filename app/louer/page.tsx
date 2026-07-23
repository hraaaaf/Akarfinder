import { redirect } from "next/navigation";
import { IntentHubV2 } from "@/components/intent/IntentHubV2";
import { LegacyIntentHashRedirect } from "@/components/intent/LegacyIntentHashRedirect";
import { searchListings } from "@/lib/search";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Louer au Maroc — AkarFinder",
  description:
    "Commencez votre recherche de location au Maroc puis affinez budget, type et localisation dans le moteur AkarFinder.",
};

function setPositive(target: URLSearchParams, key: string, value?: string) {
  if (!value) return;
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) target.set(key, String(parsed));
}

export default async function LouerPage({
  searchParams,
}: {
  searchParams: Promise<{
    property_type?: string;
    budget_max?: string;
    budget_min?: string;
  }>;
}) {
  const params = await searchParams;

  if (params.property_type || params.budget_max || params.budget_min) {
    const target = new URLSearchParams({ transaction_type: "rent" });
    if (params.property_type) target.set("property_type", params.property_type);
    setPositive(target, "max_price", params.budget_max);
    setPositive(target, "min_price", params.budget_min);
    redirect(`/search?${target.toString()}`);
  }

  const searchResult = await searchListings({ transaction_type: "rent", limit: 6 }).catch(() => ({
    listings: [],
    total: 0,
  }));

  return (
    <>
      <LegacyIntentHashRedirect intent="rent" />
      <IntentHubV2
        intent="rent"
        listings={searchResult.listings}
        totalListings={searchResult.total > 0 ? searchResult.total : null}
      />
    </>
  );
}
