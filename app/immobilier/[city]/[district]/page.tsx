import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isValidCitySlug } from "@/lib/seo-city-pages/types";
import { isValidDistrictSlug } from "@/lib/seo-neighborhood-pages/types";
import {
  getAllNeighborhoods,
  getNeighborhoodBySlug,
} from "@/lib/seo-neighborhood-pages/neighborhood-seo-data";
import { generateNeighborhoodSeoMetadata } from "@/lib/seo-neighborhood-pages/seo-metadata";
import { NeighborhoodBreadcrumb } from "@/components/seo/NeighborhoodBreadcrumb";
import { NeighborhoodSeoHero } from "@/components/seo/NeighborhoodSeoHero";
import { NeighborhoodSearchCtas } from "@/components/seo/NeighborhoodSearchCtas";
import { NeighborhoodGuideSections } from "@/components/seo/NeighborhoodGuideSections";
import { NeighborhoodFaq } from "@/components/seo/NeighborhoodFaq";
import { SeoSafetyNotice } from "@/components/seo/SeoSafetyNotice";

type PageProps = {
  params: Promise<{ city: string; district: string }>;
};

export async function generateStaticParams() {
  return getAllNeighborhoods().map((n) => ({
    city: n.citySlug,
    district: n.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { city, district } = await params;

  if (!isValidCitySlug(city) || !isValidDistrictSlug(district)) {
    return {
      title: "Not Found",
      robots: { index: false, follow: false },
    };
  }

  const n = getNeighborhoodBySlug(city, district);
  if (!n) {
    return {
      title: "Not Found",
      robots: { index: false, follow: false },
    };
  }

  const seo = generateNeighborhoodSeoMetadata(n);

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: seo.canonical,
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: seo.ogTitle,
      description: seo.ogDescription,
      type: "website",
      url: seo.canonical,
    },
  };
}

export default async function DistrictPage({ params }: PageProps) {
  const { city, district } = await params;

  if (!isValidCitySlug(city) || !isValidDistrictSlug(district)) {
    notFound();
  }

  const n = getNeighborhoodBySlug(city, district);
  if (!n) {
    notFound();
  }

  const seo = generateNeighborhoodSeoMetadata(n);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Immobilier",
        item: "https://akarfinder.vercel.app/immobilier",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: n.cityDisplayName,
        item: `https://akarfinder.vercel.app/immobilier/${n.citySlug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: n.displayName,
        item: seo.canonical,
      },
    ],
  };

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: seo.title,
    description: seo.description,
    url: seo.canonical,
    isPartOf: {
      "@type": "WebSite",
      name: "AkarFinder",
      url: "https://akarfinder.vercel.app",
    },
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webPageJsonLd),
        }}
      />
      <NeighborhoodBreadcrumb neighborhood={n} />
      <NeighborhoodSeoHero neighborhood={n} />
      <NeighborhoodSearchCtas neighborhood={n} />
      <NeighborhoodGuideSections neighborhood={n} />
      <SeoSafetyNotice />
      <NeighborhoodFaq neighborhood={n} />
    </div>
  );
}
