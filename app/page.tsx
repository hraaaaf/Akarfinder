import { GoogleLikeHero } from "@/components/home/GoogleLikeHero";
import { HomeListingsSection } from "@/components/home/HomeListingsSection";
import { HomeValueStrip } from "@/components/home/HomeValueStrip";
import { CityIntentGrid } from "@/components/landing/CityIntentGrid";
import { SignatureMapSection } from "@/components/landing/SignatureMapSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { MreTrustSection } from "@/components/landing/MreTrustSection";
import { HomeFinalCTA } from "@/components/landing/HomeFinalCTA";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default async function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="light" compact />
      <GoogleLikeHero />
      <HomeValueStrip />
      <CityIntentGrid />
      <HomeListingsSection />
      <SignatureMapSection />
      <HowItWorks />
      <MreTrustSection />
      <HomeFinalCTA />
      <SiteFooter />
    </main>
  );
}
