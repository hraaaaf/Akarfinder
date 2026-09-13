import { permanentRedirect } from "next/navigation";

type PageProps = {
  params: Promise<{ citySlug: string; neighborhoodSlug: string }>;
};

export default async function LegacyNeighborhoodPage({ params }: PageProps) {
  const { citySlug, neighborhoodSlug } = await params;
  permanentRedirect(`/immobilier/${encodeURIComponent(citySlug)}/${encodeURIComponent(neighborhoodSlug)}`);
}
