import type { Metadata } from "next";

import { GoogleLikeHero } from "@/components/home/GoogleLikeHero";
import { HomeActionGrid } from "@/components/home/HomeActionGrid";
import { HomeTrustStrip } from "@/components/home/HomeTrustStrip";
import { HomeVivreIciSection } from "@/components/home/HomeVivreIciSection";
import { CityIntentGrid } from "@/components/landing/CityIntentGrid";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export const revalidate = 300;

export default async function HomePage() {
  return (
    <main data-home-standard="home-v1" className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="light" compact />
      <GoogleLikeHero />
      <HomeTrustStrip />
      <HomeVivreIciSection />
      <CityIntentGrid />
      <HomeActionGrid />
      <SiteFooter />
    </main>
  );
}
