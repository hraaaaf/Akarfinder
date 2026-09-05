import type { Metadata } from "next";

import {
  generateCityIntentMetadata,
  renderCityIntentPage,
} from "@/lib/seo-city-pages/intent-route";

type Props = { params: Promise<{ city: string }> };

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  return generateCityIntentMetadata(city, "acheter");
}

export default async function CityBuyPage({ params }: Props) {
  const { city } = await params;
  return renderCityIntentPage(city, "acheter");
}
