import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CityIntentLanding } from "@/components/seo/CityIntentLanding";
import { getSeoCityIntentIndexability } from "@/lib/seo/city-intent-indexability";
import { getCityBySlug } from "@/lib/seo-city-pages/city-seo-data";
import { generateIntentSeoMetadata } from "@/lib/seo-city-pages/seo-metadata";
import type { SearchIntent } from "@/lib/seo-city-pages/types";
import { searchListings } from "@/lib/search";

export const CITY_INTENT_REVALIDATE_SECONDS = 3600;

function transactionTypeForIntent(intent: SearchIntent): "buy" | "rent" {
  return intent === "acheter" ? "buy" : "rent";
}

export async function generateCityIntentMetadata(
  citySlug: string,
  intent: SearchIntent,
): Promise<Metadata> {
  const city = getCityBySlug(citySlug);
  if (!city) return { title: "Not Found", robots: { index: false, follow: false } };

  const [seo, indexability] = await Promise.all([
    Promise.resolve(generateIntentSeoMetadata(city, intent)),
    getSeoCityIntentIndexability(city.displayName, intent),
  ]);

  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical },
    robots: { index: indexability.eligible, follow: true },
    openGraph: {
      title: seo.ogTitle,
      description: seo.ogDescription,
      type: "website",
      url: seo.canonical,
    },
  };
}

export async function renderCityIntentPage(citySlug: string, intent: SearchIntent) {
  const city = getCityBySlug(citySlug);
  if (!city) notFound();

  const transactionType = transactionTypeForIntent(intent);
  const [indexability, searchResult] = await Promise.all([
    getSeoCityIntentIndexability(city.displayName, intent),
    searchListings({ city: city.displayName, transaction_type: transactionType, limit: 6 }).catch(() => ({
      listings: [],
      total: 0,
    })),
  ]);

  return (
    <CityIntentLanding
      cityDisplayName={city.displayName}
      citySlug={city.slug}
      intent={intent}
      listingCount={indexability.listingCount}
      sourceCount={indexability.sourceCount}
      eligible={indexability.eligible}
      listings={searchResult.listings}
    />
  );
}
